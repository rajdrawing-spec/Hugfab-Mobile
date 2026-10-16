import { describe, expect, it } from 'vitest';

import {
  compareMoney,
  CurrencyMismatchError,
  formatMoney,
  isZero,
  minorUnitExponent,
  toMajorUnits,
  type Money,
} from './money';

/**
 * Money is the one thing in this app that is wrong in a way nobody notices.
 * A layout bug is seen; a price a paisa out is believed.
 *
 * These lock the two rules the module exists to enforce: amounts are integer
 * minor units, and the exponent is the currency's, not always two.
 */

const inr = (amountMinor: number): Money => ({ amountMinor, currency: 'INR' });

describe('minor units', () => {
  it('assumes two decimal places', () => {
    expect(minorUnitExponent('INR')).toBe(2);
    expect(minorUnitExponent('USD')).toBe(2);
    expect(minorUnitExponent('GBP')).toBe(2);
  });

  it('knows the currencies that are not two', () => {
    // A yen amount of 1000 is ¥1000, not ¥10. Getting this wrong is a
    // hundredfold error, and it is the kind that ships.
    expect(minorUnitExponent('JPY')).toBe(0);
    expect(minorUnitExponent('KRW')).toBe(0);
    expect(minorUnitExponent('KWD')).toBe(3);
    expect(minorUnitExponent('BHD')).toBe(3);
  });

  it('does not care about the case it is given', () => {
    expect(minorUnitExponent('jpy')).toBe(0);
  });

  it('assumes two for a currency it has never heard of', () => {
    expect(minorUnitExponent('XYZ')).toBe(2);
  });
});

describe('toMajorUnits', () => {
  it('divides by the currency exponent, not always by 100', () => {
    expect(toMajorUnits(inr(49900))).toBe(499);
    expect(toMajorUnits({ amountMinor: 1000, currency: 'JPY' })).toBe(1000);
    expect(toMajorUnits({ amountMinor: 1000, currency: 'KWD' })).toBe(1);
  });
});

describe('formatMoney', () => {
  it('drops the decimals on a whole amount', () => {
    // Retail convention: ₹499, never ₹499.00.
    expect(formatMoney(inr(49900))).toBe('₹499');
  });

  it('keeps them when the amount is not whole', () => {
    expect(formatMoney(inr(49950))).toBe('₹499.50');
  });

  it('shows them on a whole amount when asked', () => {
    expect(formatMoney(inr(49900), { alwaysShowFraction: true })).toBe('₹499.00');
  });

  it('groups in lakhs, because the locale is en-IN', () => {
    // 1,89,900 rather than 189,900. A western grouping on a rupee price is the
    // kind of detail that makes an app feel foreign.
    expect(formatMoney(inr(18990000))).toBe('₹1,89,900');
  });

  it('formats zero rather than hiding it', () => {
    expect(formatMoney(inr(0))).toBe('₹0');
  });

  it('formats a negative amount, for a refund', () => {
    expect(formatMoney(inr(-49900))).toBe('-₹499');
  });

  it('honours the currency it is given', () => {
    expect(formatMoney({ amountMinor: 1000, currency: 'JPY' })).toBe('¥1,000');
  });
});

describe('compareMoney', () => {
  it('sorts ascending by amount', () => {
    expect(compareMoney(inr(100), inr(200))).toBeLessThan(0);
    expect(compareMoney(inr(200), inr(100))).toBeGreaterThan(0);
    expect(compareMoney(inr(100), inr(100))).toBe(0);
  });

  it('refuses to compare across currencies rather than guessing', () => {
    // Silently treating 1000 JPY as cheaper than 2000 INR would put the wrong
    // offer at the top of a price comparison. Throwing is the whole point.
    expect(() => compareMoney(inr(2000), { amountMinor: 1000, currency: 'JPY' })).toThrow(
      CurrencyMismatchError,
    );
  });
});

describe('isZero', () => {
  it('is true only for zero', () => {
    expect(isZero(inr(0))).toBe(true);
    expect(isZero(inr(1))).toBe(false);
    expect(isZero(inr(-1))).toBe(false);
  });
});

describe('what this module deliberately does not export', () => {
  it('has no arithmetic helpers', async () => {
    /*
     * CLAUDE.md's one rule: the app renders, it does not decide. The web
     * module has addMoney, subtractMoney and discountPercent; porting them
     * here would hand someone the tools to total a cart locally without
     * noticing they had broken the rule. If this test starts failing, the
     * question is not how to fix the test.
     */
    const money: Record<string, unknown> = await import('./money');
    expect(money.addMoney).toBeUndefined();
    expect(money.subtractMoney).toBeUndefined();
    expect(money.discountPercent).toBeUndefined();
    expect(money.minMoney).toBeUndefined();
  });
});
