/**
 * Centralised application configuration.
 *
 * Using @nestjs/config with a typed factory keeps env-var access type-safe
 * and validates required values at startup.
 */

export default () => ({
  app: {
    port: parseInt(process.env.PORT ?? '3000', 10),
    env: process.env.NODE_ENV ?? 'development',
    prefix: process.env.API_PREFIX ?? 'api/v1',
    logLevel: process.env.LOG_LEVEL ?? 'info',
  },

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD ?? undefined,
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
  },

  jwt: {
    // This service VERIFIES tokens issued by your external auth service.
    // Set this to the same HS256 secret your auth service uses to sign tokens.
    secret: process.env.JWT_SECRET,
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    apiVersion: process.env.STRIPE_API_VERSION ?? '2024-04-10',
    enabled: process.env.STRIPE_ENABLED !== 'false',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    enabled: process.env.RAZORPAY_ENABLED !== 'false',
  },

  payment: {
    attemptExpiryMinutes: parseInt(process.env.PAYMENT_ATTEMPT_EXPIRY_MINUTES ?? '15', 10),
    maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS ?? '3', 10),
    idempotencyTtlSeconds: parseInt(process.env.PAYMENT_IDEMPOTENCY_TTL_SECONDS ?? '86400', 10),
  },

  subscription: {
    gracePeriodDays: parseInt(process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS ?? '3', 10),
    maxRetryAttempts: parseInt(process.env.SUBSCRIPTION_MAX_RETRY_ATTEMPTS ?? '3', 10),
    retryIntervalHours: parseInt(process.env.SUBSCRIPTION_RETRY_INTERVAL_HOURS ?? '24', 10),
  },

  queues: {
    paymentConcurrency: parseInt(process.env.PAYMENT_QUEUE_CONCURRENCY ?? '5', 10),
    refundConcurrency: parseInt(process.env.REFUND_QUEUE_CONCURRENCY ?? '3', 10),
    subscriptionConcurrency: parseInt(process.env.SUBSCRIPTION_QUEUE_CONCURRENCY ?? '5', 10),
  },

  features: {
    multiCurrency: process.env.FEATURE_MULTI_CURRENCY === 'true',
    failoverEnabled: process.env.FEATURE_FAILOVER_ENABLED !== 'false',
    reconciliationEnabled: process.env.FEATURE_RECONCILIATION_ENABLED !== 'false',
    reconciliationCron: process.env.RECONCILIATION_CRON ?? '0 2 * * *',
    bullmqEnabled: process.env.BULLMQ_ENABLED !== 'false',
  },

  iam: {
    // URL of the auth/IAM service — used to fetch per-tenant platform settings.
    // Example: http://localhost:4000
    serviceUrl: process.env.IAM_SERVICE_URL ?? '',
    // Optional API key for service-to-service calls (only needed if the IAM
    // service restricts its /settings/public endpoint in future).
    serviceApiKey: process.env.IAM_SERVICE_API_KEY ?? '',
  },
});
