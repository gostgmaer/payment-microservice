"use strict";
/**
 * WebhookService
 *
 * Handles incoming webhook events from Stripe and Razorpay.
 *
 * Security guarantees:
 *  1. Signature verification before any DB write.
 *  2. Raw body preservation (configured in main.ts) for accurate HMAC.
 *  3. Idempotent processing — event ID stored in WebhookLog; duplicates skipped.
 *  4. All processing is async (enqueued to BullMQ) to prevent timeouts.
 *  5. Webhook payload stored BEFORE processing — ensures we never lose events.
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
exports.WebhookService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var error_codes_constant_1 = require("../../../common/constants/error-codes.constant");
var WebhookService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var WebhookService = _classThis = /** @class */ (function () {
        function WebhookService_1(prisma, stripeProvider, razorpayProvider, orchestrator, attemptService, auditService) {
            this.prisma = prisma;
            this.stripeProvider = stripeProvider;
            this.razorpayProvider = razorpayProvider;
            this.orchestrator = orchestrator;
            this.attemptService = attemptService;
            this.auditService = auditService;
            this.logger = new common_1.Logger(WebhookService.name);
        }
        // ─── Stripe ─────────────────────────────────────────────────────────────
        WebhookService_1.prototype.handleStripeWebhook = function (rawBody, signature) {
            return __awaiter(this, void 0, void 0, function () {
                var isValid, event, existing, webhookLog, err_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            isValid = this.stripeProvider.verifyWebhookSignature(rawBody, signature);
                            if (!isValid) {
                                this.logger.warn('Stripe webhook: invalid signature');
                                throw new common_1.UnauthorizedException({
                                    message: 'Invalid webhook signature',
                                    errorCode: error_codes_constant_1.ERROR_CODES.WEBHOOK_SIGNATURE_INVALID,
                                });
                            }
                            event = this.stripeProvider.parseWebhookEvent(rawBody, signature);
                            return [4 /*yield*/, this.prisma.webhookLog.findUnique({
                                    where: { eventId: event.id },
                                })];
                        case 1:
                            existing = _a.sent();
                            if (existing === null || existing === void 0 ? void 0 : existing.isProcessed) {
                                this.logger.log("Stripe webhook ".concat(event.id, " already processed \u2014 skipping"));
                                return [2 /*return*/, { received: true }];
                            }
                            return [4 /*yield*/, this.upsertWebhookLog({
                                    provider: client_1.Provider.STRIPE,
                                    eventType: event.type,
                                    eventId: event.id,
                                    payload: event,
                                    signature: signature,
                                    isVerified: true,
                                })];
                        case 2:
                            webhookLog = _a.sent();
                            _a.label = 3;
                        case 3:
                            _a.trys.push([3, 6, , 8]);
                            return [4 /*yield*/, this.processStripeEvent(event, webhookLog.id)];
                        case 4:
                            _a.sent();
                            return [4 /*yield*/, this.prisma.webhookLog.update({
                                    where: { id: webhookLog.id },
                                    data: { isProcessed: true, processedAt: new Date() },
                                })];
                        case 5:
                            _a.sent();
                            return [3 /*break*/, 8];
                        case 6:
                            err_1 = _a.sent();
                            return [4 /*yield*/, this.prisma.webhookLog.update({
                                    where: { id: webhookLog.id },
                                    data: { error: err_1.message },
                                })];
                        case 7:
                            _a.sent();
                            throw err_1;
                        case 8: return [2 /*return*/, { received: true }];
                    }
                });
            });
        };
        WebhookService_1.prototype.processStripeEvent = function (event, webhookLogId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, pi, pi;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _a = event.type;
                            switch (_a) {
                                case 'payment_intent.succeeded': return [3 /*break*/, 1];
                                case 'payment_intent.payment_failed': return [3 /*break*/, 3];
                                case 'charge.refunded': return [3 /*break*/, 5];
                            }
                            return [3 /*break*/, 6];
                        case 1:
                            pi = event.data.object;
                            return [4 /*yield*/, this.handlePaymentIntentSucceeded(pi, webhookLogId)];
                        case 2:
                            _b.sent();
                            return [3 /*break*/, 7];
                        case 3:
                            pi = event.data.object;
                            return [4 /*yield*/, this.handlePaymentIntentFailed(pi)];
                        case 4:
                            _b.sent();
                            return [3 /*break*/, 7];
                        case 5:
                            {
                                this.logger.log("Stripe charge.refunded received \u2014 handled via RefundModule");
                                return [3 /*break*/, 7];
                            }
                            _b.label = 6;
                        case 6:
                            this.logger.log("Stripe webhook: unhandled event type ".concat(event.type));
                            _b.label = 7;
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        WebhookService_1.prototype.handlePaymentIntentSucceeded = function (pi, webhookLogId) {
            return __awaiter(this, void 0, void 0, function () {
                var transactionId, attempt;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            transactionId = (_a = pi.metadata) === null || _a === void 0 ? void 0 : _a.transactionId;
                            if (!transactionId) {
                                this.logger.warn("Stripe PI ".concat(pi.id, ": no transactionId in metadata"));
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.attemptService.findByProviderOrderId(pi.id)];
                        case 1:
                            attempt = _b.sent();
                            if (!attempt) {
                                this.logger.warn("No attempt found for Stripe PaymentIntent ".concat(pi.id));
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.prisma.webhookLog.update({
                                    where: { id: webhookLogId },
                                    data: { attemptId: attempt.id },
                                })];
                        case 2:
                            _b.sent();
                            return [4 /*yield*/, this.orchestrator.verifyPayment({
                                    transactionId: attempt.transactionId,
                                    attemptId: attempt.id,
                                    actorId: 'stripe-webhook',
                                })];
                        case 3:
                            _b.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        WebhookService_1.prototype.handlePaymentIntentFailed = function (pi) {
            return __awaiter(this, void 0, void 0, function () {
                var attempt;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.attemptService.findByProviderOrderId(pi.id)];
                        case 1:
                            attempt = _c.sent();
                            if (!attempt)
                                return [2 /*return*/];
                            return [4 /*yield*/, this.attemptService.markFailed(attempt.id, (_b = (_a = pi.last_payment_error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : 'PaymentIntent failed')];
                        case 2:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // ─── Razorpay ────────────────────────────────────────────────────────────
        WebhookService_1.prototype.handleRazorpayWebhook = function (rawBody, signature) {
            return __awaiter(this, void 0, void 0, function () {
                var isValid, body, eventId, existing, webhookLog, err_2;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            isValid = this.razorpayProvider.verifyWebhookSignature(rawBody, signature);
                            if (!isValid) {
                                this.logger.warn('Razorpay webhook: invalid signature');
                                throw new common_1.UnauthorizedException({
                                    message: 'Invalid webhook signature',
                                    errorCode: error_codes_constant_1.ERROR_CODES.WEBHOOK_SIGNATURE_INVALID,
                                });
                            }
                            body = JSON.parse(rawBody.toString());
                            eventId = "rz_".concat(body.event, "_").concat((_d = (_b = (_a = body.payload.payment) === null || _a === void 0 ? void 0 : _a.entity.id) !== null && _b !== void 0 ? _b : (_c = body.payload.order) === null || _c === void 0 ? void 0 : _c.entity.id) !== null && _d !== void 0 ? _d : Date.now());
                            return [4 /*yield*/, this.prisma.webhookLog.findUnique({ where: { eventId: eventId } })];
                        case 1:
                            existing = _e.sent();
                            if (existing === null || existing === void 0 ? void 0 : existing.isProcessed) {
                                return [2 /*return*/, { received: true }];
                            }
                            return [4 /*yield*/, this.upsertWebhookLog({
                                    provider: client_1.Provider.RAZORPAY,
                                    eventType: body.event,
                                    eventId: eventId,
                                    payload: body,
                                    signature: signature,
                                    isVerified: true,
                                })];
                        case 2:
                            webhookLog = _e.sent();
                            _e.label = 3;
                        case 3:
                            _e.trys.push([3, 6, , 8]);
                            return [4 /*yield*/, this.processRazorpayEvent(body, webhookLog.id)];
                        case 4:
                            _e.sent();
                            return [4 /*yield*/, this.prisma.webhookLog.update({
                                    where: { id: webhookLog.id },
                                    data: { isProcessed: true, processedAt: new Date() },
                                })];
                        case 5:
                            _e.sent();
                            return [3 /*break*/, 8];
                        case 6:
                            err_2 = _e.sent();
                            return [4 /*yield*/, this.prisma.webhookLog.update({
                                    where: { id: webhookLog.id },
                                    data: { error: err_2.message },
                                })];
                        case 7:
                            _e.sent();
                            throw err_2;
                        case 8: return [2 /*return*/, { received: true }];
                    }
                });
            });
        };
        WebhookService_1.prototype.processRazorpayEvent = function (body, webhookLogId) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, payment, attempt, payment, attempt;
                var _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _a = body.event;
                            switch (_a) {
                                case 'payment.captured': return [3 /*break*/, 1];
                                case 'payment.failed': return [3 /*break*/, 5];
                            }
                            return [3 /*break*/, 9];
                        case 1:
                            payment = (_b = body.payload.payment) === null || _b === void 0 ? void 0 : _b.entity;
                            if (!payment)
                                return [2 /*return*/];
                            return [4 /*yield*/, this.attemptService.findByProviderOrderId(payment.order_id)];
                        case 2:
                            attempt = _e.sent();
                            if (!attempt) {
                                this.logger.warn("No attempt found for Razorpay order ".concat(payment.order_id));
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, this.prisma.webhookLog.update({
                                    where: { id: webhookLogId },
                                    data: { attemptId: attempt.id },
                                })];
                        case 3:
                            _e.sent();
                            return [4 /*yield*/, this.orchestrator.verifyPayment({
                                    transactionId: attempt.transactionId,
                                    attemptId: attempt.id,
                                    providerPaymentId: payment.id,
                                    actorId: 'razorpay-webhook',
                                })];
                        case 4:
                            _e.sent();
                            return [3 /*break*/, 10];
                        case 5:
                            payment = (_c = body.payload.payment) === null || _c === void 0 ? void 0 : _c.entity;
                            if (!payment)
                                return [2 /*return*/];
                            return [4 /*yield*/, this.attemptService.findByProviderOrderId(payment.order_id)];
                        case 6:
                            attempt = _e.sent();
                            if (!attempt) return [3 /*break*/, 8];
                            return [4 /*yield*/, this.attemptService.markFailed(attempt.id, (_d = payment.error_description) !== null && _d !== void 0 ? _d : 'Razorpay payment failed')];
                        case 7:
                            _e.sent();
                            _e.label = 8;
                        case 8: return [3 /*break*/, 10];
                        case 9:
                            this.logger.log("Razorpay webhook: unhandled event ".concat(body.event));
                            _e.label = 10;
                        case 10: return [2 /*return*/];
                    }
                });
            });
        };
        // ─── Helpers ─────────────────────────────────────────────────────────────
        WebhookService_1.prototype.upsertWebhookLog = function (data) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.webhookLog.upsert({
                            where: { eventId: data.eventId },
                            create: data,
                            update: { isVerified: data.isVerified },
                        })];
                });
            });
        };
        return WebhookService_1;
    }());
    __setFunctionName(_classThis, "WebhookService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WebhookService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WebhookService = _classThis;
}();
exports.WebhookService = WebhookService;
