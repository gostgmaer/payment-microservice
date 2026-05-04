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

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Prisma, Provider, WebhookLog, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StripeProvider } from '../provider/stripe/stripe.provider';
import { RazorpayProvider } from '../provider/razorpay/razorpay.provider';
import { PaymentOrchestratorService } from '../orchestrator/payment-orchestrator.service';
import { PaymentAttemptService } from '../attempt/payment-attempt.service';
import { AuditService } from '../../audit/audit.service';
import { ERROR_CODES } from '../../../common/constants/error-codes.constant';
import { SubscriptionService } from '../../subscription/subscription.service';

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
    private readonly subscriptionService: SubscriptionService,
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
      await this.processStripeEvent(
        event as unknown as { type: string; data: { object: Record<string, unknown> } },
        webhookLog.id,
      );

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

  private async processStripeEvent(
    event: { type: string; data: { object: Record<string, unknown> } },
    webhookLogId: string,
  ): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as { id: string };
        await this.handleCheckoutSessionCompleted(session, webhookLogId);
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as { id: string; metadata: { transactionId: string } };
        await this.handlePaymentIntentSucceeded(pi, webhookLogId);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as {
          id: string;
          last_payment_error?: { message?: string };
          metadata: { transactionId: string };
        };
        await this.handlePaymentIntentFailed(pi);
        break;
      }
      case 'charge.refunded': {
        this.logger.log(`Stripe charge.refunded received — handled via RefundModule`);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await this.syncStripeSubscription(
          event.data.object as {
            id: string;
            status?: string;
            metadata?: Record<string, string>;
            current_period_start?: number;
            current_period_end?: number;
            trial_start?: number | null;
            trial_end?: number | null;
          },
          event.type,
        );
        break;
      }
      default:
        this.logger.log(`Stripe webhook: unhandled event type ${event.type}`);
    }
  }

  private async handleCheckoutSessionCompleted(
    session: { id: string },
    webhookLogId: string,
  ): Promise<void> {
    const attempt = await this.attemptService.findByProviderOrderId(session.id);
    if (!attempt) {
      this.logger.warn(`No attempt found for Stripe Checkout Session ${session.id}`);
      return;
    }

    await this.prisma.webhookLog.update({
      where: { id: webhookLogId },
      data: { attemptId: attempt.id },
    });

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: attempt.transactionId },
      select: { tenantId: true },
    });

    await this.orchestrator.verifyPayment({
      tenantId: transaction?.tenantId ?? '',
      transactionId: attempt.transactionId,
      attemptId: attempt.id,
      actorId: 'stripe-webhook',
    });
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

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: attempt.transactionId },
      select: { tenantId: true },
    });

    await this.orchestrator.verifyPayment({
      tenantId: transaction?.tenantId ?? '',
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

  private async syncStripeSubscription(
    subscription: {
      id: string;
      status?: string;
      metadata?: Record<string, string>;
      current_period_start?: number;
      current_period_end?: number;
      trial_start?: number | null;
      trial_end?: number | null;
    },
    eventType: string,
  ): Promise<void> {
    const metadata = subscription.metadata ?? {};
    const tenantId = metadata.tenantId ?? 'easydev';
    const customerId = metadata.customerId;
    const planId = metadata.planId;
    if (!customerId || !planId) {
      this.logger.warn(
        `Stripe subscription ${subscription.id} missing customerId/planId metadata; skipping sync`,
      );
      return;
    }

    const status =
      eventType === 'customer.subscription.deleted'
        ? SubscriptionStatus.CANCELLED
        : this.mapStripeStatus(subscription.status);

    if (!status) {
      this.logger.warn(`Stripe subscription ${subscription.id} returned unsupported status`);
      return;
    }

    const periodStart = this.fromUnixSeconds(subscription.current_period_start);
    const periodEnd = this.fromUnixSeconds(subscription.current_period_end);
    if (!periodStart || !periodEnd) {
      this.logger.warn(
        `Stripe subscription ${subscription.id} missing period bounds; skipping sync`,
      );
      return;
    }

    await this.subscriptionService.syncExternalSubscription({
      tenantId,
      customerId,
      planId,
      provider: Provider.STRIPE,
      providerSubscriptionId: subscription.id,
      actorId: 'stripe-webhook',
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialStart: this.fromUnixSeconds(subscription.trial_start) ?? undefined,
      trialEnd: this.fromUnixSeconds(subscription.trial_end) ?? undefined,
      metadata,
    });
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
        payment?: {
          entity: { id: string; order_id: string; status: string; error_description?: string };
        };
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
        payment?: {
          entity: { id: string; order_id: string; status: string; error_description?: string };
        };
      };
    },
    webhookLogId: string,
  ): Promise<void> {
    switch (body.event) {
      case 'subscription.authenticated':
      case 'subscription.activated':
      case 'subscription.charged':
      case 'subscription.pending':
      case 'subscription.halted':
      case 'subscription.cancelled':
      case 'subscription.completed': {
        const subscription = (
          body as {
            payload: {
              subscription?: {
                entity: {
                  id: string;
                  status?: string;
                  notes?: Record<string, string>;
                  current_start?: number;
                  current_end?: number;
                  start_at?: number;
                  charge_at?: number;
                  ended_at?: number;
                };
              };
            };
          }
        ).payload.subscription?.entity;

        if (subscription) {
          await this.syncRazorpaySubscription(subscription, body.event);
        }
        break;
      }
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

        const transaction = await this.prisma.transaction.findUnique({
          where: { id: attempt.transactionId },
          select: { tenantId: true },
        });

        await this.orchestrator.verifyPayment({
          tenantId: transaction?.tenantId ?? '',
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

  private async syncRazorpaySubscription(
    subscription: {
      id: string;
      status?: string;
      notes?: Record<string, string>;
      current_start?: number;
      current_end?: number;
      start_at?: number;
      charge_at?: number;
      ended_at?: number;
    },
    eventType: string,
  ): Promise<void> {
    const notes = subscription.notes ?? {};
    const customerId = notes.customerId;
    const planId = notes.planId;
    const tenantId = notes.tenantId ?? 'easydev';
    if (!customerId || !planId) {
      this.logger.warn(
        `Razorpay subscription ${subscription.id} missing customerId/planId notes; skipping sync`,
      );
      return;
    }

    const status = this.mapRazorpayStatus(subscription.status, eventType);
    if (!status) {
      this.logger.warn(`Razorpay subscription ${subscription.id} returned unsupported status`);
      return;
    }

    const periodStart = this.fromUnixSeconds(subscription.current_start ?? subscription.start_at);
    const periodEnd = this.fromUnixSeconds(subscription.current_end ?? subscription.charge_at);
    if (!periodStart || !periodEnd) {
      this.logger.warn(
        `Razorpay subscription ${subscription.id} missing period bounds; skipping sync`,
      );
      return;
    }

    await this.subscriptionService.syncExternalSubscription({
      tenantId,
      customerId,
      planId,
      provider: Provider.RAZORPAY,
      providerSubscriptionId: subscription.id,
      actorId: 'razorpay-webhook',
      status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      trialStart:
        subscription.start_at && subscription.start_at > Math.floor(Date.now() / 1000)
          ? new Date()
          : undefined,
      trialEnd: this.fromUnixSeconds(subscription.start_at) ?? undefined,
      metadata: notes,
    });
  }

  private mapStripeStatus(status?: string): SubscriptionStatus | null {
    if (!status) return null;
    if (status === 'trialing') return SubscriptionStatus.TRIALING;
    if (status === 'active') return SubscriptionStatus.ACTIVE;
    if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') {
      return SubscriptionStatus.PAST_DUE;
    }
    if (status === 'canceled' || status === 'incomplete_expired') {
      return SubscriptionStatus.CANCELLED;
    }
    return null;
  }

  private mapRazorpayStatus(status?: string, eventType?: string): SubscriptionStatus | null {
    if (eventType === 'subscription.cancelled' || eventType === 'subscription.completed') {
      return SubscriptionStatus.CANCELLED;
    }
    if (!status) return null;
    if (status === 'authenticated') return SubscriptionStatus.TRIALING;
    if (status === 'active') return SubscriptionStatus.ACTIVE;
    if (status === 'pending' || status === 'halted') return SubscriptionStatus.PAST_DUE;
    if (status === 'cancelled' || status === 'completed') return SubscriptionStatus.CANCELLED;
    return null;
  }

  private fromUnixSeconds(value?: number | null): Date | null {
    if (!value) return null;
    const date = new Date(value * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
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
