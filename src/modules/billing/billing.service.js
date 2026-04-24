"use strict";
/**
 * BillingService
 *
 * Manages invoice lifecycle: DRAFT → ISSUED → PAID → FAILED → VOID
 *
 * Invoice must always be created BEFORE payment initiation.
 * GST calculation supports:
 *  - Intra-state: CGST + SGST (each at half the total rate)
 *  - Inter-state: IGST (full rate)
 *
 * All amounts stored as BigInt in smallest currency unit.
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
exports.BillingService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var decimal_js_1 = require("decimal.js");
var error_codes_constant_1 = require("../../common/constants/error-codes.constant");
var BillingService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var BillingService = _classThis = /** @class */ (function () {
        function BillingService_1(prisma, auditService) {
            this.prisma = prisma;
            this.auditService = auditService;
            this.logger = new common_1.Logger(BillingService.name);
        }
        /** Create invoice in DRAFT status with GST-calculated line items. */
        BillingService_1.prototype.createInvoice = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var invoiceNumber, processedItems, subtotal, taxAmount, totalAmount, invoice;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.generateInvoiceNumber()];
                        case 1:
                            invoiceNumber = _a.sent();
                            processedItems = dto.items.map(function (item) { return _this.calculateItem(item); });
                            subtotal = processedItems.reduce(function (sum, i) { return sum + i.amount; }, 0n);
                            taxAmount = processedItems.reduce(function (sum, i) { return sum + i.totalTax; }, 0n);
                            totalAmount = subtotal + taxAmount;
                            return [4 /*yield*/, this.prisma.withTransaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var inv, itemData;
                                    var _a;
                                    return __generator(this, function (_b) {
                                        switch (_b.label) {
                                            case 0: return [4 /*yield*/, tx.invoice.create({
                                                    data: {
                                                        invoiceNumber: invoiceNumber,
                                                        customerId: dto.customerId,
                                                        currency: dto.currency,
                                                        subtotal: subtotal,
                                                        taxAmount: taxAmount,
                                                        totalAmount: totalAmount,
                                                        dueDate: dto.dueDate,
                                                        status: client_1.InvoiceStatus.DRAFT,
                                                        metadata: (_a = dto.metadata) !== null && _a !== void 0 ? _a : client_1.Prisma.JsonNull,
                                                    },
                                                })];
                                            case 1:
                                                inv = _b.sent();
                                                itemData = processedItems.map(function (item) {
                                                    var _a, _b, _c, _d;
                                                    return ({
                                                        invoiceId: inv.id,
                                                        description: item.description,
                                                        quantity: item.quantity,
                                                        unitAmount: item.unitAmount,
                                                        amount: item.amount,
                                                        cgstRate: item.cgstRate ? new decimal_js_1.default(item.cgstRate) : null,
                                                        sgstRate: item.sgstRate ? new decimal_js_1.default(item.sgstRate) : null,
                                                        igstRate: item.igstRate ? new decimal_js_1.default(item.igstRate) : null,
                                                        cgstAmount: (_a = item.cgstAmount) !== null && _a !== void 0 ? _a : null,
                                                        sgstAmount: (_b = item.sgstAmount) !== null && _b !== void 0 ? _b : null,
                                                        igstAmount: (_c = item.igstAmount) !== null && _c !== void 0 ? _c : null,
                                                        metadata: (_d = item.metadata) !== null && _d !== void 0 ? _d : client_1.Prisma.JsonNull,
                                                    });
                                                });
                                                return [4 /*yield*/, tx.invoiceItem.createMany({ data: itemData })];
                                            case 2:
                                                _b.sent();
                                                return [2 /*return*/, inv];
                                        }
                                    });
                                }); })];
                        case 2:
                            invoice = _a.sent();
                            return [4 /*yield*/, this.auditService.log({
                                    actor: dto.actorId,
                                    action: 'INVOICE_CREATED',
                                    resourceType: 'Invoice',
                                    resourceId: invoice.id,
                                    newState: { invoiceNumber: invoiceNumber, totalAmount: totalAmount.toString(), status: client_1.InvoiceStatus.DRAFT },
                                })];
                        case 3:
                            _a.sent();
                            this.logger.log("Invoice ".concat(invoiceNumber, " created (total: ").concat(totalAmount, " ").concat(dto.currency, ")"));
                            return [2 /*return*/, this.prisma.invoice.findUniqueOrThrow({
                                    where: { id: invoice.id },
                                    include: { items: true },
                                })];
                    }
                });
            });
        };
        /** Issue a DRAFT invoice (makes it payable). */
        BillingService_1.prototype.issueInvoice = function (id, actorId) {
            return __awaiter(this, void 0, void 0, function () {
                var invoice, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.findById(id)];
                        case 1:
                            invoice = _a.sent();
                            if (invoice.status !== client_1.InvoiceStatus.DRAFT) {
                                throw new common_1.BadRequestException({
                                    message: "Cannot issue invoice in ".concat(invoice.status, " status"),
                                    errorCode: error_codes_constant_1.ERROR_CODES.INVOICE_NOT_ISSUABLE,
                                });
                            }
                            return [4 /*yield*/, this.prisma.invoice.update({
                                    where: { id: id },
                                    data: { status: client_1.InvoiceStatus.ISSUED },
                                })];
                        case 2:
                            updated = _a.sent();
                            return [4 /*yield*/, this.auditService.log({
                                    actor: actorId,
                                    action: 'INVOICE_ISSUED',
                                    resourceType: 'Invoice',
                                    resourceId: id,
                                    oldState: { status: client_1.InvoiceStatus.DRAFT },
                                    newState: { status: client_1.InvoiceStatus.ISSUED },
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, updated];
                    }
                });
            });
        };
        /** Mark invoice as PAID (called after successful payment). */
        BillingService_1.prototype.markPaid = function (id, tx) {
            return __awaiter(this, void 0, void 0, function () {
                var client;
                return __generator(this, function (_a) {
                    client = tx !== null && tx !== void 0 ? tx : this.prisma;
                    return [2 /*return*/, client.invoice.update({
                            where: { id: id },
                            data: { status: client_1.InvoiceStatus.PAID, paidAt: new Date() },
                        })];
                });
            });
        };
        /** Void an invoice (no further processing). */
        BillingService_1.prototype.voidInvoice = function (id, actorId) {
            return __awaiter(this, void 0, void 0, function () {
                var invoice, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.findById(id)];
                        case 1:
                            invoice = _a.sent();
                            if (invoice.status === client_1.InvoiceStatus.PAID) {
                                throw new common_1.BadRequestException({ message: 'Cannot void a paid invoice' });
                            }
                            return [4 /*yield*/, this.prisma.invoice.update({
                                    where: { id: id },
                                    data: { status: client_1.InvoiceStatus.VOID },
                                })];
                        case 2:
                            updated = _a.sent();
                            return [4 /*yield*/, this.auditService.log({
                                    actor: actorId,
                                    action: 'INVOICE_VOIDED',
                                    resourceType: 'Invoice',
                                    resourceId: id,
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, updated];
                    }
                });
            });
        };
        BillingService_1.prototype.findById = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var invoice;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.invoice.findUnique({
                                where: { id: id },
                                include: { items: true },
                            })];
                        case 1:
                            invoice = _a.sent();
                            if (!invoice)
                                throw new common_1.NotFoundException({ message: 'Invoice not found', errorCode: error_codes_constant_1.ERROR_CODES.INVOICE_NOT_FOUND });
                            return [2 /*return*/, invoice];
                    }
                });
            });
        };
        BillingService_1.prototype.findByCustomer = function (customerId_1) {
            return __awaiter(this, arguments, void 0, function (customerId, page, limit) {
                var skip, _a, data, total;
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 20; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            skip = (page - 1) * limit;
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.invoice.findMany({
                                        where: { customerId: customerId },
                                        orderBy: { createdAt: 'desc' },
                                        skip: skip,
                                        take: limit,
                                        include: { items: true },
                                    }),
                                    this.prisma.invoice.count({ where: { customerId: customerId } }),
                                ])];
                        case 1:
                            _a = _b.sent(), data = _a[0], total = _a[1];
                            return [2 /*return*/, { data: data, total: total }];
                    }
                });
            });
        };
        // ── Private helpers ─────────────────────────────────────────────────────
        BillingService_1.prototype.calculateItem = function (item) {
            var amount = BigInt(item.quantity) * item.unitAmount;
            var cgstRate;
            var sgstRate;
            var igstRate;
            var cgstAmount;
            var sgstAmount;
            var igstAmount;
            var totalTax = 0n;
            if (item.gstRate && item.gstRate > 0) {
                if (item.gstType === 'inter') {
                    // IGST = full rate
                    igstRate = item.gstRate;
                    igstAmount = this.calculateTax(amount, item.gstRate);
                    totalTax = igstAmount;
                }
                else {
                    // Intra-state: CGST = SGST = half rate
                    var halfRate = item.gstRate / 2;
                    cgstRate = halfRate;
                    sgstRate = halfRate;
                    cgstAmount = this.calculateTax(amount, halfRate);
                    sgstAmount = this.calculateTax(amount, halfRate);
                    totalTax = cgstAmount + sgstAmount;
                }
            }
            return {
                description: item.description,
                quantity: item.quantity,
                unitAmount: item.unitAmount,
                amount: amount,
                cgstRate: cgstRate,
                sgstRate: sgstRate,
                igstRate: igstRate,
                cgstAmount: cgstAmount,
                sgstAmount: sgstAmount,
                igstAmount: igstAmount,
                totalTax: totalTax,
                metadata: item.metadata,
            };
        };
        /** Calculate tax amount for a given base and rate. Rounds to nearest unit. */
        BillingService_1.prototype.calculateTax = function (amount, ratePercent) {
            var result = new decimal_js_1.default(amount.toString())
                .mul(ratePercent)
                .div(100)
                .toDecimalPlaces(0, decimal_js_1.default.ROUND_HALF_UP);
            return BigInt(result.toString());
        };
        BillingService_1.prototype.generateInvoiceNumber = function () {
            return __awaiter(this, void 0, void 0, function () {
                var now, prefix, count;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            now = new Date();
                            prefix = "INV-".concat(now.getFullYear()).concat(String(now.getMonth() + 1).padStart(2, '0'));
                            return [4 /*yield*/, this.prisma.invoice.count()];
                        case 1:
                            count = _a.sent();
                            return [2 /*return*/, "".concat(prefix, "-").concat(String(count + 1).padStart(8, '0'))];
                    }
                });
            });
        };
        return BillingService_1;
    }());
    __setFunctionName(_classThis, "BillingService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BillingService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BillingService = _classThis;
}();
exports.BillingService = BillingService;
