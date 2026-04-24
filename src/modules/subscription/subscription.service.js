"use strict";
/**
 * SubscriptionService
 *
 * Manages subscription lifecycle: TRIALING → ACTIVE → PAST_DUE → CANCELLED → EXPIRED
 *
 * Renewal flow (triggered by BullMQ worker):
 *  1. Find subscriptions due for renewal.
 *  2. Create a new SubscriptionCycle.
 *  3. Create an Invoice for the cycle.
 *  4. Initiate payment via PaymentOrchestratorService.
 *  5. On success → advance currentPeriodEnd.
 *  6. On failure → increment retries, enter PAST_DUE if within grace period.
 *  7. After max retries → move to EXPIRED.
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
exports.SubscriptionService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var error_codes_constant_1 = require("../../common/constants/error-codes.constant");
var dayjs = require("dayjs");
var SubscriptionService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var SubscriptionService = _classThis = /** @class */ (function () {
        function SubscriptionService_1(prisma, billingService, auditService, config) {
            this.prisma = prisma;
            this.billingService = billingService;
            this.auditService = auditService;
            this.config = config;
            this.logger = new common_1.Logger(SubscriptionService.name);
        }
        SubscriptionService_1.prototype.createSubscription = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var plan, trialDays, now, trialEnd, periodStart, periodEnd, subscription;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.prisma.plan.findUnique({ where: { id: dto.planId } })];
                        case 1:
                            plan = _c.sent();
                            if (!plan)
                                throw new common_1.NotFoundException({ message: 'Plan not found', errorCode: error_codes_constant_1.ERROR_CODES.PLAN_NOT_FOUND });
                            if (!plan.isActive)
                                throw new common_1.BadRequestException({ message: 'Plan is inactive', errorCode: error_codes_constant_1.ERROR_CODES.PLAN_INACTIVE });
                            trialDays = (_a = dto.trialOverrideDays) !== null && _a !== void 0 ? _a : plan.trialDays;
                            now = new Date();
                            trialEnd = trialDays > 0 ? dayjs(now).add(trialDays, 'day').toDate() : undefined;
                            periodStart = trialEnd !== null && trialEnd !== void 0 ? trialEnd : now;
                            periodEnd = this.calculateNextPeriodEnd(periodStart, plan.interval, plan.intervalCount);
                            return [4 /*yield*/, this.prisma.subscription.create({
                                    data: {
                                        customerId: dto.customerId,
                                        planId: dto.planId,
                                        status: trialDays > 0 ? client_1.SubscriptionStatus.TRIALING : client_1.SubscriptionStatus.ACTIVE,
                                        currentPeriodStart: periodStart,
                                        currentPeriodEnd: periodEnd,
                                        trialStart: trialDays > 0 ? now : undefined,
                                        trialEnd: trialEnd !== null && trialEnd !== void 0 ? trialEnd : undefined,
                                        metadata: (_b = dto.metadata) !== null && _b !== void 0 ? _b : client_1.Prisma.JsonNull,
                                    },
                                    include: { plan: true },
                                })];
                        case 2:
                            subscription = _c.sent();
                            return [4 /*yield*/, this.auditService.log({
                                    actor: dto.actorId,
                                    action: 'SUBSCRIPTION_CREATED',
                                    resourceType: 'Subscription',
                                    resourceId: subscription.id,
                                    newState: { planId: dto.planId, status: subscription.status },
                                })];
                        case 3:
                            _c.sent();
                            this.logger.log("Subscription ".concat(subscription.id, " created for customer ").concat(dto.customerId));
                            return [2 /*return*/, subscription];
                    }
                });
            });
        };
        SubscriptionService_1.prototype.cancelSubscription = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var subscription, updated;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.findById(dto.subscriptionId)];
                        case 1:
                            subscription = _a.sent();
                            if (subscription.status === client_1.SubscriptionStatus.CANCELLED) {
                                throw new common_1.BadRequestException({
                                    message: 'Subscription is already cancelled',
                                    errorCode: error_codes_constant_1.ERROR_CODES.SUBSCRIPTION_ALREADY_CANCELLED,
                                });
                            }
                            return [4 /*yield*/, this.prisma.subscription.update({
                                    where: { id: dto.subscriptionId },
                                    data: {
                                        status: client_1.SubscriptionStatus.CANCELLED,
                                        cancelledAt: new Date(),
                                        cancelReason: dto.reason,
                                        // If not immediate, subscription remains active until end of current period
                                        currentPeriodEnd: dto.immediate ? new Date() : subscription.currentPeriodEnd,
                                    },
                                })];
                        case 2:
                            updated = _a.sent();
                            return [4 /*yield*/, this.auditService.log({
                                    actor: dto.actorId,
                                    action: 'SUBSCRIPTION_CANCELLED',
                                    resourceType: 'Subscription',
                                    resourceId: dto.subscriptionId,
                                    oldState: { status: subscription.status },
                                    newState: { status: client_1.SubscriptionStatus.CANCELLED, reason: dto.reason },
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, updated];
                    }
                });
            });
        };
        /**
         * Process renewal for a single subscription.
         * Called by the BullMQ subscription-renewal processor.
         */
        SubscriptionService_1.prototype.processRenewal = function (subscriptionId) {
            return __awaiter(this, void 0, void 0, function () {
                var subscription, renewableStatuses, plan, existingCycle, cycle, _a, invoice, nextPeriodStart, nextPeriodEnd, err_1, updatedCycle, gracePeriodEnd, isPastGracePeriod, exceedsRetries;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.findById(subscriptionId)];
                        case 1:
                            subscription = _b.sent();
                            renewableStatuses = [client_1.SubscriptionStatus.ACTIVE, client_1.SubscriptionStatus.PAST_DUE, client_1.SubscriptionStatus.TRIALING];
                            if (!renewableStatuses.includes(subscription.status)) {
                                throw new common_1.BadRequestException({
                                    message: "Subscription ".concat(subscriptionId, " is not renewable (status: ").concat(subscription.status, ")"),
                                    errorCode: error_codes_constant_1.ERROR_CODES.SUBSCRIPTION_NOT_RENEWABLE,
                                });
                            }
                            return [4 /*yield*/, this.prisma.plan.findUniqueOrThrow({ where: { id: subscription.planId } })];
                        case 2:
                            plan = _b.sent();
                            return [4 /*yield*/, this.prisma.subscriptionCycle.findFirst({
                                    where: {
                                        subscriptionId: subscriptionId,
                                        periodStart: subscription.currentPeriodStart,
                                        status: { not: client_1.CycleStatus.FAILED },
                                    },
                                })];
                        case 3:
                            existingCycle = _b.sent();
                            if ((existingCycle === null || existingCycle === void 0 ? void 0 : existingCycle.status) === client_1.CycleStatus.PAID) {
                                this.logger.log("Subscription ".concat(subscriptionId, " already renewed for current period"));
                                return [2 /*return*/];
                            }
                            if (!(existingCycle !== null && existingCycle !== void 0)) return [3 /*break*/, 4];
                            _a = existingCycle;
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, this.prisma.subscriptionCycle.create({
                                data: {
                                    subscriptionId: subscriptionId,
                                    periodStart: subscription.currentPeriodStart,
                                    periodEnd: subscription.currentPeriodEnd,
                                    amount: plan.amount,
                                    currency: plan.currency,
                                    status: client_1.CycleStatus.PROCESSING,
                                    attemptCount: 0,
                                },
                            })];
                        case 5:
                            _a = _b.sent();
                            _b.label = 6;
                        case 6:
                            cycle = _a;
                            // Update attempt count
                            return [4 /*yield*/, this.prisma.subscriptionCycle.update({
                                    where: { id: cycle.id },
                                    data: { status: client_1.CycleStatus.PROCESSING, attemptCount: { increment: 1 } },
                                })];
                        case 7:
                            // Update attempt count
                            _b.sent();
                            _b.label = 8;
                        case 8:
                            _b.trys.push([8, 15, , 21]);
                            return [4 /*yield*/, this.billingService.createInvoice({
                                    customerId: subscription.customerId,
                                    currency: plan.currency,
                                    items: [{
                                            description: "".concat(plan.name, " \u2014 ").concat(plan.interval, " subscription"),
                                            quantity: 1,
                                            unitAmount: plan.amount,
                                            gstType: 'intra',
                                            gstRate: 18, // 18% GST
                                        }],
                                    actorId: 'subscription-renewal-worker',
                                })];
                        case 9:
                            invoice = _b.sent();
                            return [4 /*yield*/, this.billingService.issueInvoice(invoice.id, 'subscription-renewal-worker')];
                        case 10:
                            _b.sent();
                            return [4 /*yield*/, this.prisma.subscriptionCycle.update({
                                    where: { id: cycle.id },
                                    data: { invoiceId: invoice.id },
                                })];
                        case 11:
                            _b.sent();
                            nextPeriodStart = subscription.currentPeriodEnd;
                            nextPeriodEnd = this.calculateNextPeriodEnd(nextPeriodStart, plan.interval, plan.intervalCount);
                            return [4 /*yield*/, this.prisma.subscription.update({
                                    where: { id: subscriptionId },
                                    data: {
                                        status: client_1.SubscriptionStatus.ACTIVE,
                                        currentPeriodStart: nextPeriodStart,
                                        currentPeriodEnd: nextPeriodEnd,
                                    },
                                })];
                        case 12:
                            _b.sent();
                            return [4 /*yield*/, this.prisma.subscriptionCycle.update({
                                    where: { id: cycle.id },
                                    data: { status: client_1.CycleStatus.PAID },
                                })];
                        case 13:
                            _b.sent();
                            return [4 /*yield*/, this.auditService.log({
                                    actor: 'subscription-renewal-worker',
                                    action: 'SUBSCRIPTION_RENEWED',
                                    resourceType: 'Subscription',
                                    resourceId: subscriptionId,
                                    newState: { cycleId: cycle.id, invoiceId: invoice.id, nextPeriodEnd: nextPeriodEnd },
                                })];
                        case 14:
                            _b.sent();
                            this.logger.log("Subscription ".concat(subscriptionId, " renewed successfully"));
                            return [3 /*break*/, 21];
                        case 15:
                            err_1 = _b.sent();
                            return [4 /*yield*/, this.prisma.subscriptionCycle.update({
                                    where: { id: cycle.id },
                                    data: { status: client_1.CycleStatus.FAILED },
                                })];
                        case 16:
                            updatedCycle = _b.sent();
                            gracePeriodEnd = dayjs(subscription.currentPeriodEnd)
                                .add(this.config.gracePeriodDays, 'day')
                                .toDate();
                            isPastGracePeriod = new Date() > gracePeriodEnd;
                            exceedsRetries = updatedCycle.attemptCount >= this.config.subscriptionMaxRetries;
                            if (!(isPastGracePeriod || exceedsRetries)) return [3 /*break*/, 18];
                            return [4 /*yield*/, this.prisma.subscription.update({
                                    where: { id: subscriptionId },
                                    data: { status: client_1.SubscriptionStatus.EXPIRED },
                                })];
                        case 17:
                            _b.sent();
                            this.logger.warn("Subscription ".concat(subscriptionId, " expired after failed renewal"));
                            return [3 /*break*/, 20];
                        case 18: return [4 /*yield*/, this.prisma.subscription.update({
                                where: { id: subscriptionId },
                                data: { status: client_1.SubscriptionStatus.PAST_DUE },
                            })];
                        case 19:
                            _b.sent();
                            _b.label = 20;
                        case 20: throw err_1;
                        case 21: return [2 /*return*/];
                    }
                });
            });
        };
        /** Find subscriptions due for renewal (currentPeriodEnd has passed). */
        SubscriptionService_1.prototype.findDueForRenewal = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.subscription.findMany({
                            where: {
                                status: { in: [client_1.SubscriptionStatus.ACTIVE, client_1.SubscriptionStatus.PAST_DUE] },
                                currentPeriodEnd: { lte: new Date() },
                            },
                        })];
                });
            });
        };
        SubscriptionService_1.prototype.findById = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var sub;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.subscription.findUnique({
                                where: { id: id },
                                include: { plan: true },
                            })];
                        case 1:
                            sub = _a.sent();
                            if (!sub)
                                throw new common_1.NotFoundException({ message: 'Subscription not found', errorCode: error_codes_constant_1.ERROR_CODES.SUBSCRIPTION_NOT_FOUND });
                            return [2 /*return*/, sub];
                    }
                });
            });
        };
        SubscriptionService_1.prototype.findByCustomer = function (customerId_1) {
            return __awaiter(this, arguments, void 0, function (customerId, page, limit) {
                var skip, _a, data, total;
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 20; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            skip = (page - 1) * limit;
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.subscription.findMany({
                                        where: { customerId: customerId },
                                        orderBy: { createdAt: 'desc' },
                                        skip: skip,
                                        take: limit,
                                        include: { plan: true },
                                    }),
                                    this.prisma.subscription.count({ where: { customerId: customerId } }),
                                ])];
                        case 1:
                            _a = _b.sent(), data = _a[0], total = _a[1];
                            return [2 /*return*/, { data: data, total: total }];
                    }
                });
            });
        };
        // ── Private helpers ─────────────────────────────────────────────────────
        SubscriptionService_1.prototype.calculateNextPeriodEnd = function (from, interval, count) {
            var d = dayjs(from);
            switch (interval) {
                case 'DAILY': return d.add(count, 'day').toDate();
                case 'WEEKLY': return d.add(count * 7, 'day').toDate();
                case 'MONTHLY': return d.add(count, 'month').toDate();
                case 'YEARLY': return d.add(count, 'year').toDate();
            }
        };
        return SubscriptionService_1;
    }());
    __setFunctionName(_classThis, "SubscriptionService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        SubscriptionService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return SubscriptionService = _classThis;
}();
exports.SubscriptionService = SubscriptionService;
