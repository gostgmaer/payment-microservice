"use strict";
/**
 * EventsModule
 *
 * BullMQ configuration for all async queues.
 *
 * Queue design:
 *  - Separate queues for payments, refunds, and subscriptions → independent scaling.
 *  - All queues share the same Redis connection pool.
 *  - Dead-letter simulation: failed jobs after maxAttempts stay in "failed"
 *    state in Redis and can be retried or inspected via Bull Board.
 *
 * Retry strategy (per queue):
 *  - Payment:      3 attempts, exponential backoff (1s, 2s, 4s)
 *  - Refund:       3 attempts, linear backoff (10s, 10s, 10s)
 *  - Subscription: 3 attempts, 24h apart (grace period logic)
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
exports.EventsModule = void 0;
var common_1 = require("@nestjs/common");
var bullmq_1 = require("@nestjs/bullmq");
var app_config_service_1 = require("../config/app-config.service");
var queue_names_constant_1 = require("../../common/constants/queue-names.constant");
var payment_processor_1 = require("./processors/payment.processor");
var subscription_renewal_processor_1 = require("./processors/subscription-renewal.processor");
var payment_orchestrator_module_1 = require("../payment/orchestrator/payment-orchestrator.module");
var payment_attempt_module_1 = require("../payment/attempt/payment-attempt.module");
var subscription_module_1 = require("../subscription/subscription.module");
var EventsModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [
                // Register BullMQ queues
                bullmq_1.BullModule.forRootAsync({
                    inject: [app_config_service_1.AppConfigService],
                    useFactory: function (config) { return ({
                        connection: {
                            host: config.redisHost,
                            port: config.redisPort,
                            password: config.redisPassword,
                            db: config.redisDb,
                            maxRetriesPerRequest: null,
                            enableReadyCheck: false,
                        },
                        defaultJobOptions: {
                            removeOnComplete: { count: 1000 }, // keep last 1000 completed jobs
                            removeOnFail: { count: 5000 }, // keep last 5000 failed jobs (for inspection)
                        },
                    }); },
                }),
                bullmq_1.BullModule.registerQueue({
                    name: queue_names_constant_1.QUEUE_NAMES.PAYMENT_PROCESSING,
                    defaultJobOptions: {
                        attempts: 3,
                        backoff: { type: 'exponential', delay: 1000 },
                        removeOnComplete: { count: 500 },
                    },
                }),
                bullmq_1.BullModule.registerQueue({
                    name: queue_names_constant_1.QUEUE_NAMES.SUBSCRIPTION_RENEWAL,
                    defaultJobOptions: {
                        attempts: 3,
                        // 24 hour backoff to match grace period logic
                        backoff: { type: 'fixed', delay: 24 * 60 * 60 * 1000 },
                        removeOnComplete: { count: 200 },
                    },
                }),
                bullmq_1.BullModule.registerQueue({
                    name: queue_names_constant_1.QUEUE_NAMES.REFUND_PROCESSING,
                    defaultJobOptions: {
                        attempts: 3,
                        backoff: { type: 'fixed', delay: 10000 },
                    },
                }),
                // Feature modules (forwardRef breaks circular dependencies)
                (0, common_1.forwardRef)(function () { return payment_orchestrator_module_1.PaymentOrchestratorModule; }),
                payment_attempt_module_1.PaymentAttemptModule,
                (0, common_1.forwardRef)(function () { return subscription_module_1.SubscriptionModule; }),
            ],
            providers: [
                payment_processor_1.PaymentProcessor,
                subscription_renewal_processor_1.SubscriptionRenewalProcessor,
            ],
            exports: [bullmq_1.BullModule],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var EventsModule = _classThis = /** @class */ (function () {
        function EventsModule_1() {
        }
        return EventsModule_1;
    }());
    __setFunctionName(_classThis, "EventsModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        EventsModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return EventsModule = _classThis;
}();
exports.EventsModule = EventsModule;
