/**
 * SubscriptionRenewalProcessor
 *
 * BullMQ worker that processes subscription renewals.
 *
 * Features:
 *  - Idempotent: checks if already renewed before processing.
 *  - Exponential backoff retry (3 attempts, 24h apart).
 *  - Dead-letter queue (BullMQ failed jobs are preserved).
 *  - Moves subscription to PAST_DUE or EXPIRED on repeated failures.
 */

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants/queue-names.constant';
import { SubscriptionRenewalJobData } from '../interfaces/job-data.interface';
import { SubscriptionService } from '../../subscription/subscription.service';

@Processor(QUEUE_NAMES.SUBSCRIPTION_RENEWAL, {
  concurrency: 5,
  // Limiter: max 10 renewals per second (protect provider rate limits)
  limiter: { max: 10, duration: 1000 },
})
export class SubscriptionRenewalProcessor extends WorkerHost {
  private readonly logger = new Logger(SubscriptionRenewalProcessor.name);

  constructor(private readonly subscriptionService: SubscriptionService) {
    super();
  }

  async process(job: Job<SubscriptionRenewalJobData>): Promise<void> {
    const { subscriptionId, attemptNumber } = job.data;

    this.logger.log(
      `Processing renewal for subscription ${subscriptionId} (attempt ${attemptNumber}, job ${job.id})`,
    );

    try {
      await this.subscriptionService.processRenewal(subscriptionId);
      this.logger.log(`Subscription ${subscriptionId} renewed successfully`);
    } catch (err) {
      this.logger.error(
        `Renewal failed for subscription ${subscriptionId}: ${(err as Error).message}`,
      );
      // Re-throw so BullMQ applies retry strategy
      throw err;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, err: Error) {
    this.logger.error(`Job ${job?.id ?? 'unknown'} failed: ${err.message}`);
  }
}
