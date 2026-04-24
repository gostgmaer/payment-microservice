"use strict";
/**
 * LedgerService — Double-Entry Accounting
 *
 * Every financial event creates two immutable ledger entries:
 *  - A DEBIT  to an asset/expense account
 *  - A CREDIT to a liability/revenue account
 *
 * This preserves the accounting equation (Assets = Liabilities + Equity)
 * and enables complete auditability and reconciliation.
 *
 * Accounts used:
 *  ACCOUNTS_RECEIVABLE  — amount owed by customers
 *  REVENUE              — earned income
 *  CASH                 — collected cash
 *  REFUND_LIABILITY     — amount owed back to customers
 *  TAX_PAYABLE          — GST/tax amounts owed to government
 *
 * Entries are NEVER updated or deleted — immutable append-only log.
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
exports.LedgerService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var LedgerService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LedgerService = _classThis = /** @class */ (function () {
        function LedgerService_1(prisma) {
            this.prisma = prisma;
            this.logger = new common_1.Logger(LedgerService.name);
        }
        /**
         * Record a successful payment as double-entry:
         *  DR ACCOUNTS_RECEIVABLE  (asset increase — we are owed the money)
         *  CR REVENUE               (income earned)
         *
         * If tax is included, additionally:
         *  DR ACCOUNTS_RECEIVABLE  (for tax portion)
         *  CR TAX_PAYABLE           (liability — we owe this to the government)
         */
        LedgerService_1.prototype.recordPayment = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var client, baseAmount, entries;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            client = (_a = input.tx) !== null && _a !== void 0 ? _a : this.prisma;
                            baseAmount = input.taxAmount
                                ? input.amount - input.taxAmount
                                : input.amount;
                            entries = [
                                // Main payment entry
                                {
                                    transactionId: input.transactionId,
                                    type: client_1.EntryType.PAYMENT,
                                    debitAccount: 'ACCOUNTS_RECEIVABLE',
                                    creditAccount: 'REVENUE',
                                    amount: baseAmount,
                                    currency: input.currency,
                                    description: input.description,
                                },
                            ];
                            // Tax entry (if applicable)
                            if (input.taxAmount && input.taxAmount > 0n) {
                                entries.push({
                                    transactionId: input.transactionId,
                                    type: client_1.EntryType.TAX,
                                    debitAccount: 'ACCOUNTS_RECEIVABLE',
                                    creditAccount: 'TAX_PAYABLE',
                                    amount: input.taxAmount,
                                    currency: input.currency,
                                    description: "Tax for ".concat(input.description),
                                });
                            }
                            return [4 /*yield*/, client.ledgerEntry.createMany({ data: entries })];
                        case 1:
                            _b.sent();
                            this.logger.log("Recorded ".concat(entries.length, " ledger entries for transaction ").concat(input.transactionId));
                            return [2 /*return*/, client.ledgerEntry.findMany({ where: { transactionId: input.transactionId } })];
                    }
                });
            });
        };
        /**
         * Record a refund as double-entry (reverse of payment):
         *  DR REVENUE               (reduce earned income)
         *  CR ACCOUNTS_RECEIVABLE   (reduce amount owed)
         *
         * And when cash is returned:
         *  DR REFUND_LIABILITY      (record the obligation)
         *  CR CASH                  (cash leaving)
         */
        LedgerService_1.prototype.recordRefund = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var client, entries;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            client = (_a = input.tx) !== null && _a !== void 0 ? _a : this.prisma;
                            entries = [
                                {
                                    transactionId: input.transactionId,
                                    type: client_1.EntryType.REFUND,
                                    debitAccount: 'REVENUE',
                                    creditAccount: 'ACCOUNTS_RECEIVABLE',
                                    amount: input.amount,
                                    currency: input.currency,
                                    description: input.description,
                                },
                                {
                                    transactionId: input.transactionId,
                                    type: client_1.EntryType.REFUND,
                                    debitAccount: 'REFUND_LIABILITY',
                                    creditAccount: 'CASH',
                                    amount: input.amount,
                                    currency: input.currency,
                                    description: "Cash refunded: ".concat(input.description),
                                },
                            ];
                            return [4 /*yield*/, client.ledgerEntry.createMany({ data: entries })];
                        case 1:
                            _b.sent();
                            this.logger.log("Recorded refund ledger entries for transaction ".concat(input.transactionId));
                            return [2 /*return*/, client.ledgerEntry.findMany({
                                    where: { transactionId: input.transactionId, type: client_1.EntryType.REFUND },
                                })];
                    }
                });
            });
        };
        /** Get all ledger entries for a transaction. */
        LedgerService_1.prototype.getByTransaction = function (transactionId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.ledgerEntry.findMany({
                            where: { transactionId: transactionId },
                            orderBy: { createdAt: 'asc' },
                        })];
                });
            });
        };
        /**
         * Calculate the balance for an account within a date range.
         * Used for reconciliation reports.
         */
        LedgerService_1.prototype.getAccountBalance = function (account, currency, from, to) {
            return __awaiter(this, void 0, void 0, function () {
                var where, entries, debit, credit, _i, entries_1, entry;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            where = {
                                currency: currency,
                                createdAt: { gte: from, lte: to },
                                OR: [{ debitAccount: account }, { creditAccount: account }],
                            };
                            return [4 /*yield*/, this.prisma.ledgerEntry.findMany({ where: where })];
                        case 1:
                            entries = _a.sent();
                            debit = 0n;
                            credit = 0n;
                            for (_i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
                                entry = entries_1[_i];
                                if (entry.debitAccount === account)
                                    debit += entry.amount;
                                if (entry.creditAccount === account)
                                    credit += entry.amount;
                            }
                            return [2 /*return*/, { debit: debit, credit: credit, net: debit - credit }];
                    }
                });
            });
        };
        return LedgerService_1;
    }());
    __setFunctionName(_classThis, "LedgerService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerService = _classThis;
}();
exports.LedgerService = LedgerService;
