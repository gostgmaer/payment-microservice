"use strict";
/**
 * Razorpay Payment Provider
 *
 * Implements the IPaymentProvider strategy for Razorpay.
 *
 * Flow:
 *  1. createPayment → creates a Razorpay Order and returns the orderId.
 *     Frontend uses Razorpay Checkout SDK to complete the payment.
 *  2. verifyPayment → verifies HMAC-SHA256 signature over
 *     `orderId|paymentId` using the key_secret.
 *     This is the ONLY accepted verification method for Razorpay —
 *     no API call needed after signature check.
 *  3. refundPayment → creates a refund via Razorpay Refunds API.
 *  4. verifyWebhookSignature → SHA-256 HMAC with webhook_secret.
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
exports.RazorpayProvider = void 0;
var common_1 = require("@nestjs/common");
var razorpay_1 = require("razorpay");
var crypto_1 = require("crypto");
var client_1 = require("@prisma/client");
var RazorpayProvider = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var RazorpayProvider = _classThis = /** @class */ (function () {
        function RazorpayProvider_1(config) {
            this.config = config;
            this.provider = client_1.Provider.RAZORPAY;
            this.logger = new common_1.Logger(RazorpayProvider.name);
            this.razorpay = new razorpay_1.default({
                key_id: config.razorpayKeyId,
                key_secret: config.razorpayKeySecret,
            });
        }
        RazorpayProvider_1.prototype.createPayment = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var order;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.logger.log("Creating Razorpay order for transaction ".concat(input.transactionId));
                            return [4 /*yield*/, this.razorpay.orders.create({
                                    amount: Number(input.amount),
                                    currency: input.currency.toUpperCase(),
                                    receipt: input.transactionId.substring(0, 40), // max 40 chars
                                    notes: {
                                        transactionId: input.transactionId,
                                        customerId: input.customerId,
                                    },
                                })];
                        case 1:
                            order = _b.sent();
                            return [2 /*return*/, {
                                    providerOrderId: order.id,
                                    provider: client_1.Provider.RAZORPAY,
                                    method: (_a = input.method) !== null && _a !== void 0 ? _a : 'upi',
                                    metadata: { orderId: order.id, status: order.status },
                                }];
                    }
                });
            });
        };
        RazorpayProvider_1.prototype.verifyPayment = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var body, expected, expectedBuf, receivedBuf, isValid, order;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.log("Verifying Razorpay payment for order ".concat(input.providerOrderId));
                            // Razorpay's recommended server-side verification:
                            // SHA-256 HMAC of "orderId|paymentId" with key_secret
                            if (input.providerPaymentId && input.providerSignature) {
                                body = "".concat(input.providerOrderId, "|").concat(input.providerPaymentId);
                                expected = (0, crypto_1.createHmac)('sha256', this.config.razorpayKeySecret)
                                    .update(body)
                                    .digest('hex');
                                expectedBuf = Buffer.from(expected);
                                receivedBuf = Buffer.from(input.providerSignature);
                                isValid = expectedBuf.length === receivedBuf.length &&
                                    (0, crypto_1.timingSafeEqual)(expectedBuf, receivedBuf);
                                return [2 /*return*/, {
                                        isSuccess: isValid,
                                        failureReason: isValid ? undefined : 'Signature verification failed',
                                    }];
                            }
                            return [4 /*yield*/, this.razorpay.orders.fetch(input.providerOrderId)];
                        case 1:
                            order = _a.sent();
                            return [2 /*return*/, {
                                    isSuccess: order.status === 'paid',
                                    failureReason: order.status !== 'paid' ? "Order status: ".concat(order.status) : undefined,
                                }];
                    }
                });
            });
        };
        RazorpayProvider_1.prototype.refundPayment = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var refund, status;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.logger.log("Creating Razorpay refund for payment ".concat(input.providerPaymentId));
                            return [4 /*yield*/, this.razorpay.payments.refund(input.providerPaymentId, {
                                    amount: Number(input.amount),
                                    notes: { reason: (_a = input.reason) !== null && _a !== void 0 ? _a : 'Refund requested' },
                                })];
                        case 1:
                            refund = _b.sent();
                            status = refund.status === 'processed' ? 'SUCCESS' : refund.status === 'pending' ? 'PENDING' : 'FAILED';
                            return [2 /*return*/, {
                                    providerRefundId: refund.id,
                                    status: status,
                                    metadata: { razorpayRefundId: refund.id },
                                }];
                    }
                });
            });
        };
        RazorpayProvider_1.prototype.verifyWebhookSignature = function (rawBody, signature) {
            // Razorpay webhook signature: SHA-256 HMAC of raw body with webhook_secret
            var expected = (0, crypto_1.createHmac)('sha256', this.config.razorpayWebhookSecret)
                .update(rawBody)
                .digest('hex');
            var expectedBuf = Buffer.from(expected);
            var receivedBuf = Buffer.from(signature);
            if (expectedBuf.length !== receivedBuf.length)
                return false;
            return (0, crypto_1.timingSafeEqual)(expectedBuf, receivedBuf);
        };
        return RazorpayProvider_1;
    }());
    __setFunctionName(_classThis, "RazorpayProvider");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        RazorpayProvider = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return RazorpayProvider = _classThis;
}();
exports.RazorpayProvider = RazorpayProvider;
