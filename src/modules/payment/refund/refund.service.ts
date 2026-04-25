/**
 * RefundService
 *
 * Handles refund creation and processing.
 *
 * Rules:
 *  - Can only refund a SUCCESS transaction.
 *  - Total refunded amount cannot exceed original transaction amount.
 *  - Each refund is processed via the provider that received the original payment.
 *  - Creates ledger entries for the refund (reverse accounting).
 *  - Idempotent: same idempotencyKey returns existing refund.
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, Refund, RefundStatus, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { TransactionService } from '../transaction/transaction.service';
import { PaymentAttemptService } from '../attempt/payment-attempt.service';
import { PaymentProviderFactory } from '../provider/payment-provider.factory';
import { LedgerService } from '../../ledger/ledger.service';
import { AuditService } from '../../audit/audit.service';
import { hashIdempotencyKey } from '../../../common/utils/crypto.util';
import { ERROR_CODES } from '../../../common/constants/error-codes.constant';

export interface CreateRefundDto {
  tenantId: string;
  transactionId: string;
  amount: bigint;
  reason?: string;
  idempotencyKey: string;
  actorId: string;
  ipAddress?: string;
}

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
    private readonly attemptService: PaymentAttemptService,
    private readonly providerFactory: PaymentProviderFactory,
    private readonly ledgerService: LedgerService,
    private readonly auditService: AuditService,
  ) {}

  async createRefund(dto: CreateRefundDto): Promise<Refund> {
    const hashedKey = hashIdempotencyKey(dto.idempotencyKey);

    // Idempotency: return existing refund for same key — scoped to tenant
    const existingRefund = await this.prisma.refund.findFirst({
      where: {
        tenantId: dto.tenantId,
        transactionId: dto.transactionId,
        metadata: { path: ['idempotencyKey'], equals: hashedKey },
      },
    });
    if (existingRefund) return existingRefund;

    // ── Validate transaction ────────────────────────────────────────────
    const transaction = await this.transactionService.findById(dto.transactionId, dto.tenantId);

    if (
      transaction.status !== TransactionStatus.SUCCESS &&
      transaction.status !== TransactionStatus.PARTIALLY_REFUNDED
    ) {
      throw new BadRequestException({
        message: 'Only successful transactions can be refunded',
        errorCode: ERROR_CODES.REFUND_NOT_ELIGIBLE,
      });
    }

    // ── Check refund amount doesn't exceed original ───────────────────────
    const existingRefunds = await this.prisma.refund.aggregate({
      where: { transactionId: dto.transactionId, status: RefundStatus.SUCCESS },
      _sum: { amount: true },
    });

    const alreadyRefunded = existingRefunds._sum.amount ?? 0n;
    const available = transaction.amount - alreadyRefunded;

    if (dto.amount > available) {
      throw new BadRequestException({
        message: `Refund amount (${dto.amount}) exceeds available amount (${available})`,
        errorCode: ERROR_CODES.REFUND_EXCEEDS_AMOUNT,
      });
    }

    // ── Find the success attempt to get provider details ──────────────────
    const successAttempt = await this.attemptService.findSuccessAttempt(dto.transactionId);
    if (!successAttempt?.providerOrderId) {
      throw new BadRequestException({
        message: 'Cannot find provider payment ID for refund',
        errorCode: ERROR_CODES.REFUND_NOT_ELIGIBLE,
      });
    }

    // ── Create refund record ──────────────────────────────────────────────
    const refund = await this.prisma.refund.create({
      data: {
        tenantId: dto.tenantId,
        transactionId: dto.transactionId,
        amount: dto.amount,
        currency: transaction.currency,
        reason: dto.reason,
        status: RefundStatus.PROCESSING,
        metadata: { idempotencyKey: hashedKey } as Prisma.JsonObject,
      },
    });

    try {
      // ── Call provider ───────────────────────────────────────────────────
      const provider = this.providerFactory.get(successAttempt.provider);
      const providerResult = await provider.refundPayment({
        providerPaymentId: successAttempt.providerOrderId,
        amount: dto.amount,
        currency: transaction.currency,
        reason: dto.reason,
        idempotencyKey: `refund:${hashedKey}`,
      });

      // ── Update refund record + transaction status (DB transaction) ──────
      await this.prisma.withTransaction(async (tx) => {
        await tx.refund.update({
          where: { id: refund.id },
          data: {
            status:
              providerResult.status === 'SUCCESS' ? RefundStatus.SUCCESS : RefundStatus.PROCESSING,
            providerRefundId: providerResult.providerRefundId,
          },
        });

        // Update transaction status
        const isFullRefund = dto.amount >= transaction.amount - alreadyRefunded;
        await tx.transaction.update({
          where: { id: dto.transactionId },
          data: {
            status: isFullRefund
              ? TransactionStatus.REFUNDED
              : TransactionStatus.PARTIALLY_REFUNDED,
          },
        });

        // Record in ledger
        await this.ledgerService.recordRefund({
          tenantId: dto.tenantId,
          transactionId: dto.transactionId,
          amount: dto.amount,
          currency: transaction.currency,
          description: `Refund via ${successAttempt.provider}: ${dto.reason ?? 'customer request'}`,
          tx,
        });
      });

      await this.auditService.log({
        tenantId: dto.tenantId,
        actor: dto.actorId,
        action: 'REFUND_PROCESSED',
        resourceType: 'Refund',
        resourceId: refund.id,
        transactionId: dto.transactionId,
        newState: { amount: dto.amount.toString(), provider: successAttempt.provider },
        ipAddress: dto.ipAddress,
      });

      this.logger.log(`Refund ${refund.id} processed successfully`);
      return this.prisma.refund.findUniqueOrThrow({ where: { id: refund.id } });
    } catch (err) {
      // Mark refund as failed so it can be retried
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: { status: RefundStatus.FAILED },
      });
      throw err;
    }
  }

  async findByTransaction(tenantId: string, transactionId: string): Promise<Refund[]> {
    return this.prisma.refund.findMany({
      where: { tenantId, transactionId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
