/**
 * PaymentAttemptService
 *
 * Manages individual payment attempts (one per provider per transaction).
 *
 * Rules enforced here:
 *  - Only ONE attempt can have status SUCCESS per transaction (also backed
 *    by a partial unique index in the DB — this is a defense-in-depth check).
 *  - Expired attempts are EXPIRED automatically after the configured TTL.
 *  - Concurrent attempt updates use SELECT … FOR UPDATE.
 */

import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Prisma, PaymentAttempt, AttemptStatus, Provider } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import { ERROR_CODES } from '../../../common/constants/error-codes.constant';
import dayjs from 'dayjs';

export interface CreateAttemptDto {
  transactionId: string;
  provider: Provider;
  method: string;
  providerOrderId?: string;
  clientSecret?: string;
  amount: bigint;
  currency: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class PaymentAttemptService {
  private readonly logger = new Logger(PaymentAttemptService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async create(dto: CreateAttemptDto): Promise<PaymentAttempt> {
    const expiresAt = dayjs().add(this.config.attemptExpiryMinutes, 'minute').toDate();

    return this.prisma.paymentAttempt.create({
      data: {
        transactionId: dto.transactionId,
        provider: dto.provider,
        method: dto.method,
        providerOrderId: dto.providerOrderId ?? null,
        clientSecret: dto.clientSecret ?? null,
        amount: dto.amount,
        currency: dto.currency,
        status: AttemptStatus.PENDING,
        expiresAt,
        metadata: (dto.metadata as Prisma.JsonObject) ?? Prisma.JsonNull,
      },
    });
  }

  async findById(id: string): Promise<PaymentAttempt> {
    const attempt = await this.prisma.paymentAttempt.findUnique({ where: { id } });
    if (!attempt)
      throw new NotFoundException({
        message: 'Payment attempt not found',
        errorCode: ERROR_CODES.PAYMENT_NOT_FOUND,
      });
    return attempt;
  }

  async findByProviderOrderId(providerOrderId: string): Promise<PaymentAttempt | null> {
    return this.prisma.paymentAttempt.findFirst({ where: { providerOrderId } });
  }

  async findByTransaction(transactionId: string): Promise<PaymentAttempt[]> {
    return this.prisma.paymentAttempt.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Find the single SUCCESS attempt for a transaction. */
  async findSuccessAttempt(transactionId: string): Promise<PaymentAttempt | null> {
    return this.prisma.paymentAttempt.findFirst({
      where: { transactionId, status: AttemptStatus.SUCCESS },
    });
  }

  /**
   * Mark an attempt as SUCCESS.
   * Validates that no other attempt for this transaction has already succeeded.
   * This is the application-level guard; the DB partial unique index is the
   * final backstop.
   */
  async markSuccess(id: string, tx: Prisma.TransactionClient): Promise<PaymentAttempt> {
    // Lock row for update
    await tx.$executeRaw`SELECT id FROM "PaymentAttempt" WHERE id = ${id} FOR UPDATE`;

    const attempt = await tx.paymentAttempt.findUniqueOrThrow({ where: { id } });

    if (attempt.status === AttemptStatus.SUCCESS) {
      return attempt; // idempotent
    }

    // Check for existing success on this transaction
    const existingSuccess = await tx.paymentAttempt.findFirst({
      where: { transactionId: attempt.transactionId, status: AttemptStatus.SUCCESS },
    });

    if (existingSuccess) {
      throw new ConflictException({
        message: 'A successful payment attempt already exists for this transaction',
        errorCode: ERROR_CODES.PAYMENT_ALREADY_SUCCEEDED,
      });
    }

    return tx.paymentAttempt.update({
      where: { id },
      data: { status: AttemptStatus.SUCCESS },
    });
  }

  async markFailed(
    id: string,
    reason: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PaymentAttempt> {
    const client = tx ?? this.prisma;
    return client.paymentAttempt.update({
      where: { id },
      data: { status: AttemptStatus.FAILED, failureReason: reason },
    });
  }

  async markExpired(id: string): Promise<PaymentAttempt> {
    return this.prisma.paymentAttempt.update({
      where: { id },
      data: { status: AttemptStatus.EXPIRED },
    });
  }

  /** Expire all PENDING/PROCESSING attempts whose TTL has passed. */
  async expireStalePendingAttempts(): Promise<number> {
    const result = await this.prisma.paymentAttempt.updateMany({
      where: {
        status: { in: [AttemptStatus.PENDING, AttemptStatus.PROCESSING] },
        expiresAt: { lt: new Date() },
      },
      data: { status: AttemptStatus.EXPIRED },
    });
    return result.count;
  }
}
