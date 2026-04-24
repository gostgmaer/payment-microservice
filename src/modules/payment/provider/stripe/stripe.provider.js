"use strict";
/**
 * Stripe Payment Provider
 *
 * Implements the IPaymentProvider strategy for Stripe.
 *
 * Flow:
 *  1. createPayment → creates a PaymentIntent and returns the client_secret
 *     for the frontend to complete via Stripe.js / Stripe iOS / Android SDK.
 *  2. verifyPayment → retrieves the PaymentIntent from Stripe API and checks
 *     its status — NEVER trusts the frontend response.
 *  3. refundPayment → creates a Refund on Stripe.
 *  4. verifyWebhookSignature → uses stripe.webhooks.constructEvent() which
 *     internally performs HMAC-SHA256 verification.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
exports.StripeProvider = void 0;
var common_1 = require("@nestjs/common");
var stripe_1 = require("stripe");
var client_1 = require("@prisma/client");
var StripeProvider = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var StripeProvider = _classThis = /** @class */ (function () {
        function StripeProvider_1(config) {
            this.config = config;
            this.provider = client_1.Provider.STRIPE;
            this.logger = new common_1.Logger(StripeProvider.name);
            this.stripe = new stripe_1.default(config.stripeSecretKey, {
                // Pin the API version to prevent unexpected breaking changes
                apiVersion: config.stripeApiVersion,
                typescript: true,
                maxNetworkRetries: 2,
                timeout: 10000,
                telemetry: false, // disable telemetry in financial systems
            });
        }
        StripeProvider_1.prototype.createPayment = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var paymentIntent;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            this.logger.log("Creating Stripe PaymentIntent for transaction ".concat(input.transactionId));
                            return [4 /*yield*/, this.stripe.paymentIntents.create({
                                    amount: Number(input.amount), // safe: all payments fit within Number.MAX_SAFE_INTEGER
                                    currency: input.currency.toLowerCase(),
                                    metadata: __assign({ transactionId: input.transactionId, customerId: input.customerId }, input.metadata),
                                    automatic_payment_methods: { enabled: true },
                                    description: "Transaction ".concat(input.transactionId),
                                }, {
                                    // Forward idempotency key to Stripe to prevent double-charging
                                    idempotencyKey: input.idempotencyKey,
                                })];
                        case 1:
                            paymentIntent = _b.sent();
                            return [2 /*return*/, {
                                    providerOrderId: paymentIntent.id,
                                    clientSecret: (_a = paymentIntent.client_secret) !== null && _a !== void 0 ? _a : undefined,
                                    provider: client_1.Provider.STRIPE,
                                    method: 'card',
                                    metadata: { paymentIntentId: paymentIntent.id },
                                }];
                    }
                });
            });
        };
        StripeProvider_1.prototype.verifyPayment = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var paymentIntent;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            this.logger.log("Verifying Stripe PaymentIntent ".concat(input.providerOrderId));
                            return [4 /*yield*/, this.stripe.paymentIntents.retrieve(input.providerOrderId)];
                        case 1:
                            paymentIntent = _c.sent();
                            if (paymentIntent.status === 'succeeded') {
                                return [2 /*return*/, { isSuccess: true, metadata: { chargeId: paymentIntent.latest_charge } }];
                            }
                            return [2 /*return*/, {
                                    isSuccess: false,
                                    failureReason: (_b = (_a = paymentIntent.last_payment_error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : "PaymentIntent status: ".concat(paymentIntent.status),
                                }];
                    }
                });
            });
        };
        StripeProvider_1.prototype.refundPayment = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var refund;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.logger.log("Creating Stripe refund for payment ".concat(input.providerPaymentId));
                            return [4 /*yield*/, this.stripe.refunds.create({
                                    payment_intent: input.providerPaymentId,
                                    amount: Number(input.amount),
                                    reason: this.mapRefundReason(input.reason),
                                    metadata: { currency: input.currency },
                                }, { idempotencyKey: input.idempotencyKey })];
                        case 1:
                            refund = _a.sent();
                            return [2 /*return*/, {
                                    providerRefundId: refund.id,
                                    status: refund.status === 'succeeded' ? 'SUCCESS' : refund.status === 'pending' ? 'PENDING' : 'FAILED',
                                }];
                    }
                });
            });
        };
        StripeProvider_1.prototype.verifyWebhookSignature = function (rawBody, signature) {
            try {
                // constructEvent throws if signature is invalid
                this.stripe.webhooks.constructEvent(rawBody, signature, this.config.stripeWebhookSecret);
                return true;
            }
            catch (err) {
                this.logger.warn("Stripe webhook signature verification failed: ".concat(err.message));
                return false;
            }
        };
        /** Parse the raw Stripe webhook event from a raw body buffer. */
        StripeProvider_1.prototype.parseWebhookEvent = function (rawBody, signature) {
            return this.stripe.webhooks.constructEvent(rawBody, signature, this.config.stripeWebhookSecret);
        };
        StripeProvider_1.prototype.mapRefundReason = function (reason) {
            if (!reason)
                return undefined;
            var map = {
                duplicate: 'duplicate',
                fraudulent: 'fraudulent',
                customer_request: 'requested_by_customer',
            };
            return map[reason.toLowerCase()];
        };
        return StripeProvider_1;
    }());
    __setFunctionName(_classThis, "StripeProvider");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        StripeProvider = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return StripeProvider = _classThis;
}();
exports.StripeProvider = StripeProvider;
