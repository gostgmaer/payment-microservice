"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_NAMES = exports.QUEUE_NAMES = void 0;
/** BullMQ queue names — single source of truth to prevent typos. */
exports.QUEUE_NAMES = {
    PAYMENT_PROCESSING: 'payment-processing',
    REFUND_PROCESSING: 'refund-processing',
    SUBSCRIPTION_RENEWAL: 'subscription-renewal',
};
/** BullMQ job names within each queue */
exports.JOB_NAMES = {
    // payment-processing queue
    PROCESS_PAYMENT: 'process-payment',
    EXPIRE_ATTEMPT: 'expire-attempt',
    RECONCILE_TRANSACTION: 'reconcile-transaction',
    // refund-processing queue
    PROCESS_REFUND: 'process-refund',
    // subscription-renewal queue
    RENEW_SUBSCRIPTION: 'renew-subscription',
    CHECK_EXPIRED_SUBSCRIPTIONS: 'check-expired-subscriptions',
};
