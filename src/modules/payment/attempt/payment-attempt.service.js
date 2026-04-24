"use strict";
/**
 * PaymentAttemptService
 *
 * Manages individual payment attempts (one per provider per transaction).
 *
 * Rules enforced here:
 *  - Only ONE attempt can have status SUCCESS per transaction (also backed
 *    by a partial unique index in the DB — this is a defense-in-depth check).
 *  - Expired attempts are EXPIRED automatically after the configured TTL.
 *  - Concurrent attempt updates use SELECT … FOR UPDATE.
 */
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
exports.PaymentAttemptService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var error_codes_constant_1 = require("../../../common/constants/error-codes.constant");
var dayjs_1 = require("dayjs");
var PaymentAttemptService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var PaymentAttemptService = _classThis = /** @class */ (function () {
        function PaymentAttemptService_1(prisma, config) {
            this.prisma = prisma;
            this.config = config;
            this.logger = new common_1.Logger(PaymentAttemptService.name);
        }
        PaymentAttemptService_1.prototype.create = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var expiresAt;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    expiresAt = (0, dayjs_1.default)()
                        .add(this.config.attemptExpiryMinutes, 'minute')
                        .toDate();
                    return [2 /*return*/, this.prisma.paymentAttempt.create({
                            data: {
                                transactionId: dto.transactionId,
                                provider: dto.provider,
                                method: dto.method,
                                providerOrderId: (_a = dto.providerOrderId) !== null && _a !== void 0 ? _a : null,
                                clientSecret: (_b = dto.clientSecret) !== null && _b !== void 0 ? _b : null,
                                amount: dto.amount,
                                currency: dto.currency,
                                status: client_1.AttemptStatus.PENDING,
                                expiresAt: expiresAt,
                                metadata: (_c = dto.metadata) !== null && _c !== void 0 ? _c : client_1.Prisma.JsonNull,
                            },
                        })];
                });
            });
        };
        PaymentAttemptService_1.prototype.findById = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var attempt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.paymentAttempt.findUnique({ where: { id: id } })];
                        case 1:
                            attempt = _a.sent();
                            if (!attempt)
                                throw new common_1.NotFoundException({ message: 'Payment attempt not found', errorCode: error_codes_constant_1.ERROR_CODES.PAYMENT_NOT_FOUND });
                            return [2 /*return*/, attempt];
                    }
                });
            });
        };
        PaymentAttemptService_1.prototype.findByProviderOrderId = function (providerOrderId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.paymentAttempt.findFirst({ where: { providerOrderId: providerOrderId } })];
                });
            });
        };
        PaymentAttemptService_1.prototype.findByTransaction = function (transactionId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.paymentAttempt.findMany({
                            where: { transactionId: transactionId },
                            orderBy: { createdAt: 'desc' },
                        })];
                });
            });
        };
        /** Find the single SUCCESS attempt for a transaction. */
        PaymentAttemptService_1.prototype.findSuccessAttempt = function (transactionId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.paymentAttempt.findFirst({
                            where: { transactionId: transactionId, status: client_1.AttemptStatus.SUCCESS },
                        })];
                });
            });
        };
        /**
         * Mark an attempt as SUCCESS.
         * Validates that no other attempt for this transaction has already succeeded.
         * This is the application-level guard; the DB partial unique index is the
         * final backstop.
         */
        PaymentAttemptService_1.prototype.markSuccess = function (id, tx) {
            return __awaiter(this, void 0, void 0, function () {
                var attempt, existingSuccess;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: 
                        // Lock row for update
                        return [4 /*yield*/, tx.$executeRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT id FROM \"PaymentAttempt\" WHERE id = ", " FOR UPDATE"], ["SELECT id FROM \"PaymentAttempt\" WHERE id = ", " FOR UPDATE"])), id)];
                        case 1:
                            // Lock row for update
                            _a.sent();
                            return [4 /*yield*/, tx.paymentAttempt.findUniqueOrThrow({ where: { id: id } })];
                        case 2:
                            attempt = _a.sent();
                            if (attempt.status === client_1.AttemptStatus.SUCCESS) {
                                return [2 /*return*/, attempt]; // idempotent
                            }
                            return [4 /*yield*/, tx.paymentAttempt.findFirst({
                                    where: { transactionId: attempt.transactionId, status: client_1.AttemptStatus.SUCCESS },
                                })];
                        case 3:
                            existingSuccess = _a.sent();
                            if (existingSuccess) {
                                throw new common_1.ConflictException({
                                    message: 'A successful payment attempt already exists for this transaction',
                                    errorCode: error_codes_constant_1.ERROR_CODES.PAYMENT_ALREADY_SUCCEEDED,
                                });
                            }
                            return [2 /*return*/, tx.paymentAttempt.update({
                                    where: { id: id },
                                    data: { status: client_1.AttemptStatus.SUCCESS },
                                })];
                    }
                });
            });
        };
        PaymentAttemptService_1.prototype.markFailed = function (id, reason, tx) {
            return __awaiter(this, void 0, void 0, function () {
                var client;
                return __generator(this, function (_a) {
                    client = tx !== null && tx !== void 0 ? tx : this.prisma;
                    return [2 /*return*/, client.paymentAttempt.update({
                            where: { id: id },
                            data: { status: client_1.AttemptStatus.FAILED, failureReason: reason },
                        })];
                });
            });
        };
        PaymentAttemptService_1.prototype.markExpired = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.paymentAttempt.update({
                            where: { id: id },
                            data: { status: client_1.AttemptStatus.EXPIRED },
                        })];
                });
            });
        };
        /** Expire all PENDING/PROCESSING attempts whose TTL has passed. */
        PaymentAttemptService_1.prototype.expireStalePendingAttempts = function () {
            return __awaiter(this, void 0, void 0, function () {
                var result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.paymentAttempt.updateMany({
                                where: {
                                    status: { in: [client_1.AttemptStatus.PENDING, client_1.AttemptStatus.PROCESSING] },
                                    expiresAt: { lt: new Date() },
                                },
                                data: { status: client_1.AttemptStatus.EXPIRED },
                            })];
                        case 1:
                            result = _a.sent();
                            return [2 /*return*/, result.count];
                    }
                });
            });
        };
        return PaymentAttemptService_1;
    }());
    __setFunctionName(_classThis, "PaymentAttemptService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PaymentAttemptService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PaymentAttemptService = _classThis;
}();
exports.PaymentAttemptService = PaymentAttemptService;
var templateObject_1;
