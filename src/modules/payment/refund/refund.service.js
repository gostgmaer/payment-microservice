"use strict";
/**
 * RefundService
 *
 * Handles refund creation and processing.
 *
 * Rules:
 *  - Can only refund a SUCCESS transaction.
 *  - Total refunded amount cannot exceed original transaction amount.
 *  - Each refund is processed via the provider that received the original payment.
 *  - Creates ledger entries for the refund (reverse accounting).
 *  - Idempotent: same idempotencyKey returns existing refund.
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
exports.RefundService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var crypto_util_1 = require("../../../common/utils/crypto.util");
var error_codes_constant_1 = require("../../../common/constants/error-codes.constant");
var RefundService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var RefundService = _classThis = /** @class */ (function () {
        function RefundService_1(prisma, transactionService, attemptService, providerFactory, ledgerService, auditService) {
            this.prisma = prisma;
            this.transactionService = transactionService;
            this.attemptService = attemptService;
            this.providerFactory = providerFactory;
            this.ledgerService = ledgerService;
            this.auditService = auditService;
            this.logger = new common_1.Logger(RefundService.name);
        }
        RefundService_1.prototype.createRefund = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var hashedKey, existingRefund, transaction, existingRefunds, alreadyRefunded, available, successAttempt, refund, provider, providerResult_1, err_1;
                var _this = this;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            hashedKey = (0, crypto_util_1.hashIdempotencyKey)(dto.idempotencyKey);
                            return [4 /*yield*/, this.prisma.refund.findFirst({
                                    where: { transactionId: dto.transactionId, metadata: { path: ['idempotencyKey'], equals: hashedKey } },
                                })];
                        case 1:
                            existingRefund = _b.sent();
                            if (existingRefund)
                                return [2 /*return*/, existingRefund];
                            return [4 /*yield*/, this.transactionService.findById(dto.transactionId)];
                        case 2:
                            transaction = _b.sent();
                            if (transaction.status !== client_1.TransactionStatus.SUCCESS &&
                                transaction.status !== client_1.TransactionStatus.PARTIALLY_REFUNDED) {
                                throw new common_1.BadRequestException({
                                    message: 'Only successful transactions can be refunded',
                                    errorCode: error_codes_constant_1.ERROR_CODES.REFUND_NOT_ELIGIBLE,
                                });
                            }
                            return [4 /*yield*/, this.prisma.refund.aggregate({
                                    where: { transactionId: dto.transactionId, status: client_1.RefundStatus.SUCCESS },
                                    _sum: { amount: true },
                                })];
                        case 3:
                            existingRefunds = _b.sent();
                            alreadyRefunded = (_a = existingRefunds._sum.amount) !== null && _a !== void 0 ? _a : 0n;
                            available = transaction.amount - alreadyRefunded;
                            if (dto.amount > available) {
                                throw new common_1.BadRequestException({
                                    message: "Refund amount (".concat(dto.amount, ") exceeds available amount (").concat(available, ")"),
                                    errorCode: error_codes_constant_1.ERROR_CODES.REFUND_EXCEEDS_AMOUNT,
                                });
                            }
                            return [4 /*yield*/, this.attemptService.findSuccessAttempt(dto.transactionId)];
                        case 4:
                            successAttempt = _b.sent();
                            if (!(successAttempt === null || successAttempt === void 0 ? void 0 : successAttempt.providerOrderId)) {
                                throw new common_1.BadRequestException({
                                    message: 'Cannot find provider payment ID for refund',
                                    errorCode: error_codes_constant_1.ERROR_CODES.REFUND_NOT_ELIGIBLE,
                                });
                            }
                            return [4 /*yield*/, this.prisma.refund.create({
                                    data: {
                                        transactionId: dto.transactionId,
                                        amount: dto.amount,
                                        currency: transaction.currency,
                                        reason: dto.reason,
                                        status: client_1.RefundStatus.PROCESSING,
                                        metadata: { idempotencyKey: hashedKey },
                                    },
                                })];
                        case 5:
                            refund = _b.sent();
                            _b.label = 6;
                        case 6:
                            _b.trys.push([6, 10, , 12]);
                            provider = this.providerFactory.get(successAttempt.provider);
                            return [4 /*yield*/, provider.refundPayment({
                                    providerPaymentId: successAttempt.providerOrderId,
                                    amount: dto.amount,
                                    currency: transaction.currency,
                                    reason: dto.reason,
                                    idempotencyKey: "refund:".concat(hashedKey),
                                })];
                        case 7:
                            providerResult_1 = _b.sent();
                            // ── Update refund record + transaction status (DB transaction) ──────
                            return [4 /*yield*/, this.prisma.withTransaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var isFullRefund;
                                    var _a;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0: return [4 /*yield*/, tx.refund.update({
                                                    where: { id: refund.id },
                                                    data: {
                                                        status: providerResult_1.status === 'SUCCESS' ? client_1.RefundStatus.SUCCESS : client_1.RefundStatus.PROCESSING,
                                                        providerRefundId: providerResult_1.providerRefundId,
                                                    },
                                                })];
                                            case 1:
                                                _b.sent();
                                                isFullRefund = dto.amount >= transaction.amount - alreadyRefunded;
                                                return [4 /*yield*/, tx.transaction.update({
                                                        where: { id: dto.transactionId },
                                                        data: {
                                                            status: isFullRefund
                                                                ? client_1.TransactionStatus.REFUNDED
                                                                : client_1.TransactionStatus.PARTIALLY_REFUNDED,
                                                        },
                                                    })];
                                            case 2:
                                                _b.sent();
                                                // Record in ledger
                                                return [4 /*yield*/, this.ledgerService.recordRefund({
                                                        transactionId: dto.transactionId,
                                                        amount: dto.amount,
                                                        currency: transaction.currency,
                                                        description: "Refund via ".concat(successAttempt.provider, ": ").concat((_a = dto.reason) !== null && _a !== void 0 ? _a : 'customer request'),
                                                        tx: tx,
                                                    })];
                                            case 3:
                                                // Record in ledger
                                                _b.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 8:
                            // ── Update refund record + transaction status (DB transaction) ──────
                            _b.sent();
                            return [4 /*yield*/, this.auditService.log({
                                    actor: dto.actorId,
                                    action: 'REFUND_PROCESSED',
                                    resourceType: 'Refund',
                                    resourceId: refund.id,
                                    transactionId: dto.transactionId,
                                    newState: { amount: dto.amount.toString(), provider: successAttempt.provider },
                                    ipAddress: dto.ipAddress,
                                })];
                        case 9:
                            _b.sent();
                            this.logger.log("Refund ".concat(refund.id, " processed successfully"));
                            return [2 /*return*/, this.prisma.refund.findUniqueOrThrow({ where: { id: refund.id } })];
                        case 10:
                            err_1 = _b.sent();
                            // Mark refund as failed so it can be retried
                            return [4 /*yield*/, this.prisma.refund.update({
                                    where: { id: refund.id },
                                    data: { status: client_1.RefundStatus.FAILED },
                                })];
                        case 11:
                            // Mark refund as failed so it can be retried
                            _b.sent();
                            throw err_1;
                        case 12: return [2 /*return*/];
                    }
                });
            });
        };
        RefundService_1.prototype.findByTransaction = function (transactionId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.refund.findMany({
                            where: { transactionId: transactionId },
                            orderBy: { createdAt: 'desc' },
                        })];
                });
            });
        };
        return RefundService_1;
    }());
    __setFunctionName(_classThis, "RefundService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        RefundService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return RefundService = _classThis;
}();
exports.RefundService = RefundService;
