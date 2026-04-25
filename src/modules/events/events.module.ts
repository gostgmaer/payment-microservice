/**
 * EventsModule
 *
 * BullMQ configuration for all async queues.
 *
 * Queue design:
 *  - Separate queues for payments, refunds, and subscriptions → independent scaling.
 *  - All queues share the same Redis connection pool.
 *  - Dead-letter simulation: failed jobs after maxAttempts stay in "failed"
 *    state in Redis and can be retried or inspected via Bull Board.
 *
 * Retry strategy (per queue):
 *  - Payment:      3 attempts, exponential backoff (1s, 2s, 4s)
 *  - Refund:       3 attempts, linear backoff (10s, 10s, 10s)
 *  - Subscription: 3 attempts, 24h apart (grace period logic)
 */

import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppConfigService } from '../config/app-config.service';
import { QUEUE_NAMES } from '../../common/constants/queue-names.constant';
import { PaymentProcessor } from './processors/payment.processor';
import { SubscriptionRenewalProcessor } from './processors/subscription-renewal.processor';
import { PaymentOrchestratorModule } from '../payment/orchestrator/payment-orchestrator.module';
import { PaymentAttemptModule } from '../payment/attempt/payment-attempt.module';
import { SubscriptionModule } from '../subscription/subscription.module';

@Module({
  imports: [
    // Register BullMQ queues
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: {
          host: config.redisHost,
          port: config.redisPort,
          password: config.redisPassword,
          db: config.redisDb,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
        defaultJobOptions: {
          removeOnComplete: { count: 1000 }, // keep last 1000 completed jobs
          removeOnFail: { count: 5000 }, // keep last 5000 failed jobs (for inspection)
        },
      }),
    }),

    BullModule.registerQueue({
      name: QUEUE_NAMES.PAYMENT_PROCESSING,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 500 },
      },
    }),

    BullModule.registerQueue({
      name: QUEUE_NAMES.SUBSCRIPTION_RENEWAL,
      defaultJobOptions: {
        attempts: 3,
        // 24 hour backoff to match grace period logic
        backoff: { type: 'fixed', delay: 24 * 60 * 60 * 1000 },
        removeOnComplete: { count: 200 },
      },
    }),

    BullModule.registerQueue({
      name: QUEUE_NAMES.REFUND_PROCESSING,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 10_000 },
      },
    }),

    // Feature modules (forwardRef breaks circular dependencies)
    forwardRef(() => PaymentOrchestratorModule),
    PaymentAttemptModule,
    forwardRef(() => SubscriptionModule),
  ],
  providers: [PaymentProcessor, SubscriptionRenewalProcessor],
  exports: [BullModule],
})
export class EventsModule {}
