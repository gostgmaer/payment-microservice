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

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
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
