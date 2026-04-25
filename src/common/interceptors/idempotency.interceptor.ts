/**
 * Idempotency Interceptor
 *
 * Prevents duplicate processing of the same request (e.g. network retries).
 *
 * Algorithm:
 *  1. Read `Idempotency-Key` header.
 *  2. Hash it with SHA-256.
 *  3. Check Redis for an existing response.
 *     - If found → return the cached response (HTTP 200 with `X-Idempotent-Replayed: true`).
 *     - If not → proceed, then cache the response in Redis with TTL.
 *
 * Only applies to POST/PATCH requests (state-mutating operations).
 * GET/DELETE are inherently idempotent and skipped.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Redis } from 'ioredis';
import { hashIdempotencyKey } from '../utils/crypto.util';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const IDEMPOTENCY_PREFIX = 'idempotency:';
const DEFAULT_TTL_SECONDS = 86_400; // 24 hours

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly ttlSeconds: number = DEFAULT_TTL_SECONDS,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest();
    const method: string = request.method;

    // Only guard state-mutating methods
    if (!['POST', 'PATCH', 'PUT'].includes(method)) {
      return next.handle();
    }

    const idempotencyKey = request.headers['idempotency-key'] as string | undefined;
    if (!idempotencyKey) {
      return next.handle();
    }

    const hashedKey = hashIdempotencyKey(idempotencyKey);
    const redisKey = `${IDEMPOTENCY_PREFIX}${hashedKey}`;

    // Check for cached response
    const cached = await this.redis.get(redisKey);
    if (cached) {
      const response = context.switchToHttp().getResponse();
      response.setHeader('X-Idempotent-Replayed', 'true');

      const parsed = JSON.parse(cached);

      // If it was an error, re-throw it
      if (parsed.__isError) {
        throw new HttpException(parsed.body, parsed.statusCode);
      }

      return of(parsed.body);
    }

    // Mark as in-flight (SET NX with short TTL) to prevent concurrent duplicates
    const lockKey = `${IDEMPOTENCY_PREFIX}lock:${hashedKey}`;
    const acquired = await this.redis.set(lockKey, '1', 'EX', 30, 'NX');
    if (!acquired) {
      throw new HttpException(
        {
          message: 'A request with this idempotency key is currently processing',
          errorCode: 'IDEMPOTENCY_CONFLICT',
        },
        HttpStatus.CONFLICT,
      );
    }

    return next.handle().pipe(
      tap({
        next: async (responseBody) => {
          // Cache successful response
          await this.redis.set(
            redisKey,
            JSON.stringify({ body: responseBody, statusCode: 200 }),
            'EX',
            this.ttlSeconds,
          );
          await this.redis.del(lockKey);
        },
        error: async (err) => {
          // Cache error responses too (so retries get the same error)
          if (err instanceof HttpException && err.getStatus() < 500) {
            await this.redis.set(
              redisKey,
              JSON.stringify({
                __isError: true,
                body: err.getResponse(),
                statusCode: err.getStatus(),
              }),
              'EX',
              300, // shorter TTL for client errors
            );
          }
          await this.redis.del(lockKey);
        },
      }),
    );
  }
}
