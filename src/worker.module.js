"use strict";
/**
 * WorkerModule — minimal NestJS module for standalone BullMQ workers.
 * Contains only the modules needed for queue processing (no HTTP, no Swagger).
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
exports.WorkerModule = void 0;
var common_1 = require("@nestjs/common");
var nestjs_pino_1 = require("nestjs-pino");
var app_config_module_1 = require("./modules/config/app-config.module");
var prisma_module_1 = require("./prisma/prisma.module");
var security_module_1 = require("./modules/security/security.module");
var audit_module_1 = require("./modules/audit/audit.module");
var ledger_module_1 = require("./modules/ledger/ledger.module");
var events_module_1 = require("./modules/events/events.module");
var payment_provider_module_1 = require("./modules/payment/provider/payment-provider.module");
var transaction_module_1 = require("./modules/payment/transaction/transaction.module");
var payment_attempt_module_1 = require("./modules/payment/attempt/payment-attempt.module");
var payment_orchestrator_module_1 = require("./modules/payment/orchestrator/payment-orchestrator.module");
var billing_module_1 = require("./modules/billing/billing.module");
var subscription_module_1 = require("./modules/subscription/subscription.module");
var WorkerModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [
                app_config_module_1.AppConfigModule,
                nestjs_pino_1.LoggerModule.forRoot({ pinoHttp: { level: 'info' } }),
                prisma_module_1.PrismaModule,
                security_module_1.SecurityModule,
                audit_module_1.AuditModule,
                ledger_module_1.LedgerModule,
                payment_provider_module_1.PaymentProviderModule,
                transaction_module_1.TransactionModule,
                payment_attempt_module_1.PaymentAttemptModule,
                payment_orchestrator_module_1.PaymentOrchestratorModule,
                billing_module_1.BillingModule,
                subscription_module_1.SubscriptionModule,
                events_module_1.EventsModule,
            ],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var WorkerModule = _classThis = /** @class */ (function () {
        function WorkerModule_1() {
        }
        return WorkerModule_1;
    }());
    __setFunctionName(_classThis, "WorkerModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WorkerModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WorkerModule = _classThis;
}();
exports.WorkerModule = WorkerModule;
