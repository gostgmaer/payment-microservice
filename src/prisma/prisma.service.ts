/**
 * PrismaService
 *
 * Wraps the Prisma client with NestJS lifecycle hooks.
 *
 * Key decisions:
 *  - Implements OnModuleInit to connect eagerly (surfaces misconfiguration at
 *    startup rather than on first query).
 *  - Implements OnModuleDestroy to disconnect cleanly on SIGTERM.
 *  - Logs query events only in development to avoid leaking SQL in production.
 *  - Provides a withTransaction() helper for multi-step operations that must
 *    be atomic (uses Prisma interactive transactions with a 10s timeout).
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly config: ConfigService) {
    const enableDbQueryLogging = config.get('ENABLE_DB_QUERY_LOGGING') === 'true';

    super({
      log: enableDbQueryLogging
        ? [{ emit: 'event', level: 'query' }, 'warn', 'error']
        : ['warn', 'error'],
      errorFormat: 'minimal',
    });

    if (enableDbQueryLogging) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this as any).$on('query', (e: Prisma.QueryEvent) => {
        if (e.duration > 200) {
          this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
        }
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Execute a callback inside a Prisma interactive transaction.
   * All Prisma calls within the callback share the same DB transaction.
   *
   * @example
   * await this.prisma.withTransaction(async (tx) => {
   *   await tx.transaction.create({ ... });
   *   await tx.ledgerEntry.createMany({ ... });
   * });
   */
  async withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { timeout?: number; maxWait?: number },
  ): Promise<T> {
    return this.$transaction(fn, {
      timeout: options?.timeout ?? 10_000, // 10s default
      maxWait: options?.maxWait ?? 5_000,
    });
  }
}
