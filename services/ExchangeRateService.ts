/**
 * ExchangeRateService
 * Multi-currency conversion service with real-time API queries and offline fallback matrix.
 */

// Normalized currency symbols
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  BDT: '৳',
  INR: '₹',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'AU$'
};

// Inverse map: symbol to ISO currency code
export const SYMBOL_TO_CODE: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '৳': 'BDT',
  '₹': 'INR',
  '¥': 'JPY'
};

// Fallback offline exchange rates relative to USD (1 USD = X)
const OFFLINE_USD_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  BDT: 119.5,
  INR: 83.5,
  JPY: 154.2,
  CAD: 1.36,
  AUD: 1.52
};

export const ExchangeRateService = {
  normalizeCode: (currOrSymbol?: string): string => {
    if (!currOrSymbol) return 'USD';
    const clean = currOrSymbol.trim().toUpperCase();
    if (SYMBOL_TO_CODE[clean]) return SYMBOL_TO_CODE[clean];
    if (OFFLINE_USD_RATES[clean]) return clean;
    return 'USD';
  },

  fetchRates: async (base: string = 'USD'): Promise<Record<string, number> | null> => {
    const baseCode = ExchangeRateService.normalizeCode(base);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout
      const response = await fetch(`https://api.frankfurter.app/latest?from=${baseCode}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return data.rates;
      }
    } catch (e) {
      // Offline or rate-limited; fallback gracefully
    }
    return null;
  },

  getRate: async (fromCurr: string, toCurr: string): Promise<number> => {
    const from = ExchangeRateService.normalizeCode(fromCurr);
    const to = ExchangeRateService.normalizeCode(toCurr);

    if (from === to) return 1.0;

    // Try online fetch
    const onlineRates = await ExchangeRateService.fetchRates(from);
    if (onlineRates && typeof onlineRates[to] === 'number') {
      return onlineRates[to];
    }

    // Fallback to offline matrix relative to USD
    const fromToUsd = OFFLINE_USD_RATES[from] || 1.0;
    const toToUsd = OFFLINE_USD_RATES[to] || 1.0;
    return toToUsd / fromToUsd;
  },

  convertAmount: async (amount: number, fromCurr: string, toCurr: string): Promise<number> => {
    if (amount === 0) return 0;
    const rate = await ExchangeRateService.getRate(fromCurr, toCurr);
    return Math.round(amount * rate * 100) / 100;
  }
};
