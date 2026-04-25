/**
 * Logging Interceptor
 *
 * Logs request method, URL, status code, and duration for every HTTP request.
 * Sensitive paths (webhooks) are logged at a lower level.
 */

import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers } = request;
    const correlationId = headers['x-correlation-id'] ?? '-';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;
          this.logger.log(
            `${method} ${url} ${response.statusCode} ${duration}ms [${correlationId}]`,
          );
        },
        error: (err) => {
          const duration = Date.now() - startTime;
          this.logger.warn(
            `${method} ${url} ERROR ${duration}ms [${correlationId}] - ${err.message}`,
          );
        },
      }),
    );
  }
}
