/**
 * PaymentOrchestratorService
 *
 * The central coordinator of the payment lifecycle. Orchestrates:
 *  1. Invoice existence check
 *  2. Transaction creation (with idempotency)
 *  3. Multi-provider attempt creation (Stripe + Razorpay in parallel)
 *  4. Provider failover on creation failure
 *  5. Payment verification (triggered by webhook or direct verify call)
 *  6. Ledger entry creation on success
 *  7. Audit trail
 *
 * NEVER trusts frontend success callbacks — all verification goes through
 * the provider's server-side API or webhook.
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Provider, TransactionStatus, AttemptStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TransactionService } from '../transaction/transaction.service';
import { PaymentAttemptService } from '../attempt/payment-attempt.service';
import { PaymentProviderFactory } from '../provider/payment-provider.factory';
import { LedgerService } from '../../ledger/ledger.service';
import { AuditService } from '../../audit/audit.service';
import { IdempotencyService } from '../../security/services/idempotency.service';
import { AppConfigService } from '../../config/app-config.service';
import { ERROR_CODES } from '../../../common/constants/error-codes.constant';

export interface InitiatePaymentDto {
  orderId: string;
  idempotencyKey: string;
  customerId: string;
  /** Amount in smallest currency unit */
  amount: bigint;
  currency: string;
  invoiceId?: string;
  providers?: Provider[];   // If omitted, all enabled providers are used
  preferredMethod?: string;
  metadata?: Record<string, unknown>;
  actorId: string;
  ipAddress?: string;
}

export interface PaymentOption {
  provider: Provider;
  method: string;
  /** Razorpay: orderId to pass to Checkout SDK */
  orderId?: string;
  /** Stripe: client_secret to pass to stripe.confirmPayment() */
  clientSecret?: string;
  attemptId: string;
}

export interface InitiatePaymentResult {
  transactionId: string;
  status: TransactionStatus;
  options: PaymentOption[];
}

export interface VerifyPaymentDto {
  transactionId: string;
  attemptId: string;
  providerPaymentId?: string;
  providerSignature?: string;
  actorId: string;
}

