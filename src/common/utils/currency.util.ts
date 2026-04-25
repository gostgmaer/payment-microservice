/**
 * Currency utilities
 *
 * All monetary values are stored as BigInt in the smallest currency unit
 * (paise for INR, cents for USD) to avoid floating-point imprecision.
 *
 * These helpers convert between major units (display) and minor units (storage).
 */

import Decimal from 'decimal.js';

// Decimal places per currency ISO code
const CURRENCY_EXPONENTS: Record<string, number> = {
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
export function toSmallestUnit(amount: number | string, currency: string): bigint {
  const exp = CURRENCY_EXPONENTS[currency.toUpperCase()] ?? 2;
  const multiplier = new Decimal(10).pow(exp);
  const result = new Decimal(amount).mul(multiplier).toFixed(0);
  return BigInt(result);
}

/**
 * Convert smallest unit (9999 paise) to major unit (99.99 INR).
 * Returns a Decimal for further calculation or a string for display.
 */
export function fromSmallestUnit(amount: bigint, currency: string): Decimal {
  const exp = CURRENCY_EXPONENTS[currency.toUpperCase()] ?? 2;
  const divisor = new Decimal(10).pow(exp);
  return new Decimal(amount.toString()).div(divisor);
}

/**
 * Format an amount (in smallest unit) as a human-readable string.
 * e.g. 9999, "INR" → "₹99.99"
 */
export function formatCurrency(amount: bigint, currency: string): string {
  const major = fromSmallestUnit(amount, currency);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: CURRENCY_EXPONENTS[currency.toUpperCase()] ?? 2,
  }).format(major.toNumber());
}

/** Returns the number of decimal places for a given currency. */
export function getCurrencyExponent(currency: string): number {
  return CURRENCY_EXPONENTS[currency.toUpperCase()] ?? 2;
}

/** Add two BigInt monetary amounts safely. */
export function addAmounts(a: bigint, b: bigint): bigint {
  return a + b;
}

/** Subtract b from a (throws if result would be negative — prevents underflow). */
export function subtractAmounts(a: bigint, b: bigint): bigint {
  if (b > a) throw new Error(`Amount underflow: cannot subtract ${b} from ${a}`);
  return a - b;
}
