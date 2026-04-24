"use strict";
/**
 * PaymentProviderFactory
 *
 * Resolves the correct IPaymentProvider implementation at runtime based on
 * the Provider enum value. This decouples the orchestrator from concrete
 * provider classes.
 *
 * Failover strategy:
 *  When featureFailoverEnabled is true, if the primary provider's
 *  createPayment throws, the factory falls back to the next available provider.
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
exports.PaymentProviderFactory = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var PaymentProviderFactory = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var PaymentProviderFactory = _classThis = /** @class */ (function () {
        function PaymentProviderFactory_1(stripeProvider, razorpayProvider, config) {
            this.stripeProvider = stripeProvider;
            this.razorpayProvider = razorpayProvider;
            this.config = config;
            this.logger = new common_1.Logger(PaymentProviderFactory.name);
            this.providerMap = new Map();
            if (config.stripeEnabled)
                this.providerMap.set(client_1.Provider.STRIPE, stripeProvider);
            if (config.razorpayEnabled)
                this.providerMap.set(client_1.Provider.RAZORPAY, razorpayProvider);
        }
        /** Get a specific provider by name. Throws if disabled. */
        PaymentProviderFactory_1.prototype.get = function (provider) {
            var instance = this.providerMap.get(provider);
            if (!instance) {
                throw new common_1.BadRequestException("Payment provider ".concat(provider, " is not enabled"));
            }
            return instance;
        };
        /** Returns all enabled providers in priority order. */
        PaymentProviderFactory_1.prototype.getAll = function () {
            return Array.from(this.providerMap.values());
        };
        /** Returns enabled provider names for constructing the options response. */
        PaymentProviderFactory_1.prototype.getEnabledProviders = function () {
            return Array.from(this.providerMap.keys());
        };
        PaymentProviderFactory_1.prototype.isEnabled = function (provider) {
            return this.providerMap.has(provider);
        };
        return PaymentProviderFactory_1;
    }());
    __setFunctionName(_classThis, "PaymentProviderFactory");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PaymentProviderFactory = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PaymentProviderFactory = _classThis;
}();
exports.PaymentProviderFactory = PaymentProviderFactory;
