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
exports.PaymentOrchestratorController = exports.VerifyPaymentRequestDto = exports.InitiatePaymentRequestDto = void 0;
var openapi = require("@nestjs/swagger");
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var class_validator_1 = require("class-validator");
var class_transformer_1 = require("class-transformer");
var client_1 = require("@prisma/client");
var jwt_auth_guard_1 = require("../../../common/guards/jwt-auth.guard");
var swagger_2 = require("@nestjs/swagger");
var InitiatePaymentRequestDto = function () {
    var _a;
    var _orderId_decorators;
    var _orderId_initializers = [];
    var _orderId_extraInitializers = [];
    var _idempotencyKey_decorators;
    var _idempotencyKey_initializers = [];
    var _idempotencyKey_extraInitializers = [];
    var _amount_decorators;
    var _amount_initializers = [];
    var _amount_extraInitializers = [];
    var _currency_decorators;
    var _currency_initializers = [];
    var _currency_extraInitializers = [];
    var _invoiceId_decorators;
    var _invoiceId_initializers = [];
    var _invoiceId_extraInitializers = [];
    var _providers_decorators;
    var _providers_initializers = [];
    var _providers_extraInitializers = [];
    var _preferredMethod_decorators;
    var _preferredMethod_initializers = [];
    var _preferredMethod_extraInitializers = [];
    var _metadata_decorators;
    var _metadata_initializers = [];
    var _metadata_extraInitializers = [];
    return _a = /** @class */ (function () {
            function InitiatePaymentRequestDto() {
                this.orderId = __runInitializers(this, _orderId_initializers, void 0);
                this.idempotencyKey = (__runInitializers(this, _orderId_extraInitializers), __runInitializers(this, _idempotencyKey_initializers, void 0));
                this.amount = (__runInitializers(this, _idempotencyKey_extraInitializers), __runInitializers(this, _amount_initializers, void 0));
                this.currency = (__runInitializers(this, _amount_extraInitializers), __runInitializers(this, _currency_initializers, void 0));
                this.invoiceId = (__runInitializers(this, _currency_extraInitializers), __runInitializers(this, _invoiceId_initializers, void 0));
                this.providers = (__runInitializers(this, _invoiceId_extraInitializers), __runInitializers(this, _providers_initializers, void 0));
                this.preferredMethod = (__runInitializers(this, _providers_extraInitializers), __runInitializers(this, _preferredMethod_initializers, void 0));
                this.metadata = (__runInitializers(this, _preferredMethod_extraInitializers), __runInitializers(this, _metadata_initializers, void 0));
                __runInitializers(this, _metadata_extraInitializers);
            }
            return InitiatePaymentRequestDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _orderId_decorators = [(0, swagger_2.ApiProperty)({ example: 'order_abc123' }), (0, class_validator_1.IsString)()];
            _idempotencyKey_decorators = [(0, swagger_2.ApiProperty)({ description: 'Caller-supplied idempotency key (UUID or random string)', example: 'a3f8b2c1-...' }), (0, class_validator_1.IsString)()];
            _amount_decorators = [(0, swagger_2.ApiProperty)({ description: 'Amount in smallest currency unit (paise/cents)', example: 49900 }), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(1), (0, class_transformer_1.Type)(function () { return Number; })];
            _currency_decorators = [(0, swagger_2.ApiProperty)({ example: 'INR' }), (0, class_validator_1.IsString)()];
            _invoiceId_decorators = [(0, swagger_2.ApiPropertyOptional)({ description: 'Pre-created invoice ID' }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _providers_decorators = [(0, swagger_2.ApiPropertyOptional)({ enum: client_1.Provider, isArray: true }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsArray)(), (0, class_validator_1.IsEnum)(client_1.Provider, { each: true })];
            _preferredMethod_decorators = [(0, swagger_2.ApiPropertyOptional)({ example: 'upi' }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _metadata_decorators = [(0, swagger_2.ApiPropertyOptional)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _orderId_decorators, { kind: "field", name: "orderId", static: false, private: false, access: { has: function (obj) { return "orderId" in obj; }, get: function (obj) { return obj.orderId; }, set: function (obj, value) { obj.orderId = value; } }, metadata: _metadata }, _orderId_initializers, _orderId_extraInitializers);
            __esDecorate(null, null, _idempotencyKey_decorators, { kind: "field", name: "idempotencyKey", static: false, private: false, access: { has: function (obj) { return "idempotencyKey" in obj; }, get: function (obj) { return obj.idempotencyKey; }, set: function (obj, value) { obj.idempotencyKey = value; } }, metadata: _metadata }, _idempotencyKey_initializers, _idempotencyKey_extraInitializers);
            __esDecorate(null, null, _amount_decorators, { kind: "field", name: "amount", static: false, private: false, access: { has: function (obj) { return "amount" in obj; }, get: function (obj) { return obj.amount; }, set: function (obj, value) { obj.amount = value; } }, metadata: _metadata }, _amount_initializers, _amount_extraInitializers);
            __esDecorate(null, null, _currency_decorators, { kind: "field", name: "currency", static: false, private: false, access: { has: function (obj) { return "currency" in obj; }, get: function (obj) { return obj.currency; }, set: function (obj, value) { obj.currency = value; } }, metadata: _metadata }, _currency_initializers, _currency_extraInitializers);
            __esDecorate(null, null, _invoiceId_decorators, { kind: "field", name: "invoiceId", static: false, private: false, access: { has: function (obj) { return "invoiceId" in obj; }, get: function (obj) { return obj.invoiceId; }, set: function (obj, value) { obj.invoiceId = value; } }, metadata: _metadata }, _invoiceId_initializers, _invoiceId_extraInitializers);
            __esDecorate(null, null, _providers_decorators, { kind: "field", name: "providers", static: false, private: false, access: { has: function (obj) { return "providers" in obj; }, get: function (obj) { return obj.providers; }, set: function (obj, value) { obj.providers = value; } }, metadata: _metadata }, _providers_initializers, _providers_extraInitializers);
            __esDecorate(null, null, _preferredMethod_decorators, { kind: "field", name: "preferredMethod", static: false, private: false, access: { has: function (obj) { return "preferredMethod" in obj; }, get: function (obj) { return obj.preferredMethod; }, set: function (obj, value) { obj.preferredMethod = value; } }, metadata: _metadata }, _preferredMethod_initializers, _preferredMethod_extraInitializers);
            __esDecorate(null, null, _metadata_decorators, { kind: "field", name: "metadata", static: false, private: false, access: { has: function (obj) { return "metadata" in obj; }, get: function (obj) { return obj.metadata; }, set: function (obj, value) { obj.metadata = value; } }, metadata: _metadata }, _metadata_initializers, _metadata_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.InitiatePaymentRequestDto = InitiatePaymentRequestDto;
var VerifyPaymentRequestDto = function () {
    var _a;
    var _attemptId_decorators;
    var _attemptId_initializers = [];
    var _attemptId_extraInitializers = [];
    var _providerPaymentId_decorators;
    var _providerPaymentId_initializers = [];
    var _providerPaymentId_extraInitializers = [];
    var _providerSignature_decorators;
    var _providerSignature_initializers = [];
    var _providerSignature_extraInitializers = [];
    return _a = /** @class */ (function () {
            function VerifyPaymentRequestDto() {
                this.attemptId = __runInitializers(this, _attemptId_initializers, void 0);
                this.providerPaymentId = (__runInitializers(this, _attemptId_extraInitializers), __runInitializers(this, _providerPaymentId_initializers, void 0));
                this.providerSignature = (__runInitializers(this, _providerPaymentId_extraInitializers), __runInitializers(this, _providerSignature_initializers, void 0));
                __runInitializers(this, _providerSignature_extraInitializers);
            }
            return VerifyPaymentRequestDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _attemptId_decorators = [(0, swagger_2.ApiProperty)(), (0, class_validator_1.IsString)()];
            _providerPaymentId_decorators = [(0, swagger_2.ApiPropertyOptional)({ description: 'Razorpay payment ID from frontend' }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _providerSignature_decorators = [(0, swagger_2.ApiPropertyOptional)({ description: 'Razorpay signature from frontend' }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _attemptId_decorators, { kind: "field", name: "attemptId", static: false, private: false, access: { has: function (obj) { return "attemptId" in obj; }, get: function (obj) { return obj.attemptId; }, set: function (obj, value) { obj.attemptId = value; } }, metadata: _metadata }, _attemptId_initializers, _attemptId_extraInitializers);
            __esDecorate(null, null, _providerPaymentId_decorators, { kind: "field", name: "providerPaymentId", static: false, private: false, access: { has: function (obj) { return "providerPaymentId" in obj; }, get: function (obj) { return obj.providerPaymentId; }, set: function (obj, value) { obj.providerPaymentId = value; } }, metadata: _metadata }, _providerPaymentId_initializers, _providerPaymentId_extraInitializers);
            __esDecorate(null, null, _providerSignature_decorators, { kind: "field", name: "providerSignature", static: false, private: false, access: { has: function (obj) { return "providerSignature" in obj; }, get: function (obj) { return obj.providerSignature; }, set: function (obj, value) { obj.providerSignature = value; } }, metadata: _metadata }, _providerSignature_initializers, _providerSignature_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.VerifyPaymentRequestDto = VerifyPaymentRequestDto;
var PaymentOrchestratorController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('Payment'), (0, swagger_1.ApiBearerAuth)(), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Controller)('payments')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _initiatePayment_decorators;
    var _verifyPayment_decorators;
    var _getTransaction_decorators;
    var _listTransactions_decorators;
    var PaymentOrchestratorController = _classThis = /** @class */ (function () {
        function PaymentOrchestratorController_1(orchestrator, transactionService) {
            this.orchestrator = (__runInitializers(this, _instanceExtraInitializers), orchestrator);
            this.transactionService = transactionService;
        }
        /**
         * Initiate a new payment.
         * Creates a transaction and returns provider-specific options.
         * Frontend uses these options to render the payment UI.
         */
        PaymentOrchestratorController_1.prototype.initiatePayment = function (dto, user) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.orchestrator.initiatePayment({
                            orderId: dto.orderId,
                            idempotencyKey: dto.idempotencyKey,
                            customerId: user.sub,
                            amount: BigInt(dto.amount),
                            currency: dto.currency,
                            invoiceId: dto.invoiceId,
                            providers: dto.providers,
                            preferredMethod: dto.preferredMethod,
                            metadata: dto.metadata,
                            actorId: user.sub,
                        })];
                });
            });
        };
        /**
         * Verify a payment attempt (for Razorpay frontend-callback flow).
         * For Stripe, verification is handled automatically via webhooks.
         */
        PaymentOrchestratorController_1.prototype.verifyPayment = function (transactionId, dto, user) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.orchestrator.verifyPayment({
                            transactionId: transactionId,
                            attemptId: dto.attemptId,
                            providerPaymentId: dto.providerPaymentId,
                            providerSignature: dto.providerSignature,
                            actorId: user.sub,
                        })];
                });
            });
        };
        /** Retrieve a transaction with its attempts. */
        PaymentOrchestratorController_1.prototype.getTransaction = function (transactionId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.transactionService.findById(transactionId)];
                });
            });
        };
        /** List all transactions for the authenticated customer. */
        PaymentOrchestratorController_1.prototype.listTransactions = function (user_1) {
            return __awaiter(this, arguments, void 0, function (user, page, limit) {
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 20; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.transactionService.findByCustomer(user.sub, +page, +limit)];
                });
            });
        };
        return PaymentOrchestratorController_1;
    }());
    __setFunctionName(_classThis, "PaymentOrchestratorController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _initiatePayment_decorators = [(0, swagger_1.ApiOperation)({ description: "Initiate a new payment.\nCreates a transaction and returns provider-specific options.\nFrontend uses these options to render the payment UI.", summary: 'Initiate a payment (creates transaction + provider options)' }), (0, common_1.Post)('initiate'), (0, common_1.HttpCode)(common_1.HttpStatus.CREATED), (0, swagger_1.ApiResponse)({ status: 201, description: 'Payment initiated successfully' }), openapi.ApiResponse({ status: common_1.HttpStatus.CREATED, type: Object })];
        _verifyPayment_decorators = [(0, swagger_1.ApiOperation)({ description: "Verify a payment attempt (for Razorpay frontend-callback flow).\nFor Stripe, verification is handled automatically via webhooks.", summary: 'Verify a payment attempt server-side' }), (0, common_1.Post)(':transactionId/verify'), (0, common_1.HttpCode)(common_1.HttpStatus.OK), openapi.ApiResponse({ status: common_1.HttpStatus.OK })];
        _getTransaction_decorators = [(0, swagger_1.ApiOperation)({ description: "Retrieve a transaction with its attempts.", summary: 'Get transaction details' }), (0, common_1.Get)(':transactionId'), openapi.ApiResponse({ status: 200 })];
        _listTransactions_decorators = [(0, swagger_1.ApiOperation)({ description: "List all transactions for the authenticated customer.", summary: 'List transactions for current customer' }), (0, common_1.Get)(), openapi.ApiResponse({ status: 200 })];
        __esDecorate(_classThis, null, _initiatePayment_decorators, { kind: "method", name: "initiatePayment", static: false, private: false, access: { has: function (obj) { return "initiatePayment" in obj; }, get: function (obj) { return obj.initiatePayment; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _verifyPayment_decorators, { kind: "method", name: "verifyPayment", static: false, private: false, access: { has: function (obj) { return "verifyPayment" in obj; }, get: function (obj) { return obj.verifyPayment; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getTransaction_decorators, { kind: "method", name: "getTransaction", static: false, private: false, access: { has: function (obj) { return "getTransaction" in obj; }, get: function (obj) { return obj.getTransaction; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listTransactions_decorators, { kind: "method", name: "listTransactions", static: false, private: false, access: { has: function (obj) { return "listTransactions" in obj; }, get: function (obj) { return obj.listTransactions; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        PaymentOrchestratorController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return PaymentOrchestratorController = _classThis;
}();
exports.PaymentOrchestratorController = PaymentOrchestratorController;
