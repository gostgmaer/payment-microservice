/**
 * Razorpay Payment Provider
 *
 * Implements the IPaymentProvider strategy for Razorpay.
 *
 * Flow:
 *  1. createPayment → creates a Razorpay Order and returns the orderId.
 *     Frontend uses Razorpay Checkout SDK to complete the payment.
 *  2. verifyPayment → verifies HMAC-SHA256 signature over
 *     `orderId|paymentId` using the key_secret.
 *     This is the ONLY accepted verification method for Razorpay —
 *     no API call needed after signature check.
 *  3. refundPayment → creates a refund via Razorpay Refunds API.
 *  4. verifyWebhookSignature → SHA-256 HMAC with webhook_secret.
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
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
export class RazorpayProvider implements IPaymentProvider {
  readonly provider = Provider.RAZORPAY;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly razorpay: any;
  private readonly logger = new Logger(RazorpayProvider.name);

  constructor(private readonly config: AppConfigService) {
    // Only instantiate SDK when Razorpay is enabled; guards against empty credentials.
    // Uses require() to avoid esModuleInterop issues with Razorpay's CJS export.
    if (config.razorpayEnabled) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RazorpaySdk = require('razorpay');
      this.razorpay = new RazorpaySdk({
        key_id: config.razorpayKeyId,
        key_secret: config.razorpayKeySecret,
      });
    }
  }

  async createPayment(input: CreatePaymentInput): Promise<ProviderPaymentResponse> {
    if (input.metadata?.recurringMode === true) {
      return this.createRecurringSubscription(input);
    }

    this.logger.log(`Creating Razorpay order for transaction ${input.transactionId}`);

    // Razorpay amount is always in paise (smallest unit) — already in BigInt
    const order = await this.razorpay.orders.create({
      amount: Number(input.amount),
      currency: input.currency.toUpperCase(),
      receipt: input.transactionId.substring(0, 40), // max 40 chars
      notes: {
        transactionId: input.transactionId,
        customerId: input.customerId,
      },
    });

    return {
      providerOrderId: order.id,
      provider: Provider.RAZORPAY,
      method: input.method ?? 'upi',
      metadata: { orderId: order.id, status: order.status },
    };
  }

  private async createRecurringSubscription(
    input: CreatePaymentInput,
  ): Promise<ProviderPaymentResponse> {
    this.logger.log(`Creating Razorpay subscription for transaction ${input.transactionId}`);

    const plan = await this.razorpay.plans.create({
      period: this.mapPlanPeriod(String(input.metadata?.interval ?? 'month')),
      interval: this.resolveIntervalCount(input.metadata?.intervalCount),
      item: {
        name: String(input.metadata?.productName ?? 'Subscription'),
        amount: Number(input.amount),
        currency: input.currency.toUpperCase(),
        description: `${String(input.metadata?.productName ?? 'Subscription')} recurring billing`,
      },
      notes: {
        transactionId: input.transactionId,
        customerId: input.customerId,
      },
    });

    const nowSeconds = Math.floor(Date.now() / 1000);
    const trialDays = this.resolveTrialDays(input.metadata?.trialDays);
    const startAt = trialDays > 0 ? nowSeconds + trialDays * 24 * 60 * 60 : nowSeconds;
    const subscription = await this.razorpay.subscriptions.create({
      plan_id: plan.id,
      total_count: this.resolveTotalCount(),
      quantity: 1,
      customer_notify: 0,
      start_at: startAt,
      notes: {
        transactionId: input.transactionId,
        customerId: input.customerId,
        planId: String(input.metadata?.planId ?? ''),
        productId: String(input.metadata?.productId ?? ''),
        customerEmail: String(input.metadata?.customerEmail ?? ''),
        tenantId: String(input.metadata?.tenantId ?? 'easydev'),
      },
    });

    return {
      providerOrderId: subscription.id,
      provider: Provider.RAZORPAY,
      method: 'subscription',
      metadata: {
        providerSubscriptionId: subscription.id,
        razorpayPlanId: plan.id,
        recurringMode: true,
        subscriptionStatus: this.mapSubscriptionStatus(subscription.status),
        trialEnd: startAt,
        currentPeriodStart: startAt,
      },
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    this.logger.log(`Verifying Razorpay payment for order ${input.providerOrderId}`);

    if (input.providerOrderId.startsWith('sub_')) {
      if (input.providerPaymentId && input.providerSignature) {
        const body = `${input.providerPaymentId}|${input.providerOrderId}`;
        const expected = createHmac('sha256', this.config.razorpayKeySecret)
          .update(body)
          .digest('hex');

        const expectedBuf = Buffer.from(expected);
        const receivedBuf = Buffer.from(input.providerSignature);
        const isValid =
          expectedBuf.length === receivedBuf.length && timingSafeEqual(expectedBuf, receivedBuf);

        if (!isValid) {
          return { isSuccess: false, failureReason: 'Subscription signature verification failed' };
        }
      }

      const subscription = await this.razorpay.subscriptions.fetch(input.providerOrderId);
      const status = String(subscription.status ?? '');
      const isSuccess = ['authenticated', 'active'].includes(status);
      const trialEnd = this.asUnixTimestamp(subscription.start_at ?? subscription.charge_at);
      const currentPeriodStart = this.asUnixTimestamp(
        subscription.current_start ?? subscription.start_at,
      );
      const currentPeriodEnd = this.asUnixTimestamp(
        subscription.current_end ?? subscription.charge_at,
      );

      return {
        isSuccess,
        failureReason: isSuccess ? undefined : `Subscription status: ${status}`,
        metadata: {
          providerSubscriptionId: subscription.id,
          subscriptionId: subscription.id,
          subscriptionStatus: this.mapSubscriptionStatus(status),
          trialStart: trialEnd && trialEnd > Math.floor(Date.now() / 1000) ? Math.floor(Date.now() / 1000) : undefined,
          trialEnd,
          currentPeriodStart,
          currentPeriodEnd,
        },
      };
    }

    // Razorpay's recommended server-side verification:
    // SHA-256 HMAC of "orderId|paymentId" with key_secret
    if (input.providerPaymentId && input.providerSignature) {
      const body = `${input.providerOrderId}|${input.providerPaymentId}`;
      const expected = createHmac('sha256', this.config.razorpayKeySecret)
        .update(body)
        .digest('hex');

      const expectedBuf = Buffer.from(expected);
      const receivedBuf = Buffer.from(input.providerSignature);

      const isValid =
        expectedBuf.length === receivedBuf.length && timingSafeEqual(expectedBuf, receivedBuf);

      return {
        isSuccess: isValid,
        failureReason: isValid ? undefined : 'Signature verification failed',
      };
    }

    // Fallback: fetch order status from API (slower but works without signature)
    const order = await this.razorpay.orders.fetch(input.providerOrderId);
    return {
      isSuccess: order.status === 'paid',
      failureReason: order.status !== 'paid' ? `Order status: ${order.status}` : undefined,
    };
  }

  async refundPayment(input: RefundInput): Promise<RefundProviderResponse> {
    this.logger.log(`Creating Razorpay refund for payment ${input.providerPaymentId}`);

    const refund = await this.razorpay.payments.refund(input.providerPaymentId, {
      amount: Number(input.amount),
      notes: { reason: input.reason ?? 'Refund requested' },
    });

    const status =
      refund.status === 'processed'
        ? 'SUCCESS'
        : refund.status === 'pending'
          ? 'PENDING'
          : 'FAILED';

    return {
      providerRefundId: refund.id,
      status,
      metadata: { razorpayRefundId: refund.id },
    };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    const webhookSecret = this.config.razorpayWebhookSecret;
    if (!webhookSecret) {
      this.logger.warn('Razorpay webhook secret is not configured; rejecting webhook.');
      return false;
    }

    // Razorpay webhook signature: SHA-256 HMAC of raw body with webhook_secret
    const expected = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(signature);

    if (expectedBuf.length !== receivedBuf.length) return false;
    return timingSafeEqual(expectedBuf, receivedBuf);
  }

  private mapPlanPeriod(interval: string): string {
    if (interval === 'day') return 'daily';
    if (interval === 'week') return 'weekly';
    if (interval === 'year') return 'yearly';
    return 'monthly';
  }

  private resolveIntervalCount(rawValue: unknown): number {
    const value = Number(rawValue);
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  private resolveTrialDays(rawValue: unknown): number {
    const value = Number(rawValue);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  private resolveTotalCount(): number {
    return 120;
  }

  private mapSubscriptionStatus(status?: string): string | undefined {
    if (!status) return undefined;
    if (status === 'authenticated') return 'TRIALING';
    if (status === 'active') return 'ACTIVE';
    if (status === 'pending' || status === 'halted') return 'PAST_DUE';
    if (status === 'cancelled' || status === 'completed') return 'CANCELLED';
    return undefined;
  }

  private asUnixTimestamp(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
}
