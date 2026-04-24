"use strict";
/**
 * LedgerService Unit Tests — Validates double-entry accounting correctness.
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
var testing_1 = require("@nestjs/testing");
var client_1 = require("@prisma/client");
var ledger_service_1 = require("./ledger.service");
var prisma_service_1 = require("../../prisma/prisma.service");
var mockPrismaService = {
    ledgerEntry: {
        createMany: jest.fn(),
        findMany: jest.fn(),
    },
};
describe('LedgerService', function () {
    var service;
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        var module;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, testing_1.Test.createTestingModule({
                        providers: [
                            ledger_service_1.LedgerService,
                            { provide: prisma_service_1.PrismaService, useValue: mockPrismaService },
                        ],
                    }).compile()];
                case 1:
                    module = _a.sent();
                    service = module.get(ledger_service_1.LedgerService);
                    jest.clearAllMocks();
                    return [2 /*return*/];
            }
        });
    }); });
    describe('recordPayment()', function () {
        it('should create one entry when no tax is provided', function () { return __awaiter(void 0, void 0, void 0, function () {
            var createManyCall;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockPrismaService.ledgerEntry.createMany.mockResolvedValue({ count: 1 });
                        mockPrismaService.ledgerEntry.findMany.mockResolvedValue([]);
                        return [4 /*yield*/, service.recordPayment({
                                transactionId: 'tx-1',
                                amount: BigInt(49900),
                                currency: 'INR',
                                description: 'Test payment',
                            })];
                    case 1:
                        _a.sent();
                        createManyCall = mockPrismaService.ledgerEntry.createMany.mock.calls[0][0];
                        expect(createManyCall.data).toHaveLength(1);
                        expect(createManyCall.data[0].type).toBe(client_1.EntryType.PAYMENT);
                        expect(createManyCall.data[0].debitAccount).toBe('ACCOUNTS_RECEIVABLE');
                        expect(createManyCall.data[0].creditAccount).toBe('REVENUE');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should create two entries when tax amount is provided', function () { return __awaiter(void 0, void 0, void 0, function () {
            var createManyCall;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockPrismaService.ledgerEntry.createMany.mockResolvedValue({ count: 2 });
                        mockPrismaService.ledgerEntry.findMany.mockResolvedValue([]);
                        return [4 /*yield*/, service.recordPayment({
                                transactionId: 'tx-1',
                                amount: BigInt(49900),
                                currency: 'INR',
                                description: 'Test payment with GST',
                                taxAmount: BigInt(7627), // 18% GST on 42373
                            })];
                    case 1:
                        _a.sent();
                        createManyCall = mockPrismaService.ledgerEntry.createMany.mock.calls[0][0];
                        expect(createManyCall.data).toHaveLength(2);
                        expect(createManyCall.data[0].creditAccount).toBe('REVENUE');
                        expect(createManyCall.data[1].creditAccount).toBe('TAX_PAYABLE');
                        expect(createManyCall.data[1].type).toBe(client_1.EntryType.TAX);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('recordRefund()', function () {
        it('should create two refund entries (reverse accounting)', function () { return __awaiter(void 0, void 0, void 0, function () {
            var createManyCall;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockPrismaService.ledgerEntry.createMany.mockResolvedValue({ count: 2 });
                        mockPrismaService.ledgerEntry.findMany.mockResolvedValue([]);
                        return [4 /*yield*/, service.recordRefund({
                                transactionId: 'tx-1',
                                amount: BigInt(49900),
                                currency: 'INR',
                                description: 'Customer refund',
                            })];
                    case 1:
                        _a.sent();
                        createManyCall = mockPrismaService.ledgerEntry.createMany.mock.calls[0][0];
                        expect(createManyCall.data).toHaveLength(2);
                        // First entry reverses REVENUE
                        expect(createManyCall.data[0].debitAccount).toBe('REVENUE');
                        expect(createManyCall.data[0].creditAccount).toBe('ACCOUNTS_RECEIVABLE');
                        // Second entry records cash outflow
                        expect(createManyCall.data[1].debitAccount).toBe('REFUND_LIABILITY');
                        expect(createManyCall.data[1].creditAccount).toBe('CASH');
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
