import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the Idempotency-Key header from the incoming request.
 * The idempotency interceptor uses this to deduplicate requests.
 */
export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['idempotency-key'] as string | undefined;
  },
);
