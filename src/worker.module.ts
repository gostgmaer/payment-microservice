/**
 * WorkerModule — minimal NestJS module for standalone BullMQ workers.
 * Contains only the modules needed for queue processing (no HTTP, no Swagger).
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { AppConfigModule } from './modules/config/app-config.module';
import { PrismaModule } from './prisma/prisma.module';
import { SecurityModule } from './modules/security/security.module';
import { AuditModule } from './modules/audit/audit.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { EventsModule } from './modules/events/events.module';
import { PaymentProviderModule } from './modules/payment/provider/payment-provider.module';
import { TransactionModule } from './modules/payment/transaction/transaction.module';
import { PaymentAttemptModule } from './modules/payment/attempt/payment-attempt.module';
import { PaymentOrchestratorModule } from './modules/payment/orchestrator/payment-orchestrator.module';
import { BillingModule } from './modules/billing/billing.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRoot({ pinoHttp: { level: 'info' } }),
    PrismaModule,
    SecurityModule,
    AuditModule,
    LedgerModule,
    PaymentProviderModule,
    TransactionModule,
    PaymentAttemptModule,
    PaymentOrchestratorModule,
    BillingModule,
    SubscriptionModule,
    EventsModule,
  ],
})
export class WorkerModule {}
