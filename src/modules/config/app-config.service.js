"use strict";
/**
 * AppConfigService — typed accessor for all configuration values.
 *
 * Centralises config access so feature modules never call ConfigService
 * directly with magic strings.
 */
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfigService = void 0;
var common_1 = require("@nestjs/common");
var AppConfigService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AppConfigService = _classThis = /** @class */ (function () {
        function AppConfigService_1(config) {
            this.config = config;
        }
        Object.defineProperty(AppConfigService_1.prototype, "port", {
            // ── App ──────────────────────────────────────────────────────────────────
            get: function () { return this.config.get('app.port', 3000); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "env", {
            get: function () { return this.config.get('app.env', 'development'); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "isProduction", {
            get: function () { return this.env === 'production'; },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "logLevel", {
            get: function () { return this.config.get('app.logLevel', 'info'); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "redisHost", {
            // ── Redis ────────────────────────────────────────────────────────────────
            get: function () { return this.config.get('redis.host', 'localhost'); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "redisPort", {
            get: function () { return this.config.get('redis.port', 6379); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "redisPassword", {
            get: function () {
                return this.config.get('redis.password');
            },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "redisDb", {
            get: function () { return this.config.get('redis.db', 0); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "jwtSecret", {
            // ── JWT ──────────────────────────────────────────────────────────────────
            get: function () { return this.config.getOrThrow('jwt.secret'); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "jwtExpiry", {
            get: function () { return this.config.get('jwt.expiry', '15m'); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "stripeSecretKey", {
            // ── Stripe ───────────────────────────────────────────────────────────────
            get: function () { return this.config.getOrThrow('stripe.secretKey'); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "stripeWebhookSecret", {
            get: function () { return this.config.getOrThrow('stripe.webhookSecret'); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "stripeApiVersion", {
            get: function () { return this.config.get('stripe.apiVersion', '2024-04-10'); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "stripeEnabled", {
            get: function () { return this.config.get('stripe.enabled', true); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "razorpayKeyId", {
            // ── Razorpay ─────────────────────────────────────────────────────────────
            get: function () { return this.config.getOrThrow('razorpay.keyId'); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "razorpayKeySecret", {
            get: function () { return this.config.getOrThrow('razorpay.keySecret'); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "razorpayWebhookSecret", {
            get: function () { return this.config.getOrThrow('razorpay.webhookSecret'); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "razorpayEnabled", {
            get: function () { return this.config.get('razorpay.enabled', true); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "attemptExpiryMinutes", {
            // ── Payment ──────────────────────────────────────────────────────────────
            get: function () { return this.config.get('payment.attemptExpiryMinutes', 15); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "maxRetryAttempts", {
            get: function () { return this.config.get('payment.maxRetryAttempts', 3); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "idempotencyTtlSeconds", {
            get: function () { return this.config.get('payment.idempotencyTtlSeconds', 86400); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "gracePeriodDays", {
            // ── Subscription ─────────────────────────────────────────────────────────
            get: function () { return this.config.get('subscription.gracePeriodDays', 3); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "subscriptionMaxRetries", {
            get: function () { return this.config.get('subscription.maxRetryAttempts', 3); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "paymentQueueConcurrency", {
            // ── Queue concurrency ────────────────────────────────────────────────────
            get: function () { return this.config.get('queues.paymentConcurrency', 5); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "refundQueueConcurrency", {
            get: function () { return this.config.get('queues.refundConcurrency', 3); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "subscriptionQueueConcurrency", {
            get: function () { return this.config.get('queues.subscriptionConcurrency', 5); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "featureFailoverEnabled", {
            // ── Feature flags ────────────────────────────────────────────────────────
            get: function () { return this.config.get('features.failoverEnabled', true); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "featureReconciliationEnabled", {
            get: function () { return this.config.get('features.reconciliationEnabled', true); },
            enumerable: false,
            configurable: true
        });
        Object.defineProperty(AppConfigService_1.prototype, "reconciliationCron", {
            get: function () { return this.config.get('features.reconciliationCron', '0 2 * * *'); },
            enumerable: false,
            configurable: true
        });
        return AppConfigService_1;
    }());
    __setFunctionName(_classThis, "AppConfigService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AppConfigService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AppConfigService = _classThis;
}();
exports.AppConfigService = AppConfigService;
