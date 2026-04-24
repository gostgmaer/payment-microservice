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
import Razorpay from 'razorpay';
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
  private readonly razorpay: Razorpay;
  private readonly logger = new Logger(RazorpayProvider.name);

  constructor(private readonly config: AppConfigService) {
    this.razorpay = new Razorpay({
      key_id: config.razorpayKeyId,
      key_secret: config.razorpayKeySecret,
    });
  }

  async createPayment(input: CreatePaymentInput): Promise<ProviderPaymentResponse> {
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

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    this.logger.log(`Verifying Razorpay payment for order ${input.providerOrderId}`);

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
        expectedBuf.length === receivedBuf.length &&
        timingSafeEqual(expectedBuf, receivedBuf);

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

    const status = refund.status === 'processed' ? 'SUCCESS' : refund.status === 'pending' ? 'PENDING' : 'FAILED';

    return {
      providerRefundId: refund.id,
      status,
      metadata: { razorpayRefundId: refund.id },
    };
  }

  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
    // Razorpay webhook signature: SHA-256 HMAC of raw body with webhook_secret
    const expected = createHmac('sha256', this.config.razorpayWebhookSecret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(signature);

    if (expectedBuf.length !== receivedBuf.length) return false;
    return timingSafeEqual(expectedBuf, receivedBuf);
  }
}
