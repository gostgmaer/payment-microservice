"use strict";
/**
 * Idempotency Interceptor
 *
 * Prevents duplicate processing of the same request (e.g. network retries).
 *
 * Algorithm:
 *  1. Read `Idempotency-Key` header.
 *  2. Hash it with SHA-256.
 *  3. Check Redis for an existing response.
 *     - If found → return the cached response (HTTP 200 with `X-Idempotent-Replayed: true`).
 *     - If not → proceed, then cache the response in Redis with TTL.
 *
 * Only applies to POST/PATCH requests (state-mutating operations).
 * GET/DELETE are inherently idempotent and skipped.
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdempotencyInterceptor = exports.REDIS_CLIENT = void 0;
var common_1 = require("@nestjs/common");
var rxjs_1 = require("rxjs");
var operators_1 = require("rxjs/operators");
var crypto_util_1 = require("../utils/crypto.util");
exports.REDIS_CLIENT = 'REDIS_CLIENT';
var IDEMPOTENCY_PREFIX = 'idempotency:';
var DEFAULT_TTL_SECONDS = 86400; // 24 hours
var IdempotencyInterceptor = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var IdempotencyInterceptor = _classThis = /** @class */ (function () {
        function IdempotencyInterceptor_1(redis, ttlSeconds) {
            if (ttlSeconds === void 0) { ttlSeconds = DEFAULT_TTL_SECONDS; }
            this.redis = redis;
            this.ttlSeconds = ttlSeconds;
        }
        IdempotencyInterceptor_1.prototype.intercept = function (context, next) {
            return __awaiter(this, void 0, void 0, function () {
                var request, method, idempotencyKey, hashedKey, redisKey, cached, response, parsed, lockKey, acquired;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            request = context.switchToHttp().getRequest();
                            method = request.method;
                            // Only guard state-mutating methods
                            if (!['POST', 'PATCH', 'PUT'].includes(method)) {
                                return [2 /*return*/, next.handle()];
                            }
                            idempotencyKey = request.headers['idempotency-key'];
                            if (!idempotencyKey) {
                                return [2 /*return*/, next.handle()];
                            }
                            hashedKey = (0, crypto_util_1.hashIdempotencyKey)(idempotencyKey);
                            redisKey = "".concat(IDEMPOTENCY_PREFIX).concat(hashedKey);
                            return [4 /*yield*/, this.redis.get(redisKey)];
                        case 1:
                            cached = _a.sent();
                            if (cached) {
                                response = context.switchToHttp().getResponse();
                                response.setHeader('X-Idempotent-Replayed', 'true');
                                parsed = JSON.parse(cached);
                                // If it was an error, re-throw it
                                if (parsed.__isError) {
                                    throw new common_1.HttpException(parsed.body, parsed.statusCode);
                                }
                                return [2 /*return*/, (0, rxjs_1.of)(parsed.body)];
                            }
                            lockKey = "".concat(IDEMPOTENCY_PREFIX, "lock:").concat(hashedKey);
                            return [4 /*yield*/, this.redis.set(lockKey, '1', 'EX', 30, 'NX')];
                        case 2:
                            acquired = _a.sent();
                            if (!acquired) {
                                throw new common_1.HttpException({ message: 'A request with this idempotency key is currently processing', errorCode: 'IDEMPOTENCY_CONFLICT' }, common_1.HttpStatus.CONFLICT);
                            }
                            return [2 /*return*/, next.handle().pipe((0, operators_1.tap)({
                                    next: function (responseBody) { return __awaiter(_this, void 0, void 0, function () {
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0: 
                                                // Cache successful response
                                                return [4 /*yield*/, this.redis.set(redisKey, JSON.stringify({ body: responseBody, statusCode: 200 }), 'EX', this.ttlSeconds)];
                                                case 1:
                                                    // Cache successful response
                                                    _a.sent();
                                                    return [4 /*yield*/, this.redis.del(lockKey)];
                                                case 2:
                                                    _a.sent();
                                                    return [2 /*return*/];
                                            }
                                        });
                                    }); },
                                    error: function (err) { return __awaiter(_this, void 0, void 0, function () {
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    if (!(err instanceof common_1.HttpException && err.getStatus() < 500)) return [3 /*break*/, 2];
                                                    return [4 /*yield*/, this.redis.set(redisKey, JSON.stringify({ __isError: true, body: err.getResponse(), statusCode: err.getStatus() }), 'EX', 300)];
                                                case 1:
                                                    _a.sent();
                                                    _a.label = 2;
                                                case 2: return [4 /*yield*/, this.redis.del(lockKey)];
                                                case 3:
                                                    _a.sent();
                                                    return [2 /*return*/];
                                            }
                                        });
                                    }); },
                                }))];
                    }
                });
            });
        };
        return IdempotencyInterceptor_1;
    }());
    __setFunctionName(_classThis, "IdempotencyInterceptor");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        IdempotencyInterceptor = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return IdempotencyInterceptor = _classThis;
}();
exports.IdempotencyInterceptor = IdempotencyInterceptor;
