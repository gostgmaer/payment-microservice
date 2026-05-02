/**
 * Currency utility tests — validates BigInt monetary arithmetic.
 */

/// <reference types="jest" />

import { toSmallestUnit, fromSmallestUnit, subtractAmounts } from './currency.util';
import Decimal from 'decimal.js';

describe('currency.util', () => {
  describe('toSmallestUnit()', () => {
    it('converts INR major unit to paise', () => {
      expect(toSmallestUnit(499, 'INR')).toBe(BigInt(49900));
    });

    it('handles decimal amounts precisely', () => {
      expect(toSmallestUnit('499.99', 'INR')).toBe(BigInt(49999));
    });

    it('handles JPY (zero decimal places)', () => {
      expect(toSmallestUnit(1000, 'JPY')).toBe(BigInt(1000));
    });
  });

  describe('fromSmallestUnit()', () => {
    it('converts paise to INR', () => {
      const result = fromSmallestUnit(BigInt(49900), 'INR');
      expect(result.equals(new Decimal('499.00'))).toBe(true);
    });
  });

  describe('subtractAmounts()', () => {
    it('subtracts safely', () => {
      expect(subtractAmounts(BigInt(1000), BigInt(300))).toBe(BigInt(700));
    });

    it('throws on underflow (prevents negative balances)', () => {
      expect(() => subtractAmounts(BigInt(100), BigInt(200))).toThrow();
    });
  });
});
