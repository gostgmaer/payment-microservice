/**
 * Global Exception Filter
 *
 * Converts all thrown exceptions to a consistent, structured JSON response.
 * Sensitive error details are masked in production.
 *
 * Response shape:
 * {
 *   statusCode: number,
 *   errorCode: string,
 *   message: string,
 *   correlationId: string,
 *   timestamp: string,
 *   path: string
 * }
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ERROR_CODES } from '../constants/error-codes.constant';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = (request.headers['x-correlation-id'] as string) ?? 'unknown';
    const isProduction = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode: string = ERROR_CODES.INTERNAL_ERROR;
    let message = 'An unexpected error occurred';

    // ── NestJS HttpException ─────────────────────────────────────────────
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string) || exception.message;
        errorCode = (resp.errorCode as string) || this.statusToErrorCode(status);
      } else {
        message = exception.message;
        errorCode = this.statusToErrorCode(status);
      }
    }

    // ── Prisma unique constraint violation ───────────────────────────────
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        errorCode = ERROR_CODES.CONFLICT;
        message = 'A record with this identifier already exists';
      } else if (exception.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        errorCode = ERROR_CODES.NOT_FOUND;
        message = 'The requested resource was not found';
      } else {
        this.logger.error({ prismaCode: exception.code, correlationId }, exception.message);
      }
    }

    // ── Unknown errors ───────────────────────────────────────────────────
    else {
      this.logger.error(
        { correlationId, path: request.url },
        exception instanceof Error ? exception.stack : String(exception),
      );
      // Don't leak internal error details in production
      if (!isProduction && exception instanceof Error) {
        message = exception.message;
      }
    }

    response.status(status).json({
      statusCode: status,
      errorCode,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private statusToErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.NOT_FOUND:
        return ERROR_CODES.NOT_FOUND;
      case HttpStatus.UNAUTHORIZED:
        return ERROR_CODES.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ERROR_CODES.FORBIDDEN;
      case HttpStatus.CONFLICT:
        return ERROR_CODES.CONFLICT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ERROR_CODES.RATE_LIMITED;
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return ERROR_CODES.VALIDATION_ERROR;
      default:
        return ERROR_CODES.INTERNAL_ERROR;
    }
  }
}
