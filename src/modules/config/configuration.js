"use strict";
/**
 * Centralised application configuration.
 *
 * Using @nestjs/config with a typed factory keeps env-var access type-safe
 * and validates required values at startup.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (function () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w;
    return ({
        app: {
            port: parseInt((_a = process.env.PORT) !== null && _a !== void 0 ? _a : '3000', 10),
            env: (_b = process.env.NODE_ENV) !== null && _b !== void 0 ? _b : 'development',
            prefix: (_c = process.env.API_PREFIX) !== null && _c !== void 0 ? _c : 'api/v1',
            logLevel: (_d = process.env.LOG_LEVEL) !== null && _d !== void 0 ? _d : 'info',
        },
        database: {
            url: process.env.DATABASE_URL,
        },
        redis: {
            host: (_e = process.env.REDIS_HOST) !== null && _e !== void 0 ? _e : 'localhost',
            port: parseInt((_f = process.env.REDIS_PORT) !== null && _f !== void 0 ? _f : '6379', 10),
            password: (_g = process.env.REDIS_PASSWORD) !== null && _g !== void 0 ? _g : undefined,
            db: parseInt((_h = process.env.REDIS_DB) !== null && _h !== void 0 ? _h : '0', 10),
        },
        jwt: {
            secret: process.env.JWT_SECRET,
            expiry: (_j = process.env.JWT_EXPIRY) !== null && _j !== void 0 ? _j : '15m',
            refreshSecret: process.env.JWT_REFRESH_SECRET,
            refreshExpiry: (_k = process.env.JWT_REFRESH_EXPIRY) !== null && _k !== void 0 ? _k : '7d',
        },
        stripe: {
            secretKey: process.env.STRIPE_SECRET_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            apiVersion: (_l = process.env.STRIPE_API_VERSION) !== null && _l !== void 0 ? _l : '2024-04-10',
            enabled: process.env.STRIPE_ENABLED !== 'false',
        },
        razorpay: {
            keyId: process.env.RAZORPAY_KEY_ID,
            keySecret: process.env.RAZORPAY_KEY_SECRET,
            webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
            enabled: process.env.RAZORPAY_ENABLED !== 'false',
        },
        payment: {
            attemptExpiryMinutes: parseInt((_m = process.env.PAYMENT_ATTEMPT_EXPIRY_MINUTES) !== null && _m !== void 0 ? _m : '15', 10),
            maxRetryAttempts: parseInt((_o = process.env.MAX_RETRY_ATTEMPTS) !== null && _o !== void 0 ? _o : '3', 10),
            idempotencyTtlSeconds: parseInt((_p = process.env.PAYMENT_IDEMPOTENCY_TTL_SECONDS) !== null && _p !== void 0 ? _p : '86400', 10),
        },
        subscription: {
            gracePeriodDays: parseInt((_q = process.env.SUBSCRIPTION_GRACE_PERIOD_DAYS) !== null && _q !== void 0 ? _q : '3', 10),
            maxRetryAttempts: parseInt((_r = process.env.SUBSCRIPTION_MAX_RETRY_ATTEMPTS) !== null && _r !== void 0 ? _r : '3', 10),
            retryIntervalHours: parseInt((_s = process.env.SUBSCRIPTION_RETRY_INTERVAL_HOURS) !== null && _s !== void 0 ? _s : '24', 10),
        },
        queues: {
            paymentConcurrency: parseInt((_t = process.env.PAYMENT_QUEUE_CONCURRENCY) !== null && _t !== void 0 ? _t : '5', 10),
            refundConcurrency: parseInt((_u = process.env.REFUND_QUEUE_CONCURRENCY) !== null && _u !== void 0 ? _u : '3', 10),
            subscriptionConcurrency: parseInt((_v = process.env.SUBSCRIPTION_QUEUE_CONCURRENCY) !== null && _v !== void 0 ? _v : '5', 10),
        },
        features: {
            multiCurrency: process.env.FEATURE_MULTI_CURRENCY === 'true',
            failoverEnabled: process.env.FEATURE_FAILOVER_ENABLED !== 'false',
            reconciliationEnabled: process.env.FEATURE_RECONCILIATION_ENABLED !== 'false',
            reconciliationCron: (_w = process.env.RECONCILIATION_CRON) !== null && _w !== void 0 ? _w : '0 2 * * *',
        },
    });
});
