"use strict";
/**
 * PaymentOrchestratorService
 *
 * The central coordinator of the payment lifecycle. Orchestrates:
 *  1. Invoice existence check
 *  2. Transaction creation (with idempotency)
 *  3. Multi-provider attempt creation (Stripe + Razorpay in parallel)
 *  4. Provider failover on creation failure
 *  5. Payment verification (triggered by webhook or direct verify call)
 *  6. Ledger entry creation on success
 *  7. Audit trail
 *
 * NEVER trusts frontend success callbacks — all verification goes through
 * the provider's server-side API or webhook.
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
exports.PaymentOrchestratorService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var error_codes_constant_1 = require("../../../common/constants/error-codes.constant");
var PaymentOrchestratorService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var PaymentOrchestratorService = _classThis = /** @class */ (function () {
        function PaymentOrchestratorService_1(prisma, transactionService, attemptService, providerFactory, ledgerService, auditService, idempotencyService, config) {
            this.prisma = prisma;
            this.transactionService = transactionService;
            this.attemptService = attemptService;
            this.providerFactory = providerFactory;
            this.ledgerService = ledgerService;
            this.auditService = auditService;
            this.idempotencyService = idempotencyService;
            this.config = config;
            this.logger = new common_1.Logger(PaymentOrchestratorService.name);
        }
        /**
         * Initiate a payment — creates ONE transaction and one attempt per enabled provider.
         *
         * Returns a list of provider-specific options for the frontend to display
         * (e.g. "Pay with UPI" or "Pay with Card").
         */
        PaymentOrchestratorService_1.prototype.initiatePayment = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var cachedResult, transaction, enabledProviders, options, _i, enabledProviders_1, providerName, provider, providerResult, attempt, err_1, result;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.logger.log("Initiating payment for order ".concat(dto.orderId));
                            return [4 /*yield*/, this.idempotencyService.get(dto.idempotencyKey)];
                        case 1:
                            cachedResult = _b.sent();
                            if (cachedResult) {
                                this.logger.log("Returning cached result for idempotency key");
                                return [2 /*return*/, JSON.parse(cachedResult)];
                            }
                            return [4 /*yield*/, this.transactionService.create({
                                    orderId: dto.orderId,
                                    idempotencyKey: dto.idempotencyKey,
                                    customerId: dto.customerId,
                                    amount: dto.amount,
                                    currency: dto.currency,
                                    invoiceId: dto.invoiceId,
                                    metadata: dto.metadata,
                                })];
                        case 2:
                            transaction = _b.sent();
                            return [4 /*yield*/, this.auditService.log({
                                    actor: dto.actorId,
                                    action: 'PAYMENT_INITIATED',
                                    resourceType: 'Transaction',
                                    resourceId: transaction.id,
                                    transactionId: transaction.id,
                                    newState: { status: transaction.status },
                                    ipAddress: dto.ipAddress,
                                })];
                        case 3:
                            _b.sent();
                            enabledProviders = (_a = dto.providers) !== null && _a !== void 0 ? _a : this.providerFactory.getEnabledProviders();
                            options = [];
                            _i = 0, enabledProviders_1 = enabledProviders;
                            _b.label = 4;
                        case 4:
                            if (!(_i < enabledProviders_1.length)) return [3 /*break*/, 10];
                            providerName = enabledProviders_1[_i];
                            _b.label = 5;
                        case 5:
                            _b.trys.push([5, 8, , 9]);
                            provider = this.providerFactory.get(providerName);
                            return [4 /*yield*/, provider.createPayment({
                                    amount: dto.amount,
                                    currency: dto.currency,
                                    transactionId: transaction.id,
                                    customerId: dto.customerId,
                                    method: dto.preferredMethod,
                                    idempotencyKey: "".concat(dto.idempotencyKey, ":").concat(providerName),
                                    metadata: dto.metadata,
                                })];
                        case 6:
                            providerResult = _b.sent();
                            return [4 /*yield*/, this.attemptService.create({
                                    transactionId: transaction.id,
                                    provider: providerName,
                                    method: providerResult.method,
                                    providerOrderId: providerResult.providerOrderId,
                                    clientSecret: providerResult.clientSecret,
                                    amount: dto.amount,
                                    currency: dto.currency,
                                    metadata: providerResult.metadata,
                                })];
                        case 7:
                            attempt = _b.sent();
                            options.push({
                                provider: providerName,
                                method: providerResult.method,
                                orderId: providerName === client_1.Provider.RAZORPAY ? providerResult.providerOrderId : undefined,
                                clientSecret: providerName === client_1.Provider.STRIPE ? providerResult.clientSecret : undefined,
                                attemptId: attempt.id,
                            });
                            return [3 /*break*/, 9];
                        case 8:
                            err_1 = _b.sent();
                            this.logger.warn("Failed to create attempt for provider ".concat(providerName, ": ").concat(err_1.message));
                            return [3 /*break*/, 9];
                        case 9:
                            _i++;
                            return [3 /*break*/, 4];
                        case 10:
                            if (!(options.length === 0)) return [3 /*break*/, 12];
                            // All providers failed — mark transaction as failed
                            return [4 /*yield*/, this.transactionService.updateStatus(transaction.id, client_1.TransactionStatus.FAILED)];
                        case 11:
                            // All providers failed — mark transaction as failed
                            _b.sent();
                            throw new common_1.BadRequestException({
                                message: 'All payment providers are currently unavailable',
                                errorCode: error_codes_constant_1.ERROR_CODES.PAYMENT_PROVIDER_UNAVAILABLE,
                            });
                        case 12: 
                        // Update transaction to PROCESSING
                        return [4 /*yield*/, this.transactionService.updateStatus(transaction.id, client_1.TransactionStatus.PROCESSING)];
                        case 13:
                            // Update transaction to PROCESSING
                            _b.sent();
                            result = {
                                transactionId: transaction.id,
                                status: client_1.TransactionStatus.PROCESSING,
                                options: options,
                            };
                            // Cache the result for idempotency replay
                            return [4 /*yield*/, this.idempotencyService.store(dto.idempotencyKey, JSON.stringify(result))];
                        case 14:
                            // Cache the result for idempotency replay
                            _b.sent();
                            return [2 /*return*/, result];
                    }
                });
            });
        };
        /**
         * Verify a payment attempt server-side.
         * Called either from webhook handler or from a manual verify endpoint.
         * All DB updates are wrapped in a single transaction for atomicity.
         */
        PaymentOrchestratorService_1.prototype.verifyPayment = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var attempt, provider, verifyResult;
                var _this = this;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.logger.log("Verifying attempt ".concat(dto.attemptId, " for transaction ").concat(dto.transactionId));
                            return [4 /*yield*/, this.attemptService.findById(dto.attemptId)];
                        case 1:
                            attempt = _b.sent();
                            // Idempotency: already processed
                            if (attempt.status === client_1.AttemptStatus.SUCCESS) {
                                return [2 /*return*/, { success: true, transactionId: dto.transactionId }];
                            }
                            if (attempt.status === client_1.AttemptStatus.FAILED) {
                                return [2 /*return*/, { success: false, transactionId: dto.transactionId }];
                            }
                            provider = this.providerFactory.get(attempt.provider);
                            return [4 /*yield*/, provider.verifyPayment({
                                    providerOrderId: attempt.providerOrderId,
                                    providerPaymentId: dto.providerPaymentId,
                                    providerSignature: dto.providerSignature,
                                })];
                        case 2:
                            verifyResult = _b.sent();
                            if (!verifyResult.isSuccess) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.prisma.withTransaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: 
                                            // Mark attempt as SUCCESS (applies DB partial unique index guard)
                                            return [4 /*yield*/, this.attemptService.markSuccess(attempt.id, tx)];
                                            case 1:
                                                // Mark attempt as SUCCESS (applies DB partial unique index guard)
                                                _a.sent();
                                                // Mark all other attempts as FAILED
                                                return [4 /*yield*/, tx.paymentAttempt.updateMany({
                                                        where: {
                                                            transactionId: dto.transactionId,
                                                            id: { not: attempt.id },
                                                            status: { in: [client_1.AttemptStatus.PENDING, client_1.AttemptStatus.PROCESSING] },
                                                        },
                                                        data: { status: client_1.AttemptStatus.CANCELLED },
                                                    })];
                                            case 2:
                                                // Mark all other attempts as FAILED
                                                _a.sent();
                                                // Mark transaction as SUCCESS
                                                return [4 /*yield*/, this.transactionService.updateStatus(dto.transactionId, client_1.TransactionStatus.SUCCESS, tx)];
                                            case 3:
                                                // Mark transaction as SUCCESS
                                                _a.sent();
                                                // Create double-entry ledger entries
                                                return [4 /*yield*/, this.ledgerService.recordPayment({
                                                        transactionId: dto.transactionId,
                                                        amount: attempt.amount,
                                                        currency: attempt.currency,
                                                        description: "Payment received via ".concat(attempt.provider),
                                                        tx: tx,
                                                    })];
                                            case 4:
                                                // Create double-entry ledger entries
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 3:
                            _b.sent();
                            return [4 /*yield*/, this.auditService.log({
                                    actor: dto.actorId,
                                    action: 'PAYMENT_VERIFIED',
                                    resourceType: 'Transaction',
                                    resourceId: dto.transactionId,
                                    transactionId: dto.transactionId,
                                    newState: { status: client_1.TransactionStatus.SUCCESS, provider: attempt.provider },
                                })];
                        case 4:
                            _b.sent();
                            return [2 /*return*/, { success: true, transactionId: dto.transactionId }];
                        case 5: return [4 /*yield*/, this.attemptService.markFailed(attempt.id, (_a = verifyResult.failureReason) !== null && _a !== void 0 ? _a : 'Verification failed')];
                        case 6:
                            _b.sent();
                            return [4 /*yield*/, this.auditService.log({
                                    actor: dto.actorId,
                                    action: 'PAYMENT_VERIFICATION_FAILED',
                                    resourceType: 'Transaction',
                                    resourceId: dto.transactionId,
                                    transactionId: dto.transactionId,
                                    newState: { failureReason: verifyResult.failureReason },
                                })];
                        case 7:
                            _b.sent();
                            return [2 /*return*/, { success: false, transactionId: dto.transactionId }];
                    }
                });
            });
        };
        return PaymentOrchestratorService_1;
    }());
    __setFunctionName(_classThis, "PaymentOrchestratorService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PaymentOrchestratorService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PaymentOrchestratorService = _classThis;
}();
exports.PaymentOrchestratorService = PaymentOrchestratorService;
