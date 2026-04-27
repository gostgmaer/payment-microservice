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

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  Provider,
  Prisma,
  TransactionStatus,
  AttemptStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TransactionService } from '../transaction/transaction.service';
import { PaymentAttemptService } from '../attempt/payment-attempt.service';
import { PaymentProviderFactory } from '../provider/payment-provider.factory';
import { LedgerService } from '../../ledger/ledger.service';
import { AuditService } from '../../audit/audit.service';
import { IdempotencyService } from '../../security/services/idempotency.service';
import { AppConfigService } from '../../config/app-config.service';
import { ERROR_CODES } from '../../../common/constants/error-codes.constant';
import { SubscriptionService } from '../../subscription/subscription.service';

export interface InitiatePaymentDto {
  tenantId: string;
  orderId: string;
  idempotencyKey: string;
  customerId: string;
  /** Amount in smallest currency unit */
  amount: bigint;
  currency: string;
  invoiceId?: string;
  providers?: Provider[]; // If omitted, all enabled providers are used
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
  /** Stripe Payment Intent: client_secret to pass to stripe.confirmPayment() */
  clientSecret?: string;
  /** Stripe Checkout Session: hosted payment page URL (redirect flow) */
  sessionUrl?: string;
  attemptId: string;
}

export interface InitiatePaymentResult {
  transactionId: string;
  status: TransactionStatus;
  options: PaymentOption[];
}

export interface VerifyPaymentDto {
  tenantId: string;
  transactionId: string;
  attemptId: string;
  providerPaymentId?: string;
  providerSignature?: string;
  actorId: string;
}

