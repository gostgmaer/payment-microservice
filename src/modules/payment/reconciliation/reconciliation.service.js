"use strict";
/**
 * ReconciliationService
 *
 * Periodically reconciles the internal DB state against each provider's API.
 * Catches cases where:
 *  - A webhook was never delivered (payment shows as PENDING internally but PAID on provider).
 *  - A payment was captured on provider but failed webhook verification.
 *
 * Run as a cron job (configurable via RECONCILIATION_CRON env var).
 * Safe to run concurrently on multiple instances (Redis lock prevents duplicate runs).
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
exports.ReconciliationService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var dayjs_1 = require("dayjs");
var RECONCILIATION_LOCK = 'reconciliation:lock';
var ReconciliationService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ReconciliationService = _classThis = /** @class */ (function () {
        function ReconciliationService_1(prisma, orchestrator, attemptService, config, redis) {
            this.prisma = prisma;
            this.orchestrator = orchestrator;
            this.attemptService = attemptService;
            this.config = config;
            this.redis = redis;
            this.logger = new common_1.Logger(ReconciliationService.name);
        }
        /**
         * Find PROCESSING transactions older than 30 minutes and verify them
         * against provider APIs. This catches missed/delayed webhooks.
         */
        ReconciliationService_1.prototype.reconcileStaleTransactions = function () {
            return __awaiter(this, void 0, void 0, function () {
                var acquired, staleThreshold, staleTransactions, recovered, failed, _i, staleTransactions_1, tx, _a, _b, attempt, result, err_1, expiredCount;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.redis.set(RECONCILIATION_LOCK, '1', 'EX', 300, // 5 min TTL
                            'NX')];
                        case 1:
                            acquired = _c.sent();
                            if (!acquired) {
                                this.logger.log('Reconciliation already running on another instance — skipping');
                                return [2 /*return*/, { checked: 0, recovered: 0, failed: 0 }];
                            }
                            _c.label = 2;
                        case 2:
                            _c.trys.push([2, , 13, 15]);
                            staleThreshold = (0, dayjs_1.default)().subtract(30, 'minute').toDate();
                            return [4 /*yield*/, this.prisma.transaction.findMany({
                                    where: {
                                        status: client_1.TransactionStatus.PROCESSING,
                                        updatedAt: { lt: staleThreshold },
                                    },
                                    include: {
                                        attempts: {
                                            where: { status: { in: [client_1.AttemptStatus.PENDING, client_1.AttemptStatus.PROCESSING] } },
                                        },
                                    },
                                    take: 100, // process in batches
                                })];
                        case 3:
                            staleTransactions = _c.sent();
                            recovered = 0;
                            failed = 0;
                            _i = 0, staleTransactions_1 = staleTransactions;
                            _c.label = 4;
                        case 4:
                            if (!(_i < staleTransactions_1.length)) return [3 /*break*/, 11];
                            tx = staleTransactions_1[_i];
                            _a = 0, _b = tx.attempts;
                            _c.label = 5;
                        case 5:
                            if (!(_a < _b.length)) return [3 /*break*/, 10];
                            attempt = _b[_a];
                            _c.label = 6;
                        case 6:
                            _c.trys.push([6, 8, , 9]);
                            return [4 /*yield*/, this.orchestrator.verifyPayment({
                                    transactionId: tx.id,
                                    attemptId: attempt.id,
                                    actorId: 'reconciliation-worker',
                                })];
                        case 7:
                            result = _c.sent();
                            if (result.success)
                                recovered++;
                            else
                                failed++;
                            return [3 /*break*/, 9];
                        case 8:
                            err_1 = _c.sent();
                            this.logger.error("Reconciliation failed for attempt ".concat(attempt.id, ": ").concat(err_1.message));
                            failed++;
                            return [3 /*break*/, 9];
                        case 9:
                            _a++;
                            return [3 /*break*/, 5];
                        case 10:
                            _i++;
                            return [3 /*break*/, 4];
                        case 11: return [4 /*yield*/, this.attemptService.expireStalePendingAttempts()];
                        case 12:
                            expiredCount = _c.sent();
                            if (expiredCount > 0) {
                                this.logger.log("Expired ".concat(expiredCount, " stale payment attempts"));
                            }
                            this.logger.log("Reconciliation complete: checked=".concat(staleTransactions.length, ", recovered=").concat(recovered, ", failed=").concat(failed));
                            return [2 /*return*/, { checked: staleTransactions.length, recovered: recovered, failed: failed }];
                        case 13: return [4 /*yield*/, this.redis.del(RECONCILIATION_LOCK)];
                        case 14:
                            _c.sent();
                            return [7 /*endfinally*/];
                        case 15: return [2 /*return*/];
                    }
                });
            });
        };
        return ReconciliationService_1;
    }());
    __setFunctionName(_classThis, "ReconciliationService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ReconciliationService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ReconciliationService = _classThis;
}();
exports.ReconciliationService = ReconciliationService;
