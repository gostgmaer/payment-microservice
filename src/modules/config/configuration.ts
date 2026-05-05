/**
 * Centralised application configuration.
 *
 * Using @nestjs/config with a typed factory keeps env-var access type-safe
 * and validates required values at startup.
 */

import { getEnvOptional, getEnvRequired } from './runtime-env';

export default () => {
  // Canonical RS256 verifier key for IAM access tokens.
  // Keep legacy IAM_JWT_PUBLIC_KEY fallback for backward compatibility.
  const iamJwtPublicKeyB64 =
    getEnvOptional('JWT_PUBLIC_KEY') ?? getEnvOptional('IAM_JWT_PUBLIC_KEY');

  return {
  app: {
    port: parseInt(getEnvOptional('PORT') ?? '3000', 10),
    env: getEnvOptional('NODE_ENV') ?? 'development',
    prefix: getEnvOptional('API_PREFIX') ?? 'api/v1',
    logLevel: getEnvOptional('LOG_LEVEL') ?? 'info',
    structuredLoggingEnabled: (getEnvOptional('ENABLE_LOGGING') ?? getEnvOptional('ENABLE_PINO_LOGGING')) === 'true',
  },

  database: {
    url: getEnvOptional('DATABASE_URL') ?? undefined,
  },

  redis: {
    host: getEnvRequired('REDIS_HOST'),
    port: parseInt(getEnvOptional('REDIS_PORT') ?? '6379', 10),
    password: getEnvOptional('REDIS_PASSWORD') ?? undefined,
    db: parseInt(getEnvOptional('REDIS_DB') ?? '0', 10),
  },

  jwt: {
    // This service VERIFIES tokens issued by your external auth service.
    // When IAM_JWT_PUBLIC_KEY (or legacy JWT_PUBLIC_KEY) is set the service uses RS256 asymmetric
    // verification. Falls back to HS256 JWT_SECRET when the public key is absent.
    secret: getEnvOptional('JWT_SECRET') ?? undefined,
    publicKey: iamJwtPublicKeyB64
      ? Buffer.from(iamJwtPublicKeyB64, 'base64').toString('utf8')
      : undefined,
    issuer: getEnvRequired('JWT_ISSUER'),
    audience: getEnvOptional('JWT_AUDIENCE') ?? 'dashboard-app',
  },

  stripe: {
    secretKey: getEnvOptional('STRIPE_SECRET_KEY') ?? undefined,
    publishableKey: getEnvOptional('STRIPE_PUBLISHABLE_KEY') ?? undefined,
    webhookSecret: getEnvOptional('STRIPE_WEBHOOK_SECRET') ?? undefined,
    apiVersion: getEnvOptional('STRIPE_API_VERSION') ?? '2024-04-10',
    enabled: getEnvOptional('STRIPE_ENABLED') === 'true',
  },

  razorpay: {
    keyId: getEnvOptional('RAZORPAY_KEY_ID') ?? undefined,
    keySecret: getEnvOptional('RAZORPAY_KEY_SECRET') ?? undefined,
    webhookSecret: getEnvOptional('RAZORPAY_WEBHOOK_SECRET') ?? undefined,
    enabled: getEnvOptional('RAZORPAY_ENABLED') === 'true',
  },

  cash: {
    // Auto-enabled when both Stripe and Razorpay are disabled.
    // Explicitly set CASH_ENABLED=true to force-enable alongside other providers.
    enabled: getEnvOptional('CASH_ENABLED') === 'true',
  },

  payment: {
    attemptExpiryMinutes: parseInt(getEnvOptional('PAYMENT_ATTEMPT_EXPIRY_MINUTES') ?? '15', 10),
    maxRetryAttempts: parseInt(getEnvOptional('MAX_RETRY_ATTEMPTS') ?? '3', 10),
    idempotencyTtlSeconds: parseInt(
      getEnvOptional('PAYMENT_IDEMPOTENCY_TTL_SECONDS') ?? '86400',
      10,
    ),
  },

  subscription: {
    gracePeriodDays: parseInt(getEnvOptional('SUBSCRIPTION_GRACE_PERIOD_DAYS') ?? '3', 10),
    maxRetryAttempts: parseInt(getEnvOptional('SUBSCRIPTION_MAX_RETRY_ATTEMPTS') ?? '3', 10),
    retryIntervalHours: parseInt(getEnvOptional('SUBSCRIPTION_RETRY_INTERVAL_HOURS') ?? '24', 10),
  },

  queues: {
    paymentConcurrency: parseInt(getEnvOptional('PAYMENT_QUEUE_CONCURRENCY') ?? '5', 10),
    refundConcurrency: parseInt(getEnvOptional('REFUND_QUEUE_CONCURRENCY') ?? '3', 10),
    subscriptionConcurrency: parseInt(getEnvOptional('SUBSCRIPTION_QUEUE_CONCURRENCY') ?? '5', 10),
  },

  features: {
    multiCurrency: getEnvOptional('FEATURE_MULTI_CURRENCY') === 'true',
    failoverEnabled: getEnvOptional('FEATURE_FAILOVER_ENABLED') !== 'false',
    reconciliationEnabled: getEnvOptional('FEATURE_RECONCILIATION_ENABLED') !== 'false',
    reconciliationCron: getEnvOptional('RECONCILIATION_CRON') ?? '0 2 * * *',
    bullmqEnabled: getEnvOptional('BULLMQ_ENABLED') !== 'false',
  },

  iam: {
    // URL of the auth/IAM service — used to fetch per-tenant platform settings.
    // Example: http://localhost:3302
    serviceUrl: getEnvOptional('IAM_SERVICE_URL') ?? '',
    // Optional API key for service-to-service calls (only needed if the IAM
    // service restricts its /settings/public endpoint in future).
    serviceApiKey: getEnvOptional('IAM_SERVICE_API_KEY') ?? '',
  },
  };
};