type BillingMetadata = {
  billingMode?: string;
  planId?: string;
  customerEmail?: string;
  productId?: string;
  trialDays?: number;
  [key: string]: unknown;
};

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
    private readonly subscriptionService: SubscriptionService,
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
      tenantId: dto.tenantId,
      orderId: dto.orderId,
      idempotencyKey: dto.idempotencyKey,
      customerId: dto.customerId,
      amount: dto.amount,
      currency: dto.currency,
      invoiceId: dto.invoiceId,
      metadata: dto.metadata,
    });

    await this.auditService.log({
      tenantId: dto.tenantId,
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
        const providerMetadata = await this.resolveProviderMetadata(providerName, dto);
        const providerResult = await provider.createPayment({
          amount: dto.amount,
          currency: dto.currency,
          transactionId: transaction.id,
          customerId: dto.customerId,
          method: dto.preferredMethod,
          idempotencyKey: `${dto.idempotencyKey}:${providerName}`,
          metadata: providerMetadata,
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
          sessionUrl: providerName === Provider.STRIPE ? providerResult.sessionUrl : undefined,
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
    const transaction = await this.transactionService.findById(dto.transactionId, dto.tenantId);
    const transactionMetadata = this.asBillingMetadata(transaction.metadata);

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

        const mergedAttemptMetadata = this.mergeMetadata(
          this.asBillingMetadata(attempt.metadata),
          this.mergeMetadata(verifyResult.metadata, {
            providerPaymentId: dto.providerPaymentId,
          }),
        );

        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            metadata: Object.keys(mergedAttemptMetadata).length
              ? (mergedAttemptMetadata as Prisma.JsonObject)
              : Prisma.JsonNull,
          },
        });

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
        await this.transactionService.updateStatus(
          dto.transactionId,
          TransactionStatus.SUCCESS,
          tx,
        );

        // Create double-entry ledger entries
        await this.ledgerService.recordPayment({
          tenantId: dto.tenantId,
          transactionId: dto.transactionId,
          amount: attempt.amount,
          currency: attempt.currency,
          description: `Payment received via ${attempt.provider}`,
          tx,
        });

        await this.syncRecurringSubscriptionOnSuccess({
          tenantId: dto.tenantId,
          transactionCustomerId: transaction.customerId,
          transactionMetadata,
          attemptProvider: attempt.provider,
          attemptProviderOrderId: attempt.providerOrderId,
          mergedAttemptMetadata,
          tx,
          actorId: dto.actorId,
        });
      });

      await this.auditService.log({
        tenantId: dto.tenantId,
        actor: dto.actorId,
        action: 'PAYMENT_VERIFIED',
        resourceType: 'Transaction',
        resourceId: dto.transactionId,
        transactionId: dto.transactionId,
        newState: { status: TransactionStatus.SUCCESS, provider: attempt.provider },
      });

      return { success: true, transactionId: dto.transactionId };
    } else {
      await this.attemptService.markFailed(
        attempt.id,
        verifyResult.failureReason ?? 'Verification failed',
      );

      await this.auditService.log({
        tenantId: dto.tenantId,
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

  private async syncRecurringSubscriptionOnSuccess(input: {
    tenantId: string;
    transactionCustomerId: string;
    transactionMetadata: BillingMetadata;
    attemptProvider: Provider;
    attemptProviderOrderId?: string | null;
    mergedAttemptMetadata: Record<string, unknown>;
    tx: Prisma.TransactionClient;
    actorId: string;
  }): Promise<void> {
    if (input.transactionMetadata.billingMode !== 'subscription') return;

    const planId =
      typeof input.transactionMetadata.planId === 'string'
        ? input.transactionMetadata.planId
        : null;
    if (!planId) {
      this.logger.warn(
        'Recurring payment verified without planId metadata; skipping subscription sync',
      );
      return;
    }

    if (input.attemptProvider === Provider.CASH) {
      await this.subscriptionService.createSubscription(
        {
          tenantId: input.tenantId,
          customerId: input.transactionCustomerId,
          planId,
          trialOverrideDays: this.resolveTrialOverrideDays(input.transactionMetadata.trialDays),
          metadata: this.mergeMetadata(
            input.transactionMetadata,
            this.mergeMetadata(input.mergedAttemptMetadata, {
              billingMode: 'subscription',
              provider: input.attemptProvider,
              providerOrderId: input.attemptProviderOrderId,
            }),
          ),
          actorId: input.actorId,
        },
        input.tx,
      );
      return;
    }

    const providerSubscriptionId = this.resolveProviderSubscriptionId(
      input.attemptProvider,
      input.attemptProviderOrderId,
      input.mergedAttemptMetadata,
    );
    if (!providerSubscriptionId) {
      this.logger.warn(
        `Recurring payment verified for ${input.attemptProvider} without provider subscription id`,
      );
      return;
    }

    const periodStart = this.resolveDate(
      input.mergedAttemptMetadata.currentPeriodStart,
      input.mergedAttemptMetadata.periodStart,
    );
    const periodEnd = this.resolveDate(
      input.mergedAttemptMetadata.currentPeriodEnd,
      input.mergedAttemptMetadata.periodEnd,
    );
    const trialStart = this.resolveDate(input.mergedAttemptMetadata.trialStart);
    const trialEnd = this.resolveDate(input.mergedAttemptMetadata.trialEnd);
    const status = this.resolveSubscriptionStatus(
      input.mergedAttemptMetadata.subscriptionStatus,
      trialEnd,
    );

    if (!periodStart || !periodEnd) {
      this.logger.warn(
        `Recurring payment verified for ${providerSubscriptionId} without period bounds; skipping sync`,
      );
      return;
    }

    await this.subscriptionService.syncExternalSubscription(
      {
        tenantId: input.tenantId,
        customerId: input.transactionCustomerId,
        planId,
        provider: input.attemptProvider,
        providerSubscriptionId,
        actorId: input.actorId,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        trialStart: trialStart ?? undefined,
        trialEnd: trialEnd ?? undefined,
        metadata: this.mergeMetadata(input.transactionMetadata, input.mergedAttemptMetadata),
      },
      input.tx,
    );
  }

  private async resolveProviderMetadata(
    providerName: Provider,
    dto: InitiatePaymentDto,
  ): Promise<Record<string, unknown> | undefined> {
    const metadata = dto.metadata ? { ...dto.metadata } : undefined;

    if (providerName !== Provider.STRIPE) {
      return metadata;
    }

    const billingProfile = await this.prisma.customerBillingProfile.findUnique({
      where: {
        tenantId_customerId_provider: {
          tenantId: dto.tenantId,
          customerId: dto.customerId,
          provider: Provider.STRIPE,
        },
      },
    });

    if (!billingProfile?.providerCustomerId) {
      return metadata;
    }

    return {
      ...(metadata ?? {}),
      providerCustomerId: billingProfile.providerCustomerId,
    };
  }

  private resolveProviderSubscriptionId(
    provider: Provider,
    providerOrderId: string | null | undefined,
    metadata: Record<string, unknown>,
  ): string | null {
    const explicit = metadata.providerSubscriptionId;
    if (typeof explicit === 'string' && explicit.length > 0) return explicit;
    if (provider === Provider.RAZORPAY && providerOrderId?.startsWith('sub_')) {
      return providerOrderId;
    }
    return null;
  }

  private resolveSubscriptionStatus(rawStatus: unknown, trialEnd: Date | null): SubscriptionStatus {
    if (typeof rawStatus === 'string') {
      const normalized = rawStatus.toUpperCase();
      if (normalized === 'TRIALING') return 'TRIALING' as SubscriptionStatus;
      if (normalized === 'ACTIVE') return 'ACTIVE' as SubscriptionStatus;
      if (normalized === 'PAST_DUE') return 'PAST_DUE' as SubscriptionStatus;
      if (normalized === 'CANCELLED') return 'CANCELLED' as SubscriptionStatus;
      if (normalized === 'EXPIRED') return 'EXPIRED' as SubscriptionStatus;
    }
    return trialEnd && trialEnd > new Date() ? 'TRIALING' : 'ACTIVE';
  }

  private resolveTrialOverrideDays(rawTrialDays: unknown): number | undefined {
    const parsed = Number(rawTrialDays);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }

  private resolveDate(...values: unknown[]): Date | null {
    for (const value of values) {
      if (value instanceof Date) return value;
      if (typeof value === 'number') {
        const fromNumber = new Date(value > 10_000_000_000 ? value : value * 1000);
        if (!Number.isNaN(fromNumber.getTime())) return fromNumber;
      }
      if (typeof value === 'string' && value.length > 0) {
        const fromString = new Date(value);
        if (!Number.isNaN(fromString.getTime())) return fromString;
      }
    }
    return null;
  }

  private asBillingMetadata(value: unknown): BillingMetadata {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as BillingMetadata;
    }
    return {};
  }

  private mergeMetadata(
    base: Record<string, unknown> | undefined,
    extra: Record<string, unknown> | undefined,
  ): Record<string, unknown> {
    return {
      ...(base ?? {}),
      ...(extra ?? {}),
    };
  }
}
