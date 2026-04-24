"use strict";
/**
 * Prisma Seed — creates default Plans and a raw SQL partial unique index.
 *
 * The partial unique index enforces the business rule that only ONE successful
 * payment attempt may exist per transaction at the database level, acting as a
 * last-resort guard against race conditions.
 *
 * Run: npm run prisma:seed
 */
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
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
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var plans, _i, plans_1, plan;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🌱 Seeding database…');
                    // ─── Partial unique index (idempotent) ────────────────────────────────────
                    // This cannot be expressed in Prisma schema DSL — must be raw SQL.
                    return [4 /*yield*/, prisma.$executeRaw(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n    CREATE UNIQUE INDEX IF NOT EXISTS unique_success_per_transaction\n      ON \"PaymentAttempt\" (\"transactionId\")\n      WHERE status = 'SUCCESS';\n  "], ["\n    CREATE UNIQUE INDEX IF NOT EXISTS unique_success_per_transaction\n      ON \"PaymentAttempt\" (\"transactionId\")\n      WHERE status = 'SUCCESS';\n  "])))];
                case 1:
                    // ─── Partial unique index (idempotent) ────────────────────────────────────
                    // This cannot be expressed in Prisma schema DSL — must be raw SQL.
                    _a.sent();
                    console.log('✅ Partial unique index ensured');
                    plans = [
                        {
                            id: 'plan_starter_monthly',
                            name: 'Starter Monthly',
                            description: 'Perfect for small businesses',
                            amount: BigInt(49900), // ₹499.00
                            currency: 'INR',
                            interval: 'MONTHLY',
                            intervalCount: 1,
                            trialDays: 14,
                            isActive: true,
                        },
                        {
                            id: 'plan_starter_yearly',
                            name: 'Starter Yearly',
                            description: 'Save 20% with annual billing',
                            amount: BigInt(479000), // ₹4790.00 (≈ ₹399/mo)
                            currency: 'INR',
                            interval: 'YEARLY',
                            intervalCount: 1,
                            trialDays: 14,
                            isActive: true,
                        },
                        {
                            id: 'plan_pro_monthly',
                            name: 'Pro Monthly',
                            description: 'For growing teams',
                            amount: BigInt(199900), // ₹1999.00
                            currency: 'INR',
                            interval: 'MONTHLY',
                            intervalCount: 1,
                            trialDays: 7,
                            isActive: true,
                        },
                        {
                            id: 'plan_pro_yearly',
                            name: 'Pro Yearly',
                            description: 'Pro plan with 20% discount',
                            amount: BigInt(1919000), // ₹19190.00
                            currency: 'INR',
                            interval: 'YEARLY',
                            intervalCount: 1,
                            trialDays: 7,
                            isActive: true,
                        },
                    ];
                    _i = 0, plans_1 = plans;
                    _a.label = 2;
                case 2:
                    if (!(_i < plans_1.length)) return [3 /*break*/, 5];
                    plan = plans_1[_i];
                    return [4 /*yield*/, prisma.plan.upsert({
                            where: { id: plan.id },
                            create: plan,
                            update: { amount: plan.amount, isActive: plan.isActive },
                        })];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log("\u2705 ".concat(plans.length, " plans seeded"));
                    console.log('🌱 Seed complete');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return prisma.$disconnect(); });
var templateObject_1;
