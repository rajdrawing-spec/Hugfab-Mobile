/**
 * Money, ported from HUGFAB-AI `src/lib/money.ts`.
 *
 * Amounts are integer **minor units** (paise, cents, fils) and arrive that way
 * from the API. Money is never a float: 0.1 + 0.2 is not 0.3, and a price
 * comparison app that is a paisa out on a total has lost the argument.
 *
 * This is the only place in the app that produces a currency symbol. A component
 * that types `₹` fails the lint (`eslint.config.js`), because India shipping
 * first is not the same as India being the only market.
 *
 * Deliberately a subset of the web module: the arithmetic helpers (`addMoney`,
 * `subtractMoney`, `minMoney`, `discountPercent`) are **not** ported. The app
 * does not compute money — every total, every discount and every "was" price is
 * a server answer. Porting the arithmetic would be handing someone the tools to
 * break that rule quietly. `compareMoney` is here only to sort a list the server
 * already ordered, and throws across currencies rather than guessing.
 */

export interface Money {
  /** Integer count of the currency's smallest unit. 49900 INR = ₹499.00 */
  readonly amountMinor: number;
  readonly currency: string;
}

/** ISO-4217 exponents that are not 2. Everything unlisted is assumed to be 2. */
const MINOR_UNIT_EXPONENTS: Readonly<Record<string, number>> = {
  BHD: 3,
  CLP: 0,
  ISK: 0,
  JOD: 3,
  JPY: 0,
  KRW: 0,
  KWD: 3,
  OMR: 3,
  TND: 3,
  VND: 0,
};

export class CurrencyMismatchError extends Error {
  constructor(a: string, b: string) {
    super(`Cannot compare ${a} with ${b}.`);
    this.name = 'CurrencyMismatchError';
  }
}

export function minorUnitExponent(currency: string): number {
  return MINOR_UNIT_EXPONENTS[currency.toUpperCase()] ?? 2;
}

function minorUnitFactor(currency: string): number {
  return 10 ** minorUnitExponent(currency);
}

/** The major-unit value, for handing to Intl. */
export function toMajorUnits(value: Money): number {
  return value.amountMinor / minorUnitFactor(value.currency);
}

export function isZero(value: Money): boolean {
  return value.amountMinor === 0;
}

/** Negative when `a` is cheaper. Sorts ascending by price. */
export function compareMoney(a: Money, b: Money): number {
  if (a.currency !== b.currency) throw new CurrencyMismatchError(a.currency, b.currency);
  return a.amountMinor - b.amountMinor;
}

/**
 * The locale every amount is formatted in. One constant rather than a device
 * read: the catalogue's prices are INR and its market is India, so formatting a
 * rupee amount with a French separator because the handset is set to French
 * would be worse than being consistent. A real second market changes this along
 * with much else.
 */
const DEFAULT_LOCALE = 'en-IN';

export interface FormatMoneyOptions {
  locale?: string;
  /** `compact` renders ₹1.2L for a dense card. */
  notation?: 'standard' | 'compact';
  /**
   * Whole amounts drop their decimals by default — retail convention in India
   * and elsewhere: ₹499, not ₹499.00. Set true where the exact figure matters.
   */
  alwaysShowFraction?: boolean;
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name';
}

/**
 * The only place a currency symbol is produced. `Intl` owns symbol choice,
 * Indian lakh/crore grouping and placement.
 *
 * React Native on Android ships a full ICU in Hermes, so this works — but the
 * fallback is kept from the web module anyway. A runtime without ICU would
 * otherwise throw inside a render, which on a phone is a blank screen rather
 * than a wrong price.
 */
export function formatMoney(value: Money, options: FormatMoneyOptions = {}): string {
  const {
    locale = DEFAULT_LOCALE,
    notation = 'standard',
    alwaysShowFraction = false,
    currencyDisplay = 'narrowSymbol',
  } = options;

  const exponent = minorUnitExponent(value.currency);
  const isWhole = value.amountMinor % minorUnitFactor(value.currency) === 0;
  const fractionDigits = alwaysShowFraction || !isWhole ? exponent : 0;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: value.currency,
      currencyDisplay,
      notation,
      minimumFractionDigits: notation === 'compact' ? undefined : fractionDigits,
      maximumFractionDigits: notation === 'compact' ? 1 : fractionDigits,
    }).format(toMajorUnits(value));
  } catch {
    return `${value.currency} ${toMajorUnits(value).toFixed(exponent)}`;
  }
}
