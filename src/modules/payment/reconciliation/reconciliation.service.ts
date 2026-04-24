/**
 * ReconciliationService
 *
 * Periodically reconciles the internal DB state against each provider's API.
 * Catches cases where:
 *  - A webhook was never delivered (payment shows as PENDING internally but PAID on provider).
 *  - A payment was captured on provider but failed webhook verification.
 *
 * Run as a cron job (configurable via RECONCILIATION_CRON env var).
 * Safe to run concurrently on multiple instances (Redis lock prevents duplicate runs).
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { TransactionStatus, AttemptStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentOrchestratorService } from '../orchestrator/payment-orchestrator.service';
import { PaymentAttemptService } from '../attempt/payment-attempt.service';
import { AppConfigService } from '../../config/app-config.service';
import { REDIS_CLIENT } from '../../../common/interceptors/idempotency.interceptor';
import dayjs from 'dayjs';

const RECONCILIATION_LOCK = 'reconciliation:lock';

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: PaymentOrchestratorService,
    private readonly attemptService: PaymentAttemptService,
    private readonly config: AppConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Find PROCESSING transactions older than 30 minutes and verify them
   * against provider APIs. This catches missed/delayed webhooks.
   */
  async reconcileStaleTransactions(): Promise<{
    checked: number;
    recovered: number;
    failed: number;
  }> {
    // Distributed lock — only one instance runs reconciliation at a time
    const acquired = await this.redis.set(
      RECONCILIATION_LOCK,
      '1',
      'EX',
      300,  // 5 min TTL
      'NX',
    );

    if (!acquired) {
      this.logger.log('Reconciliation already running on another instance — skipping');
      return { checked: 0, recovered: 0, failed: 0 };
    }

    try {
      const staleThreshold = dayjs().subtract(30, 'minute').toDate();

      const staleTransactions = await this.prisma.transaction.findMany({
        where: {
          status: TransactionStatus.PROCESSING,
          updatedAt: { lt: staleThreshold },
        },
        include: {
          attempts: {
            where: { status: { in: [AttemptStatus.PENDING, AttemptStatus.PROCESSING] } },
          },
        },
        take: 100, // process in batches
      });

      let recovered = 0;
      let failed = 0;

      for (const tx of staleTransactions) {
        for (const attempt of tx.attempts) {
          try {
            const result = await this.orchestrator.verifyPayment({
              transactionId: tx.id,
              attemptId: attempt.id,
              actorId: 'reconciliation-worker',
            });

            if (result.success) recovered++;
            else failed++;
          } catch (err) {
            this.logger.error(
              `Reconciliation failed for attempt ${attempt.id}: ${(err as Error).message}`,
            );
            failed++;
          }
        }
      }

      // Also expire stale pending attempts
      const expiredCount = await this.attemptService.expireStalePendingAttempts();
      if (expiredCount > 0) {
        this.logger.log(`Expired ${expiredCount} stale payment attempts`);
      }

      this.logger.log(
        `Reconciliation complete: checked=${staleTransactions.length}, recovered=${recovered}, failed=${failed}`,
      );

      return { checked: staleTransactions.length, recovered, failed };
    } finally {
      await this.redis.del(RECONCILIATION_LOCK);
    }
  }
}
