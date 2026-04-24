"use strict";
/**
 * TransactionService Unit Tests
 *
 * Tests idempotency, creation, and status transitions.
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
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var transaction_service_1 = require("./transaction.service");
var prisma_service_1 = require("../../../prisma/prisma.service");
var mockPrismaService = {
    transaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
    },
    $transaction: jest.fn(),
};
describe('TransactionService', function () {
    var service;
    var mockTransaction = {
        id: 'tx-uuid-1',
        orderId: 'order-001',
        idempotencyKey: 'hashed-key',
        customerId: 'customer-001',
        amount: BigInt(49900),
        currency: 'INR',
        status: client_1.TransactionStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        var module;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, testing_1.Test.createTestingModule({
                        providers: [
                            transaction_service_1.TransactionService,
                            { provide: prisma_service_1.PrismaService, useValue: mockPrismaService },
                        ],
                    }).compile()];
                case 1:
                    module = _a.sent();
                    service = module.get(transaction_service_1.TransactionService);
                    // Reset mocks between tests
                    jest.clearAllMocks();
                    return [2 /*return*/];
            }
        });
    }); });
    describe('create()', function () {
        it('should create a new transaction', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockPrismaService.transaction.findUnique.mockResolvedValue(null);
                        mockPrismaService.transaction.create.mockResolvedValue(mockTransaction);
                        return [4 /*yield*/, service.create({
                                orderId: 'order-001',
                                idempotencyKey: 'raw-key-123',
                                customerId: 'customer-001',
                                amount: BigInt(49900),
                                currency: 'INR',
                            })];
                    case 1:
                        result = _a.sent();
                        expect(result.id).toBe('tx-uuid-1');
                        expect(result.status).toBe(client_1.TransactionStatus.PENDING);
                        expect(mockPrismaService.transaction.create).toHaveBeenCalledTimes(1);
                        return [2 /*return*/];
                }
            });
        }); });
        it('should return existing transaction on idempotency replay', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);
                        return [4 /*yield*/, service.create({
                                orderId: 'order-001',
                                idempotencyKey: 'raw-key-123',
                                customerId: 'customer-001',
                                amount: BigInt(49900),
                                currency: 'INR',
                            })];
                    case 1:
                        result = _a.sent();
                        // Should return cached result without creating
                        expect(result.id).toBe('tx-uuid-1');
                        expect(mockPrismaService.transaction.create).not.toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw ConflictException on duplicate orderId', function () { return __awaiter(void 0, void 0, void 0, function () {
            var prismaError;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockPrismaService.transaction.findUnique.mockResolvedValue(null);
                        prismaError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
                        mockPrismaService.transaction.create.mockRejectedValue(prismaError);
                        return [4 /*yield*/, expect(service.create({
                                orderId: 'order-001',
                                idempotencyKey: 'different-key',
                                customerId: 'customer-001',
                                amount: BigInt(49900),
                                currency: 'INR',
                            })).rejects.toThrow(common_1.ConflictException)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('findById()', function () {
        it('should return transaction when found', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockPrismaService.transaction.findUnique.mockResolvedValue(__assign(__assign({}, mockTransaction), { attempts: [], invoice: null }));
                        return [4 /*yield*/, service.findById('tx-uuid-1')];
                    case 1:
                        result = _a.sent();
                        expect(result.id).toBe('tx-uuid-1');
                        return [2 /*return*/];
                }
            });
        }); });
        it('should throw NotFoundException when not found', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        mockPrismaService.transaction.findUnique.mockResolvedValue(null);
                        return [4 /*yield*/, expect(service.findById('non-existent')).rejects.toThrow(common_1.NotFoundException)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    describe('updateStatus()', function () {
        it('should update transaction status', function () { return __awaiter(void 0, void 0, void 0, function () {
            var updated, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        updated = __assign(__assign({}, mockTransaction), { status: client_1.TransactionStatus.SUCCESS });
                        mockPrismaService.transaction.update.mockResolvedValue(updated);
                        return [4 /*yield*/, service.updateStatus('tx-uuid-1', client_1.TransactionStatus.SUCCESS)];
                    case 1:
                        result = _a.sent();
                        expect(result.status).toBe(client_1.TransactionStatus.SUCCESS);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
