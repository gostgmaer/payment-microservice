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
exports.BillingController = exports.CreateInvoiceDto = exports.InvoiceItemDto = void 0;
var openapi = require("@nestjs/swagger");
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var class_validator_1 = require("class-validator");
var class_transformer_1 = require("class-transformer");
var swagger_2 = require("@nestjs/swagger");
var jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
var InvoiceItemDto = function () {
    var _a;
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _quantity_decorators;
    var _quantity_initializers = [];
    var _quantity_extraInitializers = [];
    var _unitAmountRaw_decorators;
    var _unitAmountRaw_initializers = [];
    var _unitAmountRaw_extraInitializers = [];
    var _gstType_decorators;
    var _gstType_initializers = [];
    var _gstType_extraInitializers = [];
    var _gstRate_decorators;
    var _gstRate_initializers = [];
    var _gstRate_extraInitializers = [];
    var _metadata_decorators;
    var _metadata_initializers = [];
    var _metadata_extraInitializers = [];
    return _a = /** @class */ (function () {
            function InvoiceItemDto() {
                this.description = __runInitializers(this, _description_initializers, void 0);
                this.quantity = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _quantity_initializers, void 0));
                this.unitAmountRaw = (__runInitializers(this, _quantity_extraInitializers), __runInitializers(this, _unitAmountRaw_initializers, void 0));
                this.gstType = (__runInitializers(this, _unitAmountRaw_extraInitializers), __runInitializers(this, _gstType_initializers, void 0));
                this.gstRate = (__runInitializers(this, _gstType_extraInitializers), __runInitializers(this, _gstRate_initializers, void 0));
                this.metadata = (__runInitializers(this, _gstRate_extraInitializers), __runInitializers(this, _metadata_initializers, void 0));
                __runInitializers(this, _metadata_extraInitializers);
            }
            Object.defineProperty(InvoiceItemDto.prototype, "unitAmount", {
                get: function () { return BigInt(this.unitAmountRaw); },
                enumerable: false,
                configurable: true
            });
            return InvoiceItemDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _description_decorators = [(0, swagger_2.ApiProperty)(), (0, class_validator_1.IsString)()];
            _quantity_decorators = [(0, swagger_2.ApiProperty)(), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(1), (0, class_transformer_1.Type)(function () { return Number; })];
            _unitAmountRaw_decorators = [(0, swagger_2.ApiProperty)({ description: 'Unit price in smallest currency unit' }), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(1), (0, class_transformer_1.Type)(function () { return Number; })];
            _gstType_decorators = [(0, swagger_2.ApiPropertyOptional)({ enum: ['intra', 'inter'] }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsEnum)(['intra', 'inter'])];
            _gstRate_decorators = [(0, swagger_2.ApiPropertyOptional)({ description: 'Total GST rate %', example: 18 }), (0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)(), (0, class_transformer_1.Type)(function () { return Number; })];
            _metadata_decorators = [(0, swagger_2.ApiPropertyOptional)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _quantity_decorators, { kind: "field", name: "quantity", static: false, private: false, access: { has: function (obj) { return "quantity" in obj; }, get: function (obj) { return obj.quantity; }, set: function (obj, value) { obj.quantity = value; } }, metadata: _metadata }, _quantity_initializers, _quantity_extraInitializers);
            __esDecorate(null, null, _unitAmountRaw_decorators, { kind: "field", name: "unitAmountRaw", static: false, private: false, access: { has: function (obj) { return "unitAmountRaw" in obj; }, get: function (obj) { return obj.unitAmountRaw; }, set: function (obj, value) { obj.unitAmountRaw = value; } }, metadata: _metadata }, _unitAmountRaw_initializers, _unitAmountRaw_extraInitializers);
            __esDecorate(null, null, _gstType_decorators, { kind: "field", name: "gstType", static: false, private: false, access: { has: function (obj) { return "gstType" in obj; }, get: function (obj) { return obj.gstType; }, set: function (obj, value) { obj.gstType = value; } }, metadata: _metadata }, _gstType_initializers, _gstType_extraInitializers);
            __esDecorate(null, null, _gstRate_decorators, { kind: "field", name: "gstRate", static: false, private: false, access: { has: function (obj) { return "gstRate" in obj; }, get: function (obj) { return obj.gstRate; }, set: function (obj, value) { obj.gstRate = value; } }, metadata: _metadata }, _gstRate_initializers, _gstRate_extraInitializers);
            __esDecorate(null, null, _metadata_decorators, { kind: "field", name: "metadata", static: false, private: false, access: { has: function (obj) { return "metadata" in obj; }, get: function (obj) { return obj.metadata; }, set: function (obj, value) { obj.metadata = value; } }, metadata: _metadata }, _metadata_initializers, _metadata_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.InvoiceItemDto = InvoiceItemDto;
var CreateInvoiceDto = function () {
    var _a;
    var _currency_decorators;
    var _currency_initializers = [];
    var _currency_extraInitializers = [];
    var _items_decorators;
    var _items_initializers = [];
    var _items_extraInitializers = [];
    var _dueDate_decorators;
    var _dueDate_initializers = [];
    var _dueDate_extraInitializers = [];
    var _metadata_decorators;
    var _metadata_initializers = [];
    var _metadata_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateInvoiceDto() {
                this.currency = __runInitializers(this, _currency_initializers, void 0);
                this.items = (__runInitializers(this, _currency_extraInitializers), __runInitializers(this, _items_initializers, void 0));
                this.dueDate = (__runInitializers(this, _items_extraInitializers), __runInitializers(this, _dueDate_initializers, void 0));
                this.metadata = (__runInitializers(this, _dueDate_extraInitializers), __runInitializers(this, _metadata_initializers, void 0));
                __runInitializers(this, _metadata_extraInitializers);
            }
            return CreateInvoiceDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _currency_decorators = [(0, swagger_2.ApiProperty)(), (0, class_validator_1.IsString)()];
            _items_decorators = [(0, swagger_2.ApiProperty)({ type: [InvoiceItemDto] }), (0, class_validator_1.IsArray)(), (0, class_validator_1.ValidateNested)({ each: true }), (0, class_transformer_1.Type)(function () { return InvoiceItemDto; })];
            _dueDate_decorators = [(0, swagger_2.ApiPropertyOptional)(), (0, class_validator_1.IsOptional)()];
            _metadata_decorators = [(0, swagger_2.ApiPropertyOptional)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _currency_decorators, { kind: "field", name: "currency", static: false, private: false, access: { has: function (obj) { return "currency" in obj; }, get: function (obj) { return obj.currency; }, set: function (obj, value) { obj.currency = value; } }, metadata: _metadata }, _currency_initializers, _currency_extraInitializers);
            __esDecorate(null, null, _items_decorators, { kind: "field", name: "items", static: false, private: false, access: { has: function (obj) { return "items" in obj; }, get: function (obj) { return obj.items; }, set: function (obj, value) { obj.items = value; } }, metadata: _metadata }, _items_initializers, _items_extraInitializers);
            __esDecorate(null, null, _dueDate_decorators, { kind: "field", name: "dueDate", static: false, private: false, access: { has: function (obj) { return "dueDate" in obj; }, get: function (obj) { return obj.dueDate; }, set: function (obj, value) { obj.dueDate = value; } }, metadata: _metadata }, _dueDate_initializers, _dueDate_extraInitializers);
            __esDecorate(null, null, _metadata_decorators, { kind: "field", name: "metadata", static: false, private: false, access: { has: function (obj) { return "metadata" in obj; }, get: function (obj) { return obj.metadata; }, set: function (obj, value) { obj.metadata = value; } }, metadata: _metadata }, _metadata_initializers, _metadata_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateInvoiceDto = CreateInvoiceDto;
var BillingController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('Billing'), (0, swagger_1.ApiBearerAuth)(), (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard), (0, common_1.Controller)('billing')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _createInvoice_decorators;
    var _issueInvoice_decorators;
    var _voidInvoice_decorators;
    var _getInvoice_decorators;
    var _listInvoices_decorators;
    var BillingController = _classThis = /** @class */ (function () {
        function BillingController_1(billingService) {
            this.billingService = (__runInitializers(this, _instanceExtraInitializers), billingService);
        }
        BillingController_1.prototype.createInvoice = function (dto, user) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.billingService.createInvoice({
                            customerId: user.sub,
                            currency: dto.currency,
                            items: dto.items.map(function (i) { return (__assign(__assign({}, i), { unitAmount: BigInt(i.unitAmountRaw) })); }),
                            dueDate: dto.dueDate,
                            metadata: dto.metadata,
                            actorId: user.sub,
                        })];
                });
            });
        };
        BillingController_1.prototype.issueInvoice = function (id, user) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.billingService.issueInvoice(id, user.sub)];
                });
            });
        };
        BillingController_1.prototype.voidInvoice = function (id, user) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.billingService.voidInvoice(id, user.sub)];
                });
            });
        };
        BillingController_1.prototype.getInvoice = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.billingService.findById(id)];
                });
            });
        };
        BillingController_1.prototype.listInvoices = function (user_1) {
            return __awaiter(this, arguments, void 0, function (user, page, limit) {
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 20; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.billingService.findByCustomer(user.sub, +page, +limit)];
                });
            });
        };
        return BillingController_1;
    }());
    __setFunctionName(_classThis, "BillingController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _createInvoice_decorators = [(0, common_1.Post)('invoices'), (0, common_1.HttpCode)(common_1.HttpStatus.CREATED), (0, swagger_1.ApiOperation)({ summary: 'Create a new invoice (DRAFT)' }), openapi.ApiResponse({ status: common_1.HttpStatus.CREATED, type: Object })];
        _issueInvoice_decorators = [(0, common_1.Patch)('invoices/:id/issue'), (0, swagger_1.ApiOperation)({ summary: 'Issue a DRAFT invoice (makes it payable)' }), openapi.ApiResponse({ status: 200 })];
        _voidInvoice_decorators = [(0, common_1.Patch)('invoices/:id/void'), (0, swagger_1.ApiOperation)({ summary: 'Void an invoice' }), openapi.ApiResponse({ status: 200 })];
        _getInvoice_decorators = [(0, common_1.Get)('invoices/:id'), (0, swagger_1.ApiOperation)({ summary: 'Get invoice details' }), openapi.ApiResponse({ status: 200, type: Object })];
        _listInvoices_decorators = [(0, common_1.Get)('invoices'), (0, swagger_1.ApiOperation)({ summary: 'List invoices for current customer' }), openapi.ApiResponse({ status: 200 })];
        __esDecorate(_classThis, null, _createInvoice_decorators, { kind: "method", name: "createInvoice", static: false, private: false, access: { has: function (obj) { return "createInvoice" in obj; }, get: function (obj) { return obj.createInvoice; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _issueInvoice_decorators, { kind: "method", name: "issueInvoice", static: false, private: false, access: { has: function (obj) { return "issueInvoice" in obj; }, get: function (obj) { return obj.issueInvoice; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _voidInvoice_decorators, { kind: "method", name: "voidInvoice", static: false, private: false, access: { has: function (obj) { return "voidInvoice" in obj; }, get: function (obj) { return obj.voidInvoice; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getInvoice_decorators, { kind: "method", name: "getInvoice", static: false, private: false, access: { has: function (obj) { return "getInvoice" in obj; }, get: function (obj) { return obj.getInvoice; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listInvoices_decorators, { kind: "method", name: "listInvoices", static: false, private: false, access: { has: function (obj) { return "listInvoices" in obj; }, get: function (obj) { return obj.listInvoices; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BillingController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BillingController = _classThis;
}();
exports.BillingController = BillingController;
