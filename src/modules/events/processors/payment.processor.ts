/**
 * PaymentProcessor
 *
 * Async payment verification worker.
 * Handles cases where webhook delivery is delayed or missed.
 */

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants/queue-names.constant';
import { PaymentJobData, ExpireAttemptJobData } from '../interfaces/job-data.interface';
import { PaymentOrchestratorService } from '../../payment/orchestrator/payment-orchestrator.service';
import { PaymentAttemptService } from '../../payment/attempt/payment-attempt.service';

@Processor(QUEUE_NAMES.PAYMENT_PROCESSING, { concurrency: 5 })
export class PaymentProcessor extends WorkerHost {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(
    private readonly orchestrator: PaymentOrchestratorService,
    private readonly attemptService: PaymentAttemptService,
  ) {
    super();
  }

  async process(job: Job<PaymentJobData | ExpireAttemptJobData>): Promise<void> {
    switch (job.name) {
      case 'process-payment':
        await this.processPayment(job as Job<PaymentJobData>);
        break;
      case 'expire-attempt':
        await this.expireAttempt(job as Job<ExpireAttemptJobData>);
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async processPayment(job: Job<PaymentJobData>): Promise<void> {
    const { tenantId, transactionId, attemptId } = job.data;
    this.logger.log(`Verifying payment for transaction ${transactionId}`);

    await this.orchestrator.verifyPayment({
      tenantId,
      transactionId,
      attemptId,
      providerPaymentId: job.data.providerPaymentId,
      providerSignature: job.data.providerSignature,
      actorId: 'payment-processor-worker',
    });
  }

  private async expireAttempt(job: Job<ExpireAttemptJobData>): Promise<void> {
    const { attemptId } = job.data;
    this.logger.log(`Expiring stale attempt ${attemptId}`);
    await this.attemptService.markExpired(attemptId);
  }
}