@Injectable()
export class PaymentOrchestratorService {
  private readonly logger = new Logger(PaymentOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
    private readonly attemptService: PaymentAttemptService,
    private readonly providerFactory: PaymentProviderFactory,
    private readonly ledgerService: LedgerService,
    private readonly auditService: AuditService,
    private readonly idempotencyService: IdempotencyService,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Initiate a payment — creates ONE transaction and one attempt per enabled provider.
   *
   * Returns a list of provider-specific options for the frontend to display
   * (e.g. "Pay with UPI" or "Pay with Card").
   */
  async initiatePayment(dto: InitiatePaymentDto): Promise<InitiatePaymentResult> {
    this.logger.log(`Initiating payment for order ${dto.orderId}`);

    // ── Step 1: Idempotency guard ──────────────────────────────────────────
    const cachedResult = await this.idempotencyService.get(dto.idempotencyKey);
    if (cachedResult) {
      this.logger.log(`Returning cached result for idempotency key`);
      return JSON.parse(cachedResult);
    }

    // ── Step 2: Create transaction ─────────────────────────────────────────
    const transaction = await this.transactionService.create({
      orderId: dto.orderId,
      idempotencyKey: dto.idempotencyKey,
      customerId: dto.customerId,
      amount: dto.amount,
      currency: dto.currency,
      invoiceId: dto.invoiceId,
      metadata: dto.metadata,
    });

    await this.auditService.log({
      actor: dto.actorId,
      action: 'PAYMENT_INITIATED',
      resourceType: 'Transaction',
      resourceId: transaction.id,
      transactionId: transaction.id,
      newState: { status: transaction.status },
      ipAddress: dto.ipAddress,
    });

    // ── Step 3: Create attempts for each enabled provider ──────────────────
    const enabledProviders = dto.providers ?? this.providerFactory.getEnabledProviders();
    const options: PaymentOption[] = [];

    for (const providerName of enabledProviders) {
      try {
        const provider = this.providerFactory.get(providerName);
        const providerResult = await provider.createPayment({
          amount: dto.amount,
          currency: dto.currency,
          transactionId: transaction.id,
          customerId: dto.customerId,
          method: dto.preferredMethod,
          idempotencyKey: `${dto.idempotencyKey}:${providerName}`,
          metadata: dto.metadata,
        });

        const attempt = await this.attemptService.create({
          transactionId: transaction.id,
          provider: providerName,
          method: providerResult.method,
          providerOrderId: providerResult.providerOrderId,
          clientSecret: providerResult.clientSecret,
          amount: dto.amount,
          currency: dto.currency,
          metadata: providerResult.metadata,
        });

        options.push({
          provider: providerName,
          method: providerResult.method,
          orderId: providerName === Provider.RAZORPAY ? providerResult.providerOrderId : undefined,
          clientSecret: providerName === Provider.STRIPE ? providerResult.clientSecret : undefined,
          attemptId: attempt.id,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to create attempt for provider ${providerName}: ${(err as Error).message}`,
        );
        // Continue with other providers (failover behaviour)
      }
    }

    if (options.length === 0) {
      // All providers failed — mark transaction as failed
      await this.transactionService.updateStatus(transaction.id, TransactionStatus.FAILED);
      throw new BadRequestException({
        message: 'All payment providers are currently unavailable',
        errorCode: ERROR_CODES.PAYMENT_PROVIDER_UNAVAILABLE,
      });
    }

    // Update transaction to PROCESSING
    await this.transactionService.updateStatus(transaction.id, TransactionStatus.PROCESSING);

    const result: InitiatePaymentResult = {
      transactionId: transaction.id,
      status: TransactionStatus.PROCESSING,
      options,
    };

    // Cache the result for idempotency replay
    await this.idempotencyService.store(dto.idempotencyKey, JSON.stringify(result));

    return result;
  }

  /**
   * Verify a payment attempt server-side.
   * Called either from webhook handler or from a manual verify endpoint.
   * All DB updates are wrapped in a single transaction for atomicity.
   */
  async verifyPayment(dto: VerifyPaymentDto): Promise<{ success: boolean; transactionId: string }> {
    this.logger.log(`Verifying attempt ${dto.attemptId} for transaction ${dto.transactionId}`);

    const attempt = await this.attemptService.findById(dto.attemptId);

    // Idempotency: already processed
    if (attempt.status === AttemptStatus.SUCCESS) {
      return { success: true, transactionId: dto.transactionId };
    }
    if (attempt.status === AttemptStatus.FAILED) {
      return { success: false, transactionId: dto.transactionId };
    }

    const provider = this.providerFactory.get(attempt.provider);

    // Verify with provider
    const verifyResult = await provider.verifyPayment({
      providerOrderId: attempt.providerOrderId!,
      providerPaymentId: dto.providerPaymentId,
      providerSignature: dto.providerSignature,
    });

    if (verifyResult.isSuccess) {
      await this.prisma.withTransaction(async (tx) => {
        // Mark attempt as SUCCESS (applies DB partial unique index guard)
        await this.attemptService.markSuccess(attempt.id, tx);

        // Mark all other attempts as FAILED
        await tx.paymentAttempt.updateMany({
          where: {
            transactionId: dto.transactionId,
            id: { not: attempt.id },
            status: { in: [AttemptStatus.PENDING, AttemptStatus.PROCESSING] },
          },
          data: { status: AttemptStatus.CANCELLED },
        });

        // Mark transaction as SUCCESS
        await this.transactionService.updateStatus(dto.transactionId, TransactionStatus.SUCCESS, tx);

        // Create double-entry ledger entries
        await this.ledgerService.recordPayment({
          transactionId: dto.transactionId,
          amount: attempt.amount,
          currency: attempt.currency,
          description: `Payment received via ${attempt.provider}`,
          tx,
        });
      });

      await this.auditService.log({
        actor: dto.actorId,
        action: 'PAYMENT_VERIFIED',
        resourceType: 'Transaction',
        resourceId: dto.transactionId,
        transactionId: dto.transactionId,
        newState: { status: TransactionStatus.SUCCESS, provider: attempt.provider },
      });

      return { success: true, transactionId: dto.transactionId };
    } else {
      await this.attemptService.markFailed(attempt.id, verifyResult.failureReason ?? 'Verification failed');

      await this.auditService.log({
        actor: dto.actorId,
        action: 'PAYMENT_VERIFICATION_FAILED',
        resourceType: 'Transaction',
        resourceId: dto.transactionId,
        transactionId: dto.transactionId,
        newState: { failureReason: verifyResult.failureReason },
      });

      return { success: false, transactionId: dto.transactionId };
    }
  }
}
