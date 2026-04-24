/**
 * IPaymentProvider — Strategy interface for payment gateway adapters.
 *
 * All providers (Stripe, Razorpay) implement this contract. The orchestrator
 * depends only on this interface, never on concrete implementations — enabling
 * runtime failover and easy addition of future providers.
 */

import { Provider } from '@prisma/client';

// ── Input / Output types ──────────────────────────────────────────────────────

export interface CreatePaymentInput {
  /** Amount in smallest currency unit (paise / cents) */
  amount: bigint;
  currency: string;
  /** Internal transaction ID (used as provider order description) */
  transactionId: string;
  /** Customer identifier */
  customerId: string;
  /** Preferred payment method: 'card' | 'upi' | 'netbanking' | 'wallet' */
  method?: string;
  /** Caller-supplied idempotency key forwarded to the provider */
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderPaymentResponse {
  /** Provider's internal order/payment-intent ID */
  providerOrderId: string;
  /**
   * For Stripe: the client_secret returned to the frontend.
   * For Razorpay: undefined (order ID is used directly).
   */
  clientSecret?: string;
  /** Provider enum */
  provider: Provider;
  /** Payment method hint for the response */
  method: string;
  metadata?: Record<string, unknown>;
}

export interface VerifyPaymentInput {
  providerOrderId: string;
  /** Raw payment ID from Razorpay or PaymentIntent ID from Stripe */
  providerPaymentId?: string;
  /** Razorpay-specific: signature returned by frontend */
  providerSignature?: string;
}

export interface VerifyPaymentResult {
  isSuccess: boolean;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

export interface RefundInput {
  providerPaymentId: string;
  /** Amount to refund in smallest currency unit */
  amount: bigint;
  currency: string;
  reason?: string;
  idempotencyKey: string;
}

export interface RefundProviderResponse {
  providerRefundId: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  metadata?: Record<string, unknown>;
}

// ── Provider interface ────────────────────────────────────────────────────────

export interface IPaymentProvider {
  readonly provider: Provider;

  /**
   * Create a payment order/intent on the provider side.
   * Returns credentials the frontend needs to complete the payment.
   */
  createPayment(input: CreatePaymentInput): Promise<ProviderPaymentResponse>;

  /**
   * Verify the payment status server-side.
   * NEVER trust the frontend's success callback — always verify via provider API.
   */
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;

  /**
   * Initiate a refund for a previously completed payment.
   */
  refundPayment(input: RefundInput): Promise<RefundProviderResponse>;

  /**
   * Verify the webhook signature using the provider's signing secret.
   * Returns true only if the signature is cryptographically valid.
   * Uses timing-safe comparison internally.
   */
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
}
