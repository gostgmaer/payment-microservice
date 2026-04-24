"use strict";
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
exports.SubscriptionController = exports.CancelSubscriptionDto = exports.CreateSubscriptionDto = exports.CreatePlanDto = void 0;
var openapi = require("@nestjs/swagger");
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var class_validator_1 = require("class-validator");
var class_transformer_1 = require("class-transformer");
var swagger_2 = require("@nestjs/swagger");
var jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
var api_key_guard_1 = require("../../common/guards/api-key.guard");
var CreatePlanDto = function () {
    var _a;
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _amountRaw_decorators;
    var _amountRaw_initializers = [];
    var _amountRaw_extraInitializers = [];
    var _currency_decorators;
    var _currency_initializers = [];
    var _currency_extraInitializers = [];
    var _interval_decorators;
    var _interval_initializers = [];
    var _interval_extraInitializers = [];
    var _intervalCount_decorators;
    var _intervalCount_initializers = [];
    var _intervalCount_extraInitializers = [];
    var _trialDays_decorators;
    var _trialDays_initializers = [];
    var _trialDays_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreatePlanDto() {
                this.name = __runInitializers(this, _name_initializers, void 0);
                this.description = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.amountRaw = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _amountRaw_initializers, void 0));
                this.currency = (__runInitializers(this, _amountRaw_extraInitializers), __runInitializers(this, _currency_initializers, void 0));
                this.interval = (__runInitializers(this, _currency_extraInitializers), __runInitializers(this, _interval_initializers, void 0));
                this.intervalCount = (__runInitializers(this, _interval_extraInitializers), __runInitializers(this, _intervalCount_initializers, void 0));
                this.trialDays = (__runInitializers(this, _intervalCount_extraInitializers), __runInitializers(this, _trialDays_initializers, void 0));
                __runInitializers(this, _trialDays_extraInitializers);
            }
            return CreatePlanDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _name_decorators = [(0, swagger_2.ApiProperty)(), (0, class_validator_1.IsString)()];
            _description_decorators = [(0, swagger_2.ApiPropertyOptional)(), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _amountRaw_decorators = [(0, swagger_2.ApiProperty)({ description: 'Amount in smallest currency unit' }), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(1), (0, class_transformer_1.Type)(function () { return Number; })];
            _currency_decorators = [(0, swagger_2.ApiProperty)({ example: 'INR' }), (0, class_validator_1.IsString)()];
            _interval_decorators = [(0, swagger_2.ApiProperty)({ enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] }), (0, class_validator_1.IsEnum)(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'])];
            _intervalCount_decorators = [(0, swagger_2.ApiPropertyOptional)(), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)(), (0, class_transformer_1.Type)(function () { return Number; })];
            _trialDays_decorators = [(0, swagger_2.ApiPropertyOptional)(), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)(), (0, class_transformer_1.Type)(function () { return Number; })];
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _amountRaw_decorators, { kind: "field", name: "amountRaw", static: false, private: false, access: { has: function (obj) { return "amountRaw" in obj; }, get: function (obj) { return obj.amountRaw; }, set: function (obj, value) { obj.amountRaw = value; } }, metadata: _metadata }, _amountRaw_initializers, _amountRaw_extraInitializers);
            __esDecorate(null, null, _currency_decorators, { kind: "field", name: "currency", static: false, private: false, access: { has: function (obj) { return "currency" in obj; }, get: function (obj) { return obj.currency; }, set: function (obj, value) { obj.currency = value; } }, metadata: _metadata }, _currency_initializers, _currency_extraInitializers);
            __esDecorate(null, null, _interval_decorators, { kind: "field", name: "interval", static: false, private: false, access: { has: function (obj) { return "interval" in obj; }, get: function (obj) { return obj.interval; }, set: function (obj, value) { obj.interval = value; } }, metadata: _metadata }, _interval_initializers, _interval_extraInitializers);
            __esDecorate(null, null, _intervalCount_decorators, { kind: "field", name: "intervalCount", static: false, private: false, access: { has: function (obj) { return "intervalCount" in obj; }, get: function (obj) { return obj.intervalCount; }, set: function (obj, value) { obj.intervalCount = value; } }, metadata: _metadata }, _intervalCount_initializers, _intervalCount_extraInitializers);
            __esDecorate(null, null, _trialDays_decorators, { kind: "field", name: "trialDays", static: false, private: false, access: { has: function (obj) { return "trialDays" in obj; }, get: function (obj) { return obj.trialDays; }, set: function (obj, value) { obj.trialDays = value; } }, metadata: _metadata }, _trialDays_initializers, _trialDays_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreatePlanDto = CreatePlanDto;
var CreateSubscriptionDto = function () {
    var _a;
    var _planId_decorators;
    var _planId_initializers = [];
    var _planId_extraInitializers = [];
    var _trialOverrideDays_decorators;
    var _trialOverrideDays_initializers = [];
    var _trialOverrideDays_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateSubscriptionDto() {
                this.planId = __runInitializers(this, _planId_initializers, void 0);
                this.trialOverrideDays = (__runInitializers(this, _planId_extraInitializers), __runInitializers(this, _trialOverrideDays_initializers, void 0));
                __runInitializers(this, _trialOverrideDays_extraInitializers);
            }
            return CreateSubscriptionDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _planId_decorators = [(0, swagger_2.ApiProperty)({ description: 'Plan ID to subscribe to' }), (0, class_validator_1.IsString)()];
            _trialOverrideDays_decorators = [(0, swagger_2.ApiPropertyOptional)(), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)(), (0, class_transformer_1.Type)(function () { return Number; })];
            __esDecorate(null, null, _planId_decorators, { kind: "field", name: "planId", static: false, private: false, access: { has: function (obj) { return "planId" in obj; }, get: function (obj) { return obj.planId; }, set: function (obj, value) { obj.planId = value; } }, metadata: _metadata }, _planId_initializers, _planId_extraInitializers);
            __esDecorate(null, null, _trialOverrideDays_decorators, { kind: "field", name: "trialOverrideDays", static: false, private: false, access: { has: function (obj) { return "trialOverrideDays" in obj; }, get: function (obj) { return obj.trialOverrideDays; }, set: function (obj, value) { obj.trialOverrideDays = value; } }, metadata: _metadata }, _trialOverrideDays_initializers, _trialOverrideDays_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateSubscriptionDto = CreateSubscriptionDto;
var CancelSubscriptionDto = function () {
    var _a;
    var _reason_decorators;
    var _reason_initializers = [];
    var _reason_extraInitializers = [];
    var _immediate_decorators;
    var _immediate_initializers = [];
    var _immediate_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CancelSubscriptionDto() {
                this.reason = __runInitializers(this, _reason_initializers, void 0);
                this.immediate = (__runInitializers(this, _reason_extraInitializers), __runInitializers(this, _immediate_initializers, void 0));
                __runInitializers(this, _immediate_extraInitializers);
            }
            return CancelSubscriptionDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _reason_decorators = [(0, swagger_2.ApiPropertyOptional)(), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _immediate_decorators = [(0, swagger_2.ApiPropertyOptional)({ description: 'Cancel immediately or at period end' }), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _reason_decorators, { kind: "field", name: "reason", static: false, private: false, access: { has: function (obj) { return "reason" in obj; }, get: function (obj) { return obj.reason; }, set: function (obj, value) { obj.reason = value; } }, metadata: _metadata }, _reason_initializers, _reason_extraInitializers);
            __esDecorate(null, null, _immediate_decorators, { kind: "field", name: "immediate", static: false, private: false, access: { has: function (obj) { return "immediate" in obj; }, get: function (obj) { return obj.immediate; }, set: function (obj, value) { obj.immediate = value; } }, metadata: _metadata }, _immediate_initializers, _immediate_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CancelSubscriptionDto = CancelSubscriptionDto;
var SubscriptionController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('Subscriptions'), (0, common_1.Controller)('subscriptions')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _createPlan_decorators;
    var _listPlans_decorators;
    var _getPlan_decorators;
    var _deactivatePlan_decorators;
    var _createSubscription_decorators;
    var _listSubscriptions_decorators;
    var _getSubscription_decorators;
    var _cancelSubscription_decorators;
    var SubscriptionController = _classThis = /** @class */ (function () {
        function SubscriptionController_1(subscriptionService, planService) {
            this.subscriptionService = (__runInitializers(this, _instanceExtraInitializers), subscriptionService);
            this.planService = planService;
        }
        // ── Plans (admin only) ──────────────────────────────────────────────────
        SubscriptionController_1.prototype.createPlan = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.planService.create(__assign(__assign({}, dto), { amount: BigInt(dto.amountRaw) }))];
                });
            });
        };
        SubscriptionController_1.prototype.listPlans = function (includeInactive) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.planService.findAll(includeInactive !== 'true')];
                });
            });
        };
        SubscriptionController_1.prototype.getPlan = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.planService.findById(id)];
                });
            });
        };
        SubscriptionController_1.prototype.deactivatePlan = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.planService.deactivate(id)];
                });
            });
        };
        // ── Subscriptions ───────────────────────────────────────────────────────
        SubscriptionController_1.prototype.createSubscription = function (dto, user) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.subscriptionService.createSubscription({
                            customerId: user.sub,
                            planId: dto.planId,
                            trialOverrideDays: dto.trialOverrideDays,
                            actorId: user.sub,
                        })];
                });
            });
        };
        SubscriptionController_1.prototype.listSubscriptions = function (user_1) {
            return __awaiter(this, arguments, void 0, function (user, page, limit) {
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 20; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.subscriptionService.findByCustomer(user.sub, +page, +limit)];
                });
            });
        };
        SubscriptionController_1.prototype.getSubscription = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.subscriptionService.findById(id)];
                });
            });
        };
        SubscriptionController_1.prototype.cancelSubscription = function (id, dto, user) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.subscriptionService.cancelSubscription({
                            subscriptionId: id,
                            reason: dto.reason,
                            immediate: dto.immediate,
                            actorId: user.sub,
                        })];
                });
            });
        };
        return SubscriptionController_1;
    }());
    __setFunctionName(_classThis, "SubscriptionController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _createPlan_decorators = [(0, common_1.Post)('plans'), (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard), (0, swagger_1.ApiSecurity)('api-key'), (0, common_1.HttpCode)(common_1.HttpStatus.CREATED), (0, swagger_1.ApiOperation)({ summary: 'Create a new subscription plan (admin)' }), openapi.ApiResponse({ status: common_1.HttpStatus.CREATED })];
        _listPlans_decorators = [(0, common_1.Get)('plans'), (0, swagger_1.ApiOperation)({ summary: 'List available subscription plans' }), openapi.ApiResponse({ status: 200 })];
        _getPlan_decorators = [(0, common_1.Get)('plans/:id'), (0, swagger_1.ApiOperation)({ summary: 'Get plan details' }), openapi.ApiResponse({ status: 200 })];
        _deactivatePlan_decorators = [(0, common_1.Delete)('plans/:id'), (0, common_1.UseGuards)(api_key_guard_1.ApiKeyGuard), (0, swagger_1.ApiSecurity)('api-key'), (0, swagger_1.ApiOperation)({ summary: 'Deactivate a plan (admin)' }), openapi.ApiResponse({ status: 200 })];
        _createSubscription_decorators = [(0, common_1.Post)(), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, swagger_1.ApiBearerAuth)(), (0, common_1.HttpCode)(common_1.HttpStatus.CREATED), (0, swagger_1.ApiOperation)({ summary: 'Subscribe to a plan' }), openapi.ApiResponse({ status: common_1.HttpStatus.CREATED, type: Object })];
        _listSubscriptions_decorators = [(0, common_1.Get)(), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, swagger_1.ApiBearerAuth)(), (0, swagger_1.ApiOperation)({ summary: 'List subscriptions for current customer' }), openapi.ApiResponse({ status: 200 })];
        _getSubscription_decorators = [(0, common_1.Get)(':id'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, swagger_1.ApiBearerAuth)(), (0, swagger_1.ApiOperation)({ summary: 'Get subscription details' }), openapi.ApiResponse({ status: 200, type: Object })];
        _cancelSubscription_decorators = [(0, common_1.Delete)(':id'), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, swagger_1.ApiBearerAuth)(), (0, swagger_1.ApiOperation)({ summary: 'Cancel a subscription' }), openapi.ApiResponse({ status: 200 })];
        __esDecorate(_classThis, null, _createPlan_decorators, { kind: "method", name: "createPlan", static: false, private: false, access: { has: function (obj) { return "createPlan" in obj; }, get: function (obj) { return obj.createPlan; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listPlans_decorators, { kind: "method", name: "listPlans", static: false, private: false, access: { has: function (obj) { return "listPlans" in obj; }, get: function (obj) { return obj.listPlans; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPlan_decorators, { kind: "method", name: "getPlan", static: false, private: false, access: { has: function (obj) { return "getPlan" in obj; }, get: function (obj) { return obj.getPlan; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deactivatePlan_decorators, { kind: "method", name: "deactivatePlan", static: false, private: false, access: { has: function (obj) { return "deactivatePlan" in obj; }, get: function (obj) { return obj.deactivatePlan; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createSubscription_decorators, { kind: "method", name: "createSubscription", static: false, private: false, access: { has: function (obj) { return "createSubscription" in obj; }, get: function (obj) { return obj.createSubscription; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listSubscriptions_decorators, { kind: "method", name: "listSubscriptions", static: false, private: false, access: { has: function (obj) { return "listSubscriptions" in obj; }, get: function (obj) { return obj.listSubscriptions; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getSubscription_decorators, { kind: "method", name: "getSubscription", static: false, private: false, access: { has: function (obj) { return "getSubscription" in obj; }, get: function (obj) { return obj.getSubscription; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _cancelSubscription_decorators, { kind: "method", name: "cancelSubscription", static: false, private: false, access: { has: function (obj) { return "cancelSubscription" in obj; }, get: function (obj) { return obj.cancelSubscription; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SubscriptionController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SubscriptionController = _classThis;
}();
exports.SubscriptionController = SubscriptionController;
