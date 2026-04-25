/**
 * Stripe Payment Provider
 *
 * Implements the IPaymentProvider strategy for Stripe.
 *
 * Flow:
 *  1. createPayment → creates a PaymentIntent and returns the client_secret
 *     for the frontend to complete via Stripe.js / Stripe iOS / Android SDK.
 *  2. verifyPayment → retrieves the PaymentIntent from Stripe API and checks
 *     its status — NEVER trusts the frontend response.
 *  3. refundPayment → creates a Refund on Stripe.
 *  4. verifyWebhookSignature → uses stripe.webhooks.constructEvent() which
 *     internally performs HMAC-SHA256 verification.
 */

import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';
import { Provider } from '@prisma/client';
import { AppConfigService } from '../../../config/app-config.service';
import {
  IPaymentProvider,
  CreatePaymentInput,
  ProviderPaymentResponse,
  VerifyPaymentInput,
  VerifyPaymentResult,
  RefundInput,
  RefundProviderResponse,
} from '../interfaces/payment-provider.interface';

@Injectable()
export class StripeProvider implements IPaymentProvider {
  readonly provider = Provider.STRIPE;
  private readonly stripe: Stripe;
  private readonly logger = new Logger(StripeProvider.name);

  constructor(private readonly config: AppConfigService) {
    this.stripe = new Stripe(config.stripeSecretKey, {
      // Pin the API version to prevent unexpected breaking changes
      apiVersion: config.stripeApiVersion as Stripe.LatestApiVersion,
      typescript: true,
      maxNetworkRetries: 2,
      timeout: 10_000,
      telemetry: false, // disable telemetry in financial systems
    });
  }

  async createPayment(input: CreatePaymentInput): Promise<ProviderPaymentResponse> {
    // ── Checkout Session flow (redirect to Stripe-hosted page) ────────────
    // Triggered when metadata.checkoutMode === true is passed by the caller
    // (e.g. web-agency-backend-api checkout adapter). Requires successUrl and
    // cancelUrl to be present in metadata.
    if (input.metadata?.checkoutMode === true) {
      return this.createCheckoutSession(input);
    }

    // ── Standard Payment Intent flow (embedded Stripe.js / Elements) ──────
    this.logger.log(`Creating Stripe PaymentIntent for transaction ${input.transactionId}`);

    // Amount must be integer (Stripe always expects smallest currency unit)
    const paymentIntent = await this.stripe.paymentIntents.create(
      {
        amount: Number(input.amount), // safe: all payments fit within Number.MAX_SAFE_INTEGER
        currency: input.currency.toLowerCase(),
        metadata: {
          transactionId: input.transactionId,
          customerId: input.customerId,
          ...input.metadata,
        },
        automatic_payment_methods: { enabled: true },
        description: `Transaction ${input.transactionId}`,
      },
      {
        // Forward idempotency key to Stripe to prevent double-charging
        idempotencyKey: input.idempotencyKey,
      },
    );

    return {
      providerOrderId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ?? undefined,
      provider: Provider.STRIPE,
      method: 'card',
      metadata: { paymentIntentId: paymentIntent.id },
    };
  }

  /**
   * Create a Stripe Checkout Session (hosted redirect payment page).
   * Invoked when metadata.checkoutMode === true.
   */
  private async createCheckoutSession(input: CreatePaymentInput): Promise<ProviderPaymentResponse> {
    this.logger.log(`Creating Stripe Checkout Session for transaction ${input.transactionId}`);

    const successUrl = String(input.metadata?.successUrl ?? '');
    const cancelUrl = String(input.metadata?.cancelUrl ?? '');
    const customerEmail = String(input.metadata?.customerEmail ?? '');
    const productName = String(input.metadata?.productName ?? 'Product');

    if (!successUrl || !cancelUrl) {
      throw new Error('Stripe Checkout Session requires successUrl and cancelUrl in metadata');
    }

    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: Number(input.amount),
              product_data: { name: productName },
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        ...(customerEmail ? { customer_email: customerEmail } : {}),
        metadata: {
          transactionId: input.transactionId,
          customerId: input.customerId,
          idempotencyKey: input.idempotencyKey,
        },
      },
      { idempotencyKey: input.idempotencyKey },
    );

    return {
      providerOrderId: session.id,
      sessionUrl: session.url ?? undefined,
      provider: Provider.STRIPE,
      method: 'checkout',
      metadata: { sessionId: session.id },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    // ── Checkout Session verification ─────────────────────────────────────
    // Stripe session IDs start with 'cs_'
    if (input.providerOrderId.startsWith('cs_')) {
      this.logger.log(`Verifying Stripe Checkout Session ${input.providerOrderId}`);
      try {
        const session = await this.stripe.checkout.sessions.retrieve(input.providerOrderId);
        if (session.payment_status === 'paid') {
          return {
            isSuccess: true,
            metadata: {
              sessionId: session.id,
              paymentIntentId: String(session.payment_intent ?? ''),
            },
          };
        }
        return {
          isSuccess: false,
          failureReason: `Checkout Session payment_status: ${session.payment_status}`,
        };
      } catch (err) {
        return { isSuccess: false, failureReason: (err as Error).message };
      }
    }

    // ── Standard PaymentIntent verification ───────────────────────────────
    this.logger.log(`Verifying Stripe PaymentIntent ${input.providerOrderId}`);

    const paymentIntent = await this.stripe.paymentIntents.retrieve(input.providerOrderId);

    if (paymentIntent.status === 'succeeded') {
      return { isSuccess: true, metadata: { chargeId: paymentIntent.latest_charge as string } };
    }

    return {
      isSuccess: false,
      failureReason:
        paymentIntent.last_payment_error?.message ??
        `PaymentIntent status: ${paymentIntent.status}`,
    };
  }

  async refundPayment(input: RefundInput): Promise<RefundProviderResponse> {
    this.logger.log(`Creating Stripe refund for payment ${input.providerPaymentId}`);

    const refund = await this.stripe.refunds.create(
      {
        payment_intent: input.providerPaymentId,
        amount: Number(input.amount),
        reason: this.mapRefundReason(input.reason),
        metadata: { currency: input.currency },
      },
      { idempotencyKey: input.idempotencyKey },
    );

    return {
      providerRefundId: refund.id,
      status:
        refund.status === 'succeeded'
          ? 'SUCCESS'
          : refund.status === 'pending'
            ? 'PENDING'
            : 'FAILED',
    };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    try {
      // constructEvent throws if signature is invalid
      this.stripe.webhooks.constructEvent(rawBody, signature, this.config.stripeWebhookSecret);
      return true;
    } catch (err) {
      this.logger.warn(`Stripe webhook signature verification failed: ${(err as Error).message}`);
      return false;
    }
  }

  /** Parse the raw Stripe webhook event from a raw body buffer. */
  parseWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, this.config.stripeWebhookSecret);
  }

  private mapRefundReason(reason?: string): Stripe.RefundCreateParams.Reason | undefined {
    if (!reason) return undefined;
    const map: Record<string, Stripe.RefundCreateParams.Reason> = {
      duplicate: 'duplicate',
      fraudulent: 'fraudulent',
      customer_request: 'requested_by_customer',
    };
    return map[reason.toLowerCase()];
  }
}
