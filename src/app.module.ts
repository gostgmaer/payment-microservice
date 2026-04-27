/**
 * Root Application Module
 *
 * Wires together all feature modules. Each module is kept strictly independent
 * — cross-module communication happens exclusively through injected services
 * (no direct repository access across module boundaries).
 */

import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';

// Infrastructure
import { AppConfigModule } from './modules/config/app-config.module';
import { PrismaModule } from './prisma/prisma.module';

// Cross-cutting
import { SecurityModule } from './modules/security/security.module';
import { AuditModule } from './modules/audit/audit.module';
import { EventsModule } from './modules/events/events.module';
import { HealthModule } from './modules/health/health.module';

// Payment domain
import { PaymentOrchestratorModule } from './modules/payment/orchestrator/payment-orchestrator.module';
import { TransactionModule } from './modules/payment/transaction/transaction.module';
import { PaymentAttemptModule } from './modules/payment/attempt/payment-attempt.module';
import { PaymentProviderModule } from './modules/payment/provider/payment-provider.module';
import { PaymentMethodModule } from './modules/payment/method/payment-method.module';
import { WebhookModule } from './modules/payment/webhook/webhook.module';
import { RefundModule } from './modules/payment/refund/refund.module';
import { LedgerModule } from './modules/ledger/ledger.module';

// Business domain
import { BillingModule } from './modules/billing/billing.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { AdminModule } from './modules/admin/admin.module';

// IAM integration (GST settings + permission self-registration)
import { IamModule } from './modules/iam/iam.module';

// Common
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ConfigService } from '@nestjs/config';

/** BullMQ is opt-in. If BULLMQ_ENABLED=false the EventsModule (queues + workers)
 *  is excluded entirely — no Redis connection is required for queue processing
 *  and all operations run synchronously. Redis is still used for idempotency. */
const bullmqEnabled = process.env.BULLMQ_ENABLED !== 'false';
const conditionalModules = bullmqEnabled ? [EventsModule] : [];

@Module({
  imports: [
    // ── Config (must be first) ──────────────────────────────────────────
    AppConfigModule,

    // ── Structured logging ──────────────────────────────────────────────
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const structuredLoggingEnabled = config.get<boolean>('app.structuredLoggingEnabled', false);

        return {
          pinoHttp: {
            level: config.get<string>('app.logLevel', 'info'),
            autoLogging: structuredLoggingEnabled,
            // Redact sensitive fields from logs
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers["x-api-key"]',
                'req.body.cardNumber',
                'req.body.cvv',
                '*.clientSecret',
              ],
              remove: true,
            },
            transport:
              structuredLoggingEnabled && config.get<string>('app.env', 'development') !== 'production'
                ? { target: 'pino-pretty', options: { colorize: true, singleLine: false } }
                : undefined,
            customProps: () => ({ service: 'payment-microservice' }),
            // Attach correlation ID from header if present
            genReqId: (req) => (req.headers['x-correlation-id'] as string) ?? crypto.randomUUID(),
          },
        };
      },
    }),

    // ── Rate limiting ───────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('RATE_LIMIT_TTL_SECONDS', 60) * 1000,
            limit: config.get<number>('RATE_LIMIT_MAX_REQUESTS', 100),
          },
        ],
      }),
    }),

    // ── Infrastructure ──────────────────────────────────────────────────
    PrismaModule,

    // ── Cross-cutting ───────────────────────────────────────────────────
    SecurityModule,
    AuditModule,
    HealthModule,
    // EventsModule is registered only when BULLMQ_ENABLED=true (default)
    ...conditionalModules,

    // ── Payment domain ──────────────────────────────────────────────────
    PaymentProviderModule,
    TransactionModule,
    PaymentAttemptModule,
    PaymentMethodModule,
    LedgerModule,
    WebhookModule,
    RefundModule,
    PaymentOrchestratorModule,

    // ── Business domain ─────────────────────────────────────────────────
    BillingModule,
    SubscriptionModule,
    AdminModule,

    // ── IAM integration ─────────────────────────────────────────────────
    // Runs IamPermissionRegistrar on boot + provides IamSettingsService globally
    IamModule,
  ],

  providers: [
    // Global exception filter — structured error responses + logging
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },

    // Correlation ID injection into every request
    { provide: APP_INTERCEPTOR, useClass: CorrelationIdInterceptor },

    // Request/response logging interceptor
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },

    // Global rate-limit guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
