/** BullMQ queue names — single source of truth to prevent typos. */
export const QUEUE_NAMES = {
  PAYMENT_PROCESSING: 'payment-processing',
  REFUND_PROCESSING: 'refund-processing',
  SUBSCRIPTION_RENEWAL: 'subscription-renewal',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

/** BullMQ job names within each queue */
export const JOB_NAMES = {
  // payment-processing queue
  PROCESS_PAYMENT: 'process-payment',
  EXPIRE_ATTEMPT: 'expire-attempt',
  RECONCILE_TRANSACTION: 'reconcile-transaction',

  // refund-processing queue
  PROCESS_REFUND: 'process-refund',

  // subscription-renewal queue
  RENEW_SUBSCRIPTION: 'renew-subscription',
  CHECK_EXPIRED_SUBSCRIPTIONS: 'check-expired-subscriptions',
} as const;
