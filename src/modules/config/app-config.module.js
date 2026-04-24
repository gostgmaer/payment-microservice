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
exports.AppConfigModule = void 0;
var common_1 = require("@nestjs/common");
var config_1 = require("@nestjs/config");
var Joi = require("joi");
var configuration_1 = require("./configuration");
var app_config_service_1 = require("./app-config.service");
/**
 * Global config module — validates required env vars at startup.
 * Joi schema prevents the app from booting with missing/invalid configuration.
 */
var AppConfigModule = function () {
    var _classDecorators = [(0, common_1.Global)(), (0, common_1.Module)({
            imports: [
                config_1.ConfigModule.forRoot({
                    isGlobal: true,
                    load: [configuration_1.default],
                    validationSchema: Joi.object({
                        NODE_ENV: Joi.string().valid('development', 'test', 'staging', 'production').default('development'),
                        PORT: Joi.number().default(3000),
                        DATABASE_URL: Joi.string().required(),
                        REDIS_HOST: Joi.string().default('localhost'),
                        REDIS_PORT: Joi.number().default(6379),
                        JWT_SECRET: Joi.string().min(32).required(),
                        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
                        STRIPE_SECRET_KEY: Joi.string().when('STRIPE_ENABLED', {
                            is: 'true',
                            then: Joi.required(),
                        }),
                        STRIPE_WEBHOOK_SECRET: Joi.string().when('STRIPE_ENABLED', {
                            is: 'true',
                            then: Joi.required(),
                        }),
                        RAZORPAY_KEY_ID: Joi.string().when('RAZORPAY_ENABLED', {
                            is: 'true',
                            then: Joi.required(),
                        }),
                        RAZORPAY_KEY_SECRET: Joi.string().when('RAZORPAY_ENABLED', {
                            is: 'true',
                            then: Joi.required(),
                        }),
                        RAZORPAY_WEBHOOK_SECRET: Joi.string().when('RAZORPAY_ENABLED', {
                            is: 'true',
                            then: Joi.required(),
                        }),
                    }),
                    validationOptions: { abortEarly: false },
                }),
            ],
            providers: [app_config_service_1.AppConfigService],
            exports: [app_config_service_1.AppConfigService],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AppConfigModule = _classThis = /** @class */ (function () {
        function AppConfigModule_1() {
        }
        return AppConfigModule_1;
    }());
    __setFunctionName(_classThis, "AppConfigModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AppConfigModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AppConfigModule = _classThis;
}();
exports.AppConfigModule = AppConfigModule;
