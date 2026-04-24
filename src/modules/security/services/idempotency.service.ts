/**
 * IdempotencyService
 *
 * Redis-backed idempotency key store used by payment operations.
 * Provides SET-if-NOT-EXISTS with TTL, ensuring a request body can only
 * succeed once regardless of how many times the client retries.
 */

import { Injectable, Inject, ConflictException } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../common/interceptors/idempotency.interceptor';
import { hashIdempotencyKey } from '../../../common/utils/crypto.util';
import { AppConfigService } from '../../config/app-config.service';

const PREFIX = 'idem:';

@Injectable()
export class IdempotencyService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: AppConfigService,
  ) {}

  /**
   * Try to acquire an idempotency lock.
   * Returns true if acquired (first call), false if already exists (retry).
   * Throws ConflictException if a concurrent request holds the lock.
   */
  async tryAcquire(key: string, value: string): Promise<boolean> {
    const hashed = hashIdempotencyKey(key);
    const ttl = this.config.idempotencyTtlSeconds;

    // SET NX EX — atomic operation
    const result = await this.redis.set(
      `${PREFIX}${hashed}`,
      value,
      'EX',
      ttl,
      'NX',
    );

    return result === 'OK';
  }

  /** Get an existing idempotency record (if the request was already processed). */
  async get(key: string): Promise<string | null> {
    const hashed = hashIdempotencyKey(key);
    return this.redis.get(`${PREFIX}${hashed}`);
  }

  /** Store the result of a completed idempotent operation. */
  async store(key: string, value: string): Promise<void> {
    const hashed = hashIdempotencyKey(key);
    const ttl = this.config.idempotencyTtlSeconds;
    await this.redis.set(`${PREFIX}${hashed}`, value, 'EX', ttl);
  }

  /** Release (delete) an idempotency key (used if the operation failed). */
  async release(key: string): Promise<void> {
    const hashed = hashIdempotencyKey(key);
    await this.redis.del(`${PREFIX}${hashed}`);
  }

  /**
   * Assert idempotency for a payment operation.
   * - If already succeeded → throw ConflictException with cached transactionId.
   * - If in-progress → throw ConflictException.
   * - If new → return and let the caller proceed.
   */
  async assertUnique(idempotencyKey: string, transactionId?: string): Promise<void> {
    const existing = await this.get(idempotencyKey);
    if (existing) {
      throw new ConflictException({
        message: 'This request has already been processed',
        errorCode: 'IDEMPOTENCY_CONFLICT',
        data: JSON.parse(existing),
      });
    }

    if (transactionId) {
      await this.store(idempotencyKey, JSON.stringify({ transactionId }));
    }
  }
}
