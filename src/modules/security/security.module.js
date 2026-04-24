"use strict";
/**
 * Security Module
 *
 * Provides:
 *  - JWT strategy + guard
 *  - API Key guard (for service-to-service auth)
 *  - IdempotencyService (Redis-backed key check)
 *  - Redis client (shared across the app via REDIS_CLIENT token)
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
exports.SecurityModule = void 0;
var common_1 = require("@nestjs/common");
var jwt_1 = require("@nestjs/jwt");
var passport_1 = require("@nestjs/passport");
var ioredis_1 = require("ioredis");
var app_config_service_1 = require("../config/app-config.service");
var jwt_strategy_1 = require("./strategies/jwt.strategy");
var jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
var api_key_guard_1 = require("../../common/guards/api-key.guard");
var idempotency_service_1 = require("./services/idempotency.service");
var idempotency_interceptor_1 = require("../../common/interceptors/idempotency.interceptor");
var SecurityModule = function () {
    var _classDecorators = [(0, common_1.Global)(), (0, common_1.Module)({
            imports: [
                passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
                jwt_1.JwtModule.registerAsync({
                    inject: [app_config_service_1.AppConfigService],
                    useFactory: function (config) { return ({
                        secret: config.jwtSecret,
                        signOptions: { expiresIn: config.jwtExpiry },
                    }); },
                }),
            ],
            providers: [
                jwt_strategy_1.JwtStrategy,
                jwt_auth_guard_1.JwtAuthGuard,
                api_key_guard_1.ApiKeyGuard,
                idempotency_service_1.IdempotencyService,
                {
                    // Shared Redis client — exported globally so BullMQ, idempotency, etc.
                    // all use the same connection pool.
                    provide: idempotency_interceptor_1.REDIS_CLIENT,
                    inject: [app_config_service_1.AppConfigService],
                    useFactory: function (config) {
                        var client = new ioredis_1.default({
                            host: config.redisHost,
                            port: config.redisPort,
                            password: config.redisPassword,
                            db: config.redisDb,
                            maxRetriesPerRequest: null, // required by BullMQ
                            enableReadyCheck: false,
                            lazyConnect: false,
                        });
                        client.on('connect', function () { return console.log('[Redis] Connected'); });
                        client.on('error', function (err) { return console.error('[Redis] Error:', err.message); });
                        return client;
                    },
                },
            ],
            exports: [jwt_1.JwtModule, jwt_auth_guard_1.JwtAuthGuard, api_key_guard_1.ApiKeyGuard, idempotency_service_1.IdempotencyService, idempotency_interceptor_1.REDIS_CLIENT],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var SecurityModule = _classThis = /** @class */ (function () {
        function SecurityModule_1() {
        }
        return SecurityModule_1;
    }());
    __setFunctionName(_classThis, "SecurityModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SecurityModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SecurityModule = _classThis;
}();
exports.SecurityModule = SecurityModule;
