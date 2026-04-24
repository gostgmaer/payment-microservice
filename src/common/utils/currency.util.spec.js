"use strict";
/**
 * Currency utility tests — validates BigInt monetary arithmetic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var currency_util_1 = require("./currency.util");
var decimal_js_1 = require("decimal.js");
describe('currency.util', function () {
    describe('toSmallestUnit()', function () {
        it('converts INR major unit to paise', function () {
            expect((0, currency_util_1.toSmallestUnit)(499, 'INR')).toBe(BigInt(49900));
        });
        it('handles decimal amounts precisely', function () {
            expect((0, currency_util_1.toSmallestUnit)('499.99', 'INR')).toBe(BigInt(49999));
        });
        it('handles JPY (zero decimal places)', function () {
            expect((0, currency_util_1.toSmallestUnit)(1000, 'JPY')).toBe(BigInt(1000));
        });
    });
    describe('fromSmallestUnit()', function () {
        it('converts paise to INR', function () {
            var result = (0, currency_util_1.fromSmallestUnit)(BigInt(49900), 'INR');
            expect(result.equals(new decimal_js_1.default('499.00'))).toBe(true);
        });
    });
    describe('subtractAmounts()', function () {
        it('subtracts safely', function () {
            expect((0, currency_util_1.subtractAmounts)(BigInt(1000), BigInt(300))).toBe(BigInt(700));
        });
        it('throws on underflow (prevents negative balances)', function () {
            expect(function () { return (0, currency_util_1.subtractAmounts)(BigInt(100), BigInt(200)); }).toThrow();
        });
    });
});
