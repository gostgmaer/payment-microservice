"use strict";
/**
 * Root Application Module
 *
 * Wires together all feature modules. Each module is kept strictly independent
 * — cross-module communication happens exclusively through injected services
 * (no direct repository access across module boundaries).
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
exports.AppModule = void 0;
var common_1 = require("@nestjs/common");
var core_1 = require("@nestjs/core");
var throttler_1 = require("@nestjs/throttler");
var nestjs_pino_1 = require("nestjs-pino");
// Infrastructure
var app_config_module_1 = require("./modules/config/app-config.module");
var prisma_module_1 = require("./prisma/prisma.module");
// Cross-cutting
var security_module_1 = require("./modules/security/security.module");
var audit_module_1 = require("./modules/audit/audit.module");
var events_module_1 = require("./modules/events/events.module");
var health_module_1 = require("./modules/health/health.module");
// Payment domain
var payment_orchestrator_module_1 = require("./modules/payment/orchestrator/payment-orchestrator.module");
var transaction_module_1 = require("./modules/payment/transaction/transaction.module");
var payment_attempt_module_1 = require("./modules/payment/attempt/payment-attempt.module");
var payment_provider_module_1 = require("./modules/payment/provider/payment-provider.module");
var webhook_module_1 = require("./modules/payment/webhook/webhook.module");
var refund_module_1 = require("./modules/payment/refund/refund.module");
var ledger_module_1 = require("./modules/ledger/ledger.module");
// Business domain
var billing_module_1 = require("./modules/billing/billing.module");
var subscription_module_1 = require("./modules/subscription/subscription.module");
// Common
var global_exception_filter_1 = require("./common/filters/global-exception.filter");
var correlation_id_interceptor_1 = require("./common/interceptors/correlation-id.interceptor");
var logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
var config_1 = require("@nestjs/config");
var AppModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [
                // ── Config (must be first) ──────────────────────────────────────────
                app_config_module_1.AppConfigModule,
                // ── Structured logging ──────────────────────────────────────────────
                nestjs_pino_1.LoggerModule.forRootAsync({
                    inject: [config_1.ConfigService],
                    useFactory: function (config) { return ({
                        pinoHttp: {
                            level: config.get('LOG_LEVEL', 'info'),
                            // Redact sensitive fields from logs
                            redact: {
                                paths: [
                                    'req.headers.authorization',
                                    'req.headers["x-api-key"]',
                                    'req.body.cardNumber',
                                    'req.body.cvv',
                                    '*.clientSecret',
                                ],
                                remove: true,
                            },
                            transport: config.get('NODE_ENV') !== 'production'
                                ? { target: 'pino-pretty', options: { colorize: true, singleLine: false } }
                                : undefined,
                            customProps: function () { return ({ service: 'payment-microservice' }); },
                            // Attach correlation ID from header if present
                            genReqId: function (req) { var _a; return (_a = req.headers['x-correlation-id']) !== null && _a !== void 0 ? _a : crypto.randomUUID(); },
                        },
                    }); },
                }),
                // ── Rate limiting ───────────────────────────────────────────────────
                throttler_1.ThrottlerModule.forRootAsync({
                    inject: [config_1.ConfigService],
                    useFactory: function (config) { return ({
                        throttlers: [
                            {
                                ttl: config.get('RATE_LIMIT_TTL_SECONDS', 60) * 1000,
                                limit: config.get('RATE_LIMIT_MAX_REQUESTS', 100),
                            },
                        ],
                    }); },
                }),
                // ── Infrastructure ──────────────────────────────────────────────────
                prisma_module_1.PrismaModule,
                // ── Cross-cutting ───────────────────────────────────────────────────
                security_module_1.SecurityModule,
                audit_module_1.AuditModule,
                events_module_1.EventsModule,
                health_module_1.HealthModule,
                // ── Payment domain ──────────────────────────────────────────────────
                payment_provider_module_1.PaymentProviderModule,
                transaction_module_1.TransactionModule,
                payment_attempt_module_1.PaymentAttemptModule,
                ledger_module_1.LedgerModule,
                webhook_module_1.WebhookModule,
                refund_module_1.RefundModule,
                payment_orchestrator_module_1.PaymentOrchestratorModule,
                // ── Business domain ─────────────────────────────────────────────────
                billing_module_1.BillingModule,
                subscription_module_1.SubscriptionModule,
            ],
            providers: [
                // Global exception filter — structured error responses + logging
                { provide: core_1.APP_FILTER, useClass: global_exception_filter_1.GlobalExceptionFilter },
                // Correlation ID injection into every request
                { provide: core_1.APP_INTERCEPTOR, useClass: correlation_id_interceptor_1.CorrelationIdInterceptor },
                // Request/response logging interceptor
                { provide: core_1.APP_INTERCEPTOR, useClass: logging_interceptor_1.LoggingInterceptor },
                // Global rate-limit guard
                { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            ],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AppModule = _classThis = /** @class */ (function () {
        function AppModule_1() {
        }
        return AppModule_1;
    }());
    __setFunctionName(_classThis, "AppModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AppModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AppModule = _classThis;
}();
exports.AppModule = AppModule;
