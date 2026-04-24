"use strict";
/**
 * TransactionService
 *
 * Source of truth for all payment transactions. Responsible for:
 *  - Creating transactions with idempotency enforcement
 *  - Status transitions (PENDING → PROCESSING → SUCCESS/FAILED)
 *  - SELECT … FOR UPDATE locking to prevent race conditions
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
exports.TransactionService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var crypto_util_1 = require("../../../common/utils/crypto.util");
var error_codes_constant_1 = require("../../../common/constants/error-codes.constant");
var TransactionService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var TransactionService = _classThis = /** @class */ (function () {
        function TransactionService_1(prisma) {
            this.prisma = prisma;
            this.logger = new common_1.Logger(TransactionService.name);
        }
        /**
         * Create a new transaction.
         * Hashes the idempotency key before storing — the raw key never touches DB.
         * Throws ConflictException if orderId or idempotencyKey already exists.
         */
        TransactionService_1.prototype.create = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var hashedKey, existing, err_1;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            hashedKey = (0, crypto_util_1.hashIdempotencyKey)(dto.idempotencyKey);
                            return [4 /*yield*/, this.prisma.transaction.findUnique({
                                    where: { idempotencyKey: hashedKey },
                                })];
                        case 1:
                            existing = _c.sent();
                            if (existing) {
                                this.logger.log("Idempotent replay for key hash ".concat(hashedKey.substring(0, 8), "\u2026"));
                                return [2 /*return*/, existing];
                            }
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, 4, , 5]);
                            return [4 /*yield*/, this.prisma.transaction.create({
                                    data: {
                                        orderId: dto.orderId,
                                        idempotencyKey: hashedKey,
                                        customerId: dto.customerId,
                                        amount: dto.amount,
                                        currency: dto.currency,
                                        invoiceId: (_a = dto.invoiceId) !== null && _a !== void 0 ? _a : null,
                                        status: client_1.TransactionStatus.PENDING,
                                        metadata: (_b = dto.metadata) !== null && _b !== void 0 ? _b : client_1.Prisma.JsonNull,
                                    },
                                })];
                        case 3: return [2 /*return*/, _c.sent()];
                        case 4:
                            err_1 = _c.sent();
                            if (err_1 instanceof client_1.Prisma.PrismaClientKnownRequestError && err_1.code === 'P2002') {
                                throw new common_1.ConflictException({
                                    message: 'A transaction for this order already exists',
                                    errorCode: error_codes_constant_1.ERROR_CODES.DUPLICATE_TRANSACTION,
                                });
                            }
                            throw err_1;
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        /** Find transaction by ID — throws if not found. */
        TransactionService_1.prototype.findById = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var tx;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.transaction.findUnique({
                                where: { id: id },
                                include: { attempts: true, invoice: true },
                            })];
                        case 1:
                            tx = _a.sent();
                            if (!tx)
                                throw new common_1.NotFoundException({ message: 'Transaction not found', errorCode: error_codes_constant_1.ERROR_CODES.PAYMENT_NOT_FOUND });
                            return [2 /*return*/, tx];
                    }
                });
            });
        };
        /** Find transaction by order ID. */
        TransactionService_1.prototype.findByOrderId = function (orderId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.transaction.findUnique({ where: { orderId: orderId } })];
                });
            });
        };
        /**
         * Transition transaction status.
         * Uses SELECT … FOR UPDATE (via $queryRaw) in a Prisma transaction to
         * prevent concurrent status updates from creating an inconsistent state.
         */
        TransactionService_1.prototype.updateStatus = function (id, status, tx) {
            return __awaiter(this, void 0, void 0, function () {
                var client;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            client = tx !== null && tx !== void 0 ? tx : this.prisma;
                            if (!tx) return [3 /*break*/, 2];
                            return [4 /*yield*/, tx.$executeRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["SELECT id FROM \"Transaction\" WHERE id = ", " FOR UPDATE"], ["SELECT id FROM \"Transaction\" WHERE id = ", " FOR UPDATE"])), id)];
                        case 1:
                            _a.sent();
                            _a.label = 2;
                        case 2: return [2 /*return*/, client.transaction.update({
                                where: { id: id },
                                data: { status: status },
                            })];
                    }
                });
            });
        };
        /** Paginated list by customer. */
        TransactionService_1.prototype.findByCustomer = function (customerId_1) {
            return __awaiter(this, arguments, void 0, function (customerId, page, limit) {
                var skip, _a, data, total;
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 20; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            skip = (page - 1) * limit;
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.transaction.findMany({
                                        where: { customerId: customerId },
                                        orderBy: { createdAt: 'desc' },
                                        skip: skip,
                                        take: limit,
                                        include: { attempts: true },
                                    }),
                                    this.prisma.transaction.count({ where: { customerId: customerId } }),
                                ])];
                        case 1:
                            _a = _b.sent(), data = _a[0], total = _a[1];
                            return [2 /*return*/, { data: data, total: total }];
                    }
                });
            });
        };
        return TransactionService_1;
    }());
    __setFunctionName(_classThis, "TransactionService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TransactionService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TransactionService = _classThis;
}();
exports.TransactionService = TransactionService;
var templateObject_1;
