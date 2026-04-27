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
    // Only instantiate SDK when Stripe is enabled; guards against empty credentials.
    if (config.stripeEnabled) {
      this.stripe = new Stripe(config.stripeSecretKey, {
        // Pin the API version to prevent unexpected breaking changes
        apiVersion: config.stripeApiVersion as Stripe.LatestApiVersion,
        typescript: true,
        maxNetworkRetries: 2,
        timeout: 10_000,
        telemetry: false, // disable telemetry in financial systems
      });
    }
  }

  async createPayment(input: CreatePaymentInput): Promise<ProviderPaymentResponse> {
    // ── Checkout Session flow (redirect to Stripe-hosted page) ────────────
    // Triggered when metadata.checkoutMode === true is passed by the caller
    // (e.g. web-agency-backend-api checkout adapter). Requires successUrl and
    // cancelUrl to be present in metadata.
    if (input.metadata?.checkoutMode === true) {
      if (input.metadata?.recurringMode === true) {
        return this.createRecurringCheckoutSession(input);
      }
      return this.createCheckoutSession(input);
    }

    // ── Standard Payment Intent flow (embedded Stripe.js / Elements) ──────
    this.logger.log(`Creating Stripe PaymentIntent for transaction ${input.transactionId}`);

    const providerCustomerId = this.resolveProviderCustomerId(input.metadata);

    // Amount must be integer (Stripe always expects smallest currency unit)
    const paymentIntent = await this.stripe.paymentIntents.create(
      {
        amount: Number(input.amount), // safe: all payments fit within Number.MAX_SAFE_INTEGER
        currency: input.currency.toLowerCase(),
        ...(providerCustomerId ? { customer: providerCustomerId } : {}),
        metadata: {
          transactionId: input.transactionId,
          customerId: input.customerId,
          ...(providerCustomerId ? { providerCustomerId } : {}),
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
    const providerCustomerId = this.resolveProviderCustomerId(input.metadata);

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
        ...(providerCustomerId
          ? { customer: providerCustomerId }
          : customerEmail
            ? { customer_email: customerEmail }
            : {}),
        metadata: {
          transactionId: input.transactionId,
          customerId: input.customerId,
          idempotencyKey: input.idempotencyKey,
          ...(providerCustomerId ? { providerCustomerId } : {}),
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

  private async createRecurringCheckoutSession(
    input: CreatePaymentInput,
  ): Promise<ProviderPaymentResponse> {
    this.logger.log(`Creating Stripe subscription Checkout Session for ${input.transactionId}`);

    const successUrl = String(input.metadata?.successUrl ?? '');
    const cancelUrl = String(input.metadata?.cancelUrl ?? '');
    const customerEmail = String(input.metadata?.customerEmail ?? '');
    const productName = String(input.metadata?.productName ?? 'Product');
    const interval = this.resolveStripeInterval(String(input.metadata?.interval ?? 'month'));
    const intervalCount = this.resolveIntervalCount(input.metadata?.intervalCount);
    const trialDays = this.resolveTrialDays(input.metadata?.trialDays);
    const planId = String(input.metadata?.planId ?? '');
    const productId = String(input.metadata?.productId ?? '');
    const providerCustomerId = this.resolveProviderCustomerId(input.metadata);

    if (!successUrl || !cancelUrl) {
      throw new Error('Stripe subscription Checkout requires successUrl and cancelUrl in metadata');
    }

    const session = await this.stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: input.currency.toLowerCase(),
              unit_amount: Number(input.amount),
              recurring: {
                interval,
                interval_count: intervalCount,
              },
              product_data: { name: productName },
            },
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        ...(providerCustomerId
          ? { customer: providerCustomerId }
          : customerEmail
            ? { customer_email: customerEmail }
            : {}),
        metadata: {
          transactionId: input.transactionId,
          customerId: input.customerId,
          planId,
          productId,
          customerEmail,
          recurringMode: 'true',
          idempotencyKey: input.idempotencyKey,
          ...(providerCustomerId ? { providerCustomerId } : {}),
        },
        subscription_data: {
          ...(trialDays > 0 ? { trial_period_days: trialDays } : {}),
          metadata: {
            transactionId: input.transactionId,
            customerId: input.customerId,
            planId,
            productId,
            customerEmail,
            recurringMode: 'true',
            ...(providerCustomerId ? { providerCustomerId } : {}),
          },
        },
      },
      { idempotencyKey: input.idempotencyKey },
    );

    return {
      providerOrderId: session.id,
      sessionUrl: session.url ?? undefined,
      provider: Provider.STRIPE,
      method: 'subscription',
      metadata: {
        sessionId: session.id,
        recurringMode: true,
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    // ── Checkout Session verification ─────────────────────────────────────
    // Stripe session IDs start with 'cs_'
    if (input.providerOrderId.startsWith('cs_')) {
      this.logger.log(`Verifying Stripe Checkout Session ${input.providerOrderId}`);
      try {
        const session = await this.stripe.checkout.sessions.retrieve(input.providerOrderId);
        if (
          session.mode === 'subscription' &&
          session.status === 'complete' &&
          ['paid', 'no_payment_required'].includes(session.payment_status)
        ) {
          const subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id;
          const subscription = subscriptionId
            ? await this.stripe.subscriptions.retrieve(subscriptionId)
            : null;

          return {
            isSuccess: true,
            metadata: {
              sessionId: session.id,
              paymentIntentId: String(session.payment_intent ?? ''),
              providerSubscriptionId: subscription?.id ?? subscriptionId,
              subscriptionId: subscription?.id ?? subscriptionId,
              subscriptionStatus: this.mapSubscriptionStatus(subscription?.status),
              currentPeriodStart: subscription?.current_period_start,
              currentPeriodEnd: subscription?.current_period_end,
              trialStart: subscription?.trial_start,
              trialEnd: subscription?.trial_end,
              providerCustomerId:
                typeof session.customer === 'string' ? session.customer : undefined,
              customerId: typeof session.customer === 'string' ? session.customer : undefined,
            },
          };
        }
        if (session.payment_status === 'paid') {
          return {
            isSuccess: true,
            metadata: {
              sessionId: session.id,
              paymentIntentId: String(session.payment_intent ?? ''),
              providerCustomerId:
                typeof session.customer === 'string' ? session.customer : undefined,
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
      return {
        isSuccess: true,
        metadata: {
          chargeId: paymentIntent.latest_charge as string,
          providerCustomerId:
            typeof paymentIntent.customer === 'string' ? paymentIntent.customer : undefined,
        },
      };
    }

    return {
      isSuccess: false,
      failureReason:
        paymentIntent.last_payment_error?.message ??
        `PaymentIntent status: ${paymentIntent.status}`,
    };
  }

  private resolveStripeInterval(
    interval: string,
  ): Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring.Interval {
    if (interval === 'day') return 'day';
    if (interval === 'week') return 'week';
    if (interval === 'year') return 'year';
    return 'month';
  }

  private resolveIntervalCount(rawValue: unknown): number {
    const value = Number(rawValue);
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  private resolveTrialDays(rawValue: unknown): number {
    const value = Number(rawValue);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  private mapSubscriptionStatus(status?: Stripe.Subscription.Status): string | undefined {
    if (!status) return undefined;
    if (status === 'trialing') return 'TRIALING';
    if (status === 'active') return 'ACTIVE';
    if (status === 'past_due' || status === 'unpaid' || status === 'incomplete') return 'PAST_DUE';
    if (status === 'canceled' || status === 'incomplete_expired') return 'CANCELLED';
    return undefined;
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

  async ensureCustomer(input: {
    providerCustomerId?: string | null;
    customerEmail?: string | null;
    internalCustomerId: string;
    tenantId: string;
  }): Promise<string> {
    const stripe = this.getClient();
    if (input.providerCustomerId) {
      return input.providerCustomerId;
    }

    const customer = await stripe.customers.create({
      ...(input.customerEmail ? { email: input.customerEmail } : {}),
      metadata: {
        internalCustomerId: input.internalCustomerId,
        tenantId: input.tenantId,
      },
    });

    return customer.id;
  }

  async createSetupIntent(input: {
    providerCustomerId?: string | null;
    customerEmail?: string | null;
    internalCustomerId: string;
    tenantId: string;
    idempotencyKey: string;
  }): Promise<{ setupIntentId: string; clientSecret: string; providerCustomerId: string }> {
    const stripe = this.getClient();
    const providerCustomerId = await this.ensureCustomer(input);

    const setupIntent = await stripe.setupIntents.create(
      {
        customer: providerCustomerId,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: {
          internalCustomerId: input.internalCustomerId,
          tenantId: input.tenantId,
        },
      },
      { idempotencyKey: input.idempotencyKey },
    );

    if (!setupIntent.client_secret) {
      throw new Error('Stripe SetupIntent did not return a client secret');
    }

    return {
      setupIntentId: setupIntent.id,
      clientSecret: setupIntent.client_secret,
      providerCustomerId,
    };
  }

  async retrieveCompletedSetupIntent(setupIntentId: string): Promise<{
    providerCustomerId: string;
    paymentMethod: StripeSavedPaymentMethod;
    metadata: {
      internalCustomerId: string | null;
      tenantId: string | null;
    };
  }> {
    const stripe = this.getClient();
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    if (setupIntent.status !== 'succeeded') {
      throw new Error(`SetupIntent ${setupIntentId} is not complete`);
    }

    const providerCustomerId =
      typeof setupIntent.customer === 'string' ? setupIntent.customer : setupIntent.customer?.id;
    const paymentMethodId =
      typeof setupIntent.payment_method === 'string'
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id;

    if (!providerCustomerId || !paymentMethodId) {
      throw new Error(`SetupIntent ${setupIntentId} is missing customer or payment method data`);
    }

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    return {
      providerCustomerId,
      paymentMethod: this.toSavedPaymentMethod(paymentMethod),
      metadata: {
        internalCustomerId:
          typeof setupIntent.metadata?.internalCustomerId === 'string'
            ? setupIntent.metadata.internalCustomerId
            : null,
        tenantId:
          typeof setupIntent.metadata?.tenantId === 'string' ? setupIntent.metadata.tenantId : null,
      },
    };
  }

  async listSavedPaymentMethods(providerCustomerId: string): Promise<{
    defaultPaymentMethodId: string | null;
    methods: StripeSavedPaymentMethod[];
  }> {
    const stripe = this.getClient();
    const customer = await stripe.customers.retrieve(providerCustomerId);
    if ('deleted' in customer && customer.deleted) {
      throw new Error(`Stripe customer ${providerCustomerId} was deleted`);
    }

    const defaultPaymentMethodId =
      typeof customer.invoice_settings.default_payment_method === 'string'
        ? customer.invoice_settings.default_payment_method
        : (customer.invoice_settings.default_payment_method?.id ?? null);

    const paymentMethods = await stripe.paymentMethods.list({
      customer: providerCustomerId,
      type: 'card',
      limit: 100,
    });

    return {
      defaultPaymentMethodId,
      methods: paymentMethods.data.map((paymentMethod) =>
        this.toSavedPaymentMethod(paymentMethod, defaultPaymentMethodId),
      ),
    };
  }

  async setDefaultPaymentMethod(input: {
    providerCustomerId: string;
    paymentMethodId: string;
  }): Promise<StripeSavedPaymentMethod> {
    const stripe = this.getClient();
    const paymentMethod = await stripe.paymentMethods.retrieve(input.paymentMethodId);
    const currentCustomerId =
      typeof paymentMethod.customer === 'string'
        ? paymentMethod.customer
        : paymentMethod.customer?.id;

    if (currentCustomerId !== input.providerCustomerId) {
      throw new Error('Payment method does not belong to the Stripe customer');
    }

    await stripe.customers.update(input.providerCustomerId, {
      invoice_settings: { default_payment_method: input.paymentMethodId },
    });

    const subscriptions = await stripe.subscriptions.list({
      customer: input.providerCustomerId,
      status: 'all',
      limit: 100,
    });

    const activeSubscriptions = subscriptions.data.filter((subscription) =>
      ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'].includes(subscription.status),
    );

    for (const subscription of activeSubscriptions) {
      await stripe.subscriptions.update(subscription.id, {
        default_payment_method: input.paymentMethodId,
      });
    }

    return this.toSavedPaymentMethod(paymentMethod, input.paymentMethodId);
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

  private getClient(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe provider is not enabled');
    }

    return this.stripe;
  }

  private resolveProviderCustomerId(metadata?: Record<string, unknown>): string | undefined {
    const direct = metadata?.providerCustomerId;
    if (typeof direct === 'string' && direct.trim()) {
      return direct.trim();
    }

    const legacy = metadata?.customerId;
    if (typeof legacy === 'string' && legacy.startsWith('cus_')) {
      return legacy;
    }

    return undefined;
  }

  private toSavedPaymentMethod(
    paymentMethod: Stripe.PaymentMethod,
    defaultPaymentMethodId?: string | null,
  ): StripeSavedPaymentMethod {
    return {
      id: paymentMethod.id,
      type: paymentMethod.type,
      brand: paymentMethod.card?.brand ?? null,
      last4: paymentMethod.card?.last4 ?? null,
      expMonth: paymentMethod.card?.exp_month ?? null,
      expYear: paymentMethod.card?.exp_year ?? null,
      funding: paymentMethod.card?.funding ?? null,
      createdAt: paymentMethod.created
        ? new Date(paymentMethod.created * 1000).toISOString()
        : null,
      isDefault: Boolean(defaultPaymentMethodId && paymentMethod.id === defaultPaymentMethodId),
    };
  }
}

export interface StripeSavedPaymentMethod {
  id: string;
  type: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  funding: string | null;
  createdAt: string | null;
  isDefault: boolean;
}
