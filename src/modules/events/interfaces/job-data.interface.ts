/** Typed job data interfaces for each BullMQ queue. */

export interface PaymentJobData {
  tenantId: string;
  transactionId: string;
  attemptId: string;
  providerPaymentId?: string;
  providerSignature?: string;
}

export interface RefundJobData {
  refundId: string;
  transactionId: string;
  amount: string; // serialised bigint
  currency: string;
  reason?: string;
  idempotencyKey: string;
}

export interface SubscriptionRenewalJobData {
  subscriptionId: string;
  cycleId?: string;
  attemptNumber: number;
}

export interface ExpireAttemptJobData {
  attemptId: string;
}
