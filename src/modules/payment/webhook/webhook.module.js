"use strict";
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
exports.WebhookModule = void 0;
var common_1 = require("@nestjs/common");
var webhook_service_1 = require("./webhook.service");
var webhook_controller_1 = require("./webhook.controller");
var payment_provider_module_1 = require("../provider/payment-provider.module");
var payment_attempt_module_1 = require("../attempt/payment-attempt.module");
var audit_module_1 = require("../../audit/audit.module");
// PaymentOrchestratorModule is imported lazily via forwardRef to break
// circular dependency (Orchestrator → Webhook → Orchestrator).
var common_2 = require("@nestjs/common");
var payment_orchestrator_module_1 = require("../orchestrator/payment-orchestrator.module");
var WebhookModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [
                payment_provider_module_1.PaymentProviderModule,
                payment_attempt_module_1.PaymentAttemptModule,
                audit_module_1.AuditModule,
                (0, common_2.forwardRef)(function () { return payment_orchestrator_module_1.PaymentOrchestratorModule; }),
            ],
            controllers: [webhook_controller_1.WebhookController],
            providers: [webhook_service_1.WebhookService],
            exports: [webhook_service_1.WebhookService],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var WebhookModule = _classThis = /** @class */ (function () {
        function WebhookModule_1() {
        }
        return WebhookModule_1;
    }());
    __setFunctionName(_classThis, "WebhookModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WebhookModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WebhookModule = _classThis;
}();
exports.WebhookModule = WebhookModule;
