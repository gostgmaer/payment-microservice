"use strict";
/**
 * Currency utilities
 *
 * All monetary values are stored as BigInt in the smallest currency unit
 * (paise for INR, cents for USD) to avoid floating-point imprecision.
 *
 * These helpers convert between major units (display) and minor units (storage).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSmallestUnit = toSmallestUnit;
exports.fromSmallestUnit = fromSmallestUnit;
exports.formatCurrency = formatCurrency;
exports.getCurrencyExponent = getCurrencyExponent;
exports.addAmounts = addAmounts;
exports.subtractAmounts = subtractAmounts;
var decimal_js_1 = require("decimal.js");
// Decimal places per currency ISO code
var CURRENCY_EXPONENTS = {
    INR: 2,
    USD: 2,
    EUR: 2,
    GBP: 2,
    JPY: 0, // Yen has no minor unit
    SGD: 2,
};
/**
 * Convert a major-unit amount (e.g. 99.99 INR) to smallest unit (9999 paise).
 * Uses Decimal.js to avoid floating-point errors during the conversion.
 */
function toSmallestUnit(amount, currency) {
    var _a;
    var exp = (_a = CURRENCY_EXPONENTS[currency.toUpperCase()]) !== null && _a !== void 0 ? _a : 2;
    var multiplier = new decimal_js_1.default(10).pow(exp);
    var result = new decimal_js_1.default(amount).mul(multiplier).toFixed(0);
    return BigInt(result);
}
/**
 * Convert smallest unit (9999 paise) to major unit (99.99 INR).
 * Returns a Decimal for further calculation or a string for display.
 */
function fromSmallestUnit(amount, currency) {
    var _a;
    var exp = (_a = CURRENCY_EXPONENTS[currency.toUpperCase()]) !== null && _a !== void 0 ? _a : 2;
    var divisor = new decimal_js_1.default(10).pow(exp);
    return new decimal_js_1.default(amount.toString()).div(divisor);
}
/**
 * Format an amount (in smallest unit) as a human-readable string.
 * e.g. 9999, "INR" → "₹99.99"
 */
function formatCurrency(amount, currency) {
    var _a;
    var major = fromSmallestUnit(amount, currency);
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: (_a = CURRENCY_EXPONENTS[currency.toUpperCase()]) !== null && _a !== void 0 ? _a : 2,
    }).format(major.toNumber());
}
/** Returns the number of decimal places for a given currency. */
function getCurrencyExponent(currency) {
    var _a;
    return (_a = CURRENCY_EXPONENTS[currency.toUpperCase()]) !== null && _a !== void 0 ? _a : 2;
}
/** Add two BigInt monetary amounts safely. */
function addAmounts(a, b) {
    return a + b;
}
/** Subtract b from a (throws if result would be negative — prevents underflow). */
function subtractAmounts(a, b) {
    if (b > a)
        throw new Error("Amount underflow: cannot subtract ".concat(b, " from ").concat(a));
    return a - b;
}
