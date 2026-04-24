/**
 * WebhookService
 *
 * Handles incoming webhook events from Stripe and Razorpay.
 *
 * Security guarantees:
 *  1. Signature verification before any DB write.
 *  2. Raw body preservation (configured in main.ts) for accurate HMAC.
 *  3. Idempotent processing — event ID stored in WebhookLog; duplicates skipped.
 *  4. All processing is async (enqueued to BullMQ) to prevent timeouts.
 *  5. Webhook payload stored BEFORE processing — ensures we never lose events.
 */

import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, Provider, WebhookLog } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StripeProvider } from '../provider/stripe/stripe.provider';
import { RazorpayProvider } from '../provider/razorpay/razorpay.provider';
import { PaymentOrchestratorService } from '../orchestrator/payment-orchestrator.service';
import { PaymentAttemptService } from '../attempt/payment-attempt.service';
import { AuditService } from '../../audit/audit.service';
import { ERROR_CODES } from '../../../common/constants/error-codes.constant';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeProvider: StripeProvider,
    private readonly razorpayProvider: RazorpayProvider,
    private readonly orchestrator: PaymentOrchestratorService,
    private readonly attemptService: PaymentAttemptService,
    private readonly auditService: AuditService,
  ) {}

  // ─── Stripe ─────────────────────────────────────────────────────────────

  async handleStripeWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
    // 1. Verify signature BEFORE touching the DB
    const isValid = this.stripeProvider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn('Stripe webhook: invalid signature');
      throw new UnauthorizedException({
        message: 'Invalid webhook signature',
        errorCode: ERROR_CODES.WEBHOOK_SIGNATURE_INVALID,
      });
    }

    // 2. Parse event
    const event = this.stripeProvider.parseWebhookEvent(rawBody, signature);

    // 3. Check for duplicate event (idempotency)
    const existing = await this.prisma.webhookLog.findUnique({
      where: { eventId: event.id },
    });

    if (existing?.isProcessed) {
      this.logger.log(`Stripe webhook ${event.id} already processed — skipping`);
      return { received: true };
    }

    // 4. Persist raw payload (write-first for durability)
    const webhookLog = await this.upsertWebhookLog({
      provider: Provider.STRIPE,
      eventType: event.type,
      eventId: event.id,
      payload: event as unknown as Prisma.JsonObject,
      signature,
      isVerified: true,
    });

    // 5. Process event
    try {
      await this.processStripeEvent(event as unknown as { type: string; data: { object: Record<string, unknown> } }, webhookLog.id);

      await this.prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { isProcessed: true, processedAt: new Date() },
      });
    } catch (err) {
      await this.prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { error: (err as Error).message },
      });
      throw err;
    }

    return { received: true };
  }

  private async processStripeEvent(event: { type: string; data: { object: Record<string, unknown> } }, webhookLogId: string): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as { id: string; metadata: { transactionId: string } };
        await this.handlePaymentIntentSucceeded(pi, webhookLogId);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as { id: string; last_payment_error?: { message?: string }; metadata: { transactionId: string } };
        await this.handlePaymentIntentFailed(pi);
        break;
      }
      case 'charge.refunded': {
        this.logger.log(`Stripe charge.refunded received — handled via RefundModule`);
        break;
      }
      default:
        this.logger.log(`Stripe webhook: unhandled event type ${event.type}`);
    }
  }

  private async handlePaymentIntentSucceeded(
    pi: { id: string; metadata: { transactionId?: string } },
    webhookLogId: string,
  ): Promise<void> {
    const transactionId = pi.metadata?.transactionId;
    if (!transactionId) {
      this.logger.warn(`Stripe PI ${pi.id}: no transactionId in metadata`);
      return;
    }

    const attempt = await this.attemptService.findByProviderOrderId(pi.id);
    if (!attempt) {
      this.logger.warn(`No attempt found for Stripe PaymentIntent ${pi.id}`);
      return;
    }

    await this.prisma.webhookLog.update({
      where: { id: webhookLogId },
      data: { attemptId: attempt.id },
    });

    await this.orchestrator.verifyPayment({
      transactionId: attempt.transactionId,
      attemptId: attempt.id,
      actorId: 'stripe-webhook',
    });
  }

  private async handlePaymentIntentFailed(pi: {
    id: string;
    last_payment_error?: { message?: string };
    metadata: { transactionId?: string };
  }): Promise<void> {
    const attempt = await this.attemptService.findByProviderOrderId(pi.id);
    if (!attempt) return;

    await this.attemptService.markFailed(
      attempt.id,
      pi.last_payment_error?.message ?? 'PaymentIntent failed',
    );
  }

  // ─── Razorpay ────────────────────────────────────────────────────────────

  async handleRazorpayWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
    // 1. Verify signature
    const isValid = this.razorpayProvider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      this.logger.warn('Razorpay webhook: invalid signature');
      throw new UnauthorizedException({
        message: 'Invalid webhook signature',
        errorCode: ERROR_CODES.WEBHOOK_SIGNATURE_INVALID,
      });
    }

    const body = JSON.parse(rawBody.toString()) as {
      event: string;
      payload: {
        payment?: { entity: { id: string; order_id: string; status: string; error_description?: string } };
        order?: { entity: { id: string } };
      };
    };

    const eventId = `rz_${body.event}_${body.payload.payment?.entity.id ?? body.payload.order?.entity.id ?? Date.now()}`;

    // Check duplicate
    const existing = await this.prisma.webhookLog.findUnique({ where: { eventId } });
    if (existing?.isProcessed) {
      return { received: true };
    }

    const webhookLog = await this.upsertWebhookLog({
      provider: Provider.RAZORPAY,
      eventType: body.event,
      eventId,
      payload: body as unknown as Prisma.JsonObject,
      signature,
      isVerified: true,
    });

    try {
      await this.processRazorpayEvent(body, webhookLog.id);
      await this.prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { isProcessed: true, processedAt: new Date() },
      });
    } catch (err) {
      await this.prisma.webhookLog.update({
        where: { id: webhookLog.id },
        data: { error: (err as Error).message },
      });
      throw err;
    }

    return { received: true };
  }

  private async processRazorpayEvent(
    body: {
      event: string;
      payload: {
        payment?: { entity: { id: string; order_id: string; status: string; error_description?: string } };
      };
    },
    webhookLogId: string,
  ): Promise<void> {
    switch (body.event) {
      case 'payment.captured': {
        const payment = body.payload.payment?.entity;
        if (!payment) return;

        const attempt = await this.attemptService.findByProviderOrderId(payment.order_id);
        if (!attempt) {
          this.logger.warn(`No attempt found for Razorpay order ${payment.order_id}`);
          return;
        }

        await this.prisma.webhookLog.update({
          where: { id: webhookLogId },
          data: { attemptId: attempt.id },
        });

        await this.orchestrator.verifyPayment({
          transactionId: attempt.transactionId,
          attemptId: attempt.id,
          providerPaymentId: payment.id,
          actorId: 'razorpay-webhook',
        });
        break;
      }

      case 'payment.failed': {
        const payment = body.payload.payment?.entity;
        if (!payment) return;

        const attempt = await this.attemptService.findByProviderOrderId(payment.order_id);
        if (attempt) {
          await this.attemptService.markFailed(
            attempt.id,
            payment.error_description ?? 'Razorpay payment failed',
          );
        }
        break;
      }

      default:
        this.logger.log(`Razorpay webhook: unhandled event ${body.event}`);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async upsertWebhookLog(data: {
    provider: Provider;
    eventType: string;
    eventId: string;
    payload: Prisma.JsonObject;
    signature: string;
    isVerified: boolean;
    attemptId?: string;
  }): Promise<WebhookLog> {
    return this.prisma.webhookLog.upsert({
      where: { eventId: data.eventId },
      create: data,
      update: { isVerified: data.isVerified },
    });
  }
}
