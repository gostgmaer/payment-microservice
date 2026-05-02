/**
 * Cash Payment Provider
 *
 * Offline payment method — no external API calls.
 *
 * Flow:
 *  1. createPayment  → generates a reference code the customer presents on delivery/in-person.
 *  2. verifyPayment  → always returns success (admin confirms receipt offline; no signature needed).
 *  3. refundPayment  → returns SUCCESS immediately (handled offline by the business).
 *  4. verifyWebhookSignature → always true (cash has no webhook events).
 *
 * Auto-enabled by PaymentProviderFactory when both Stripe and Razorpay are disabled,
 * ensuring the service always has at least one payment option available.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Provider } from '@prisma/client';
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
export class CashProvider implements IPaymentProvider {
  readonly provider = Provider.CASH;
  private readonly logger = new Logger(CashProvider.name);

  /**
   * Generate a cash payment reference.
   * The reference code is returned to the caller so it can be communicated
   * to the customer (e.g. shown on invoice, sent via email).
   */
  async createPayment(input: CreatePaymentInput): Promise<ProviderPaymentResponse> {
    const referenceCode = `CASH-${input.transactionId.toUpperCase().slice(0, 12)}`;
    this.logger.log(
      `Cash payment reference created: ${referenceCode} for transaction ${input.transactionId}`,
    );

    return {
      providerOrderId: referenceCode,
      provider: Provider.CASH,
      method: 'cash',
      metadata: {
        referenceCode,
        transactionId: input.transactionId,
        amount: input.amount.toString(),
        currency: input.currency,
        note: 'Awaiting offline cash collection',
      },
    };
  }

  /**
   * Cash payments are verified offline by the business.
   * This always returns success — the admin is responsible for marking
   * the transaction as paid through the back-office workflow.
   */
  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    this.logger.log(
      `Cash payment verified for order ${input.providerOrderId} (offline confirmation)`,
    );
    return { isSuccess: true };
  }

  /**
   * Cash refunds are handled offline. Mark as immediately successful.
   */
  async refundPayment(input: RefundInput): Promise<RefundProviderResponse> {
    const refundId = `CASH-REFUND-${input.providerPaymentId.slice(5, 17)}-${Date.now()}`;
    this.logger.log(`Cash refund recorded: ${refundId} for payment ${input.providerPaymentId}`);

    return {
      providerRefundId: refundId,
      status: 'SUCCESS',
      metadata: {
        refundId,
        amount: input.amount.toString(),
        currency: input.currency,
        reason: input.reason ?? 'Refund requested',
        note: 'Cash refund — handled offline',
      },
    };
  }

  /**
   * Cash has no webhook delivery. Always return true so the webhook
   * middleware can safely skip cash events without throwing.
   */
  verifyWebhookSignature(_rawBody: Buffer, _signature: string): boolean {
    return true;
  }
}
