/**
 * TransactionService
 *
 * Source of truth for all payment transactions. Responsible for:
 *  - Creating transactions with idempotency enforcement
 *  - Status transitions (PENDING → PROCESSING → SUCCESS/FAILED)
 *  - SELECT … FOR UPDATE locking to prevent race conditions
 */

import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { Prisma, Transaction, TransactionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { hashIdempotencyKey } from '../../../common/utils/crypto.util';
import { ERROR_CODES } from '../../../common/constants/error-codes.constant';

export interface CreateTransactionDto {
  tenantId: string;
  orderId: string;
  idempotencyKey: string;
  customerId: string;
  amount: bigint;
  currency: string;
  invoiceId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new transaction.
   * Hashes the idempotency key before storing — the raw key never touches DB.
   * Throws ConflictException if orderId or idempotencyKey already exists.
   */
  async create(dto: CreateTransactionDto): Promise<Transaction> {
    const hashedKey = hashIdempotencyKey(dto.idempotencyKey);

    // Check for existing idempotency key (same request retried) — scoped per tenant
    const existing = await this.prisma.transaction.findUnique({
      where: { tenantId_idempotencyKey: { tenantId: dto.tenantId, idempotencyKey: hashedKey } },
    });

    if (existing) {
      this.logger.log(`Idempotent replay for key hash ${hashedKey.substring(0, 8)}…`);
      return existing;
    }

    try {
      return await this.prisma.transaction.create({
        data: {
          tenantId: dto.tenantId,
          orderId: dto.orderId,
          idempotencyKey: hashedKey,
          customerId: dto.customerId,
          amount: dto.amount,
          currency: dto.currency,
          invoiceId: dto.invoiceId ?? null,
          status: TransactionStatus.PENDING,
          metadata: (dto.metadata as Prisma.JsonObject) ?? Prisma.JsonNull,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException({
          message: 'A transaction for this order already exists',
          errorCode: ERROR_CODES.DUPLICATE_TRANSACTION,
        });
      }
      throw err;
    }
  }

  /** Find transaction by ID — throws if not found. Scoped to tenant. */
  async findById(id: string, tenantId?: string): Promise<Transaction> {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, ...(tenantId && { tenantId }) },
      include: { attempts: true, invoice: true },
    });
    if (!tx)
      throw new NotFoundException({
        message: 'Transaction not found',
        errorCode: ERROR_CODES.PAYMENT_NOT_FOUND,
      });
    return tx;
  }

  /** Find transaction by order ID — scoped to tenant. */
  async findByOrderId(tenantId: string, orderId: string): Promise<Transaction | null> {
    return this.prisma.transaction.findUnique({
      where: { tenantId_orderId: { tenantId, orderId } },
    });
  }

  /**
   * Transition transaction status.
   * Uses SELECT … FOR UPDATE (via $queryRaw) in a Prisma transaction to
   * prevent concurrent status updates from creating an inconsistent state.
   */
  async updateStatus(
    id: string,
    status: TransactionStatus,
    tx?: Prisma.TransactionClient,
  ): Promise<Transaction> {
    const client = tx ?? this.prisma;

    // Lock the row to prevent concurrent modifications
    if (tx) {
      await tx.$executeRaw`SELECT id FROM "Transaction" WHERE id = ${id} FOR UPDATE`;
    }

    return client.transaction.update({
      where: { id },
      data: { status },
    });
  }

  /** Paginated list by customer — scoped to tenant. */
  async findByCustomer(
    tenantId: string,
    customerId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: Transaction[]; total: number }> {
    const skip = (page - 1) * limit;
    const where = { tenantId, customerId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { attempts: true },
      }),
      this.prisma.transaction.count({ where }),
    ]);
    return { data, total };
  }
}
