/**
 * Correlation ID Interceptor
 *
 * Reads the `x-correlation-id` request header (or generates a new UUID) and
 * echoes it back in the response header. This ties together log lines from a
 * single request across all services.
 */

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const correlationId = (request.headers['x-correlation-id'] as string) || uuidv4();

    // Propagate to downstream services
    request.headers['x-correlation-id'] = correlationId;
    response.setHeader('x-correlation-id', correlationId);

    return next.handle();
  }
}
