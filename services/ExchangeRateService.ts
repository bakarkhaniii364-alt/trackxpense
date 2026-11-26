import { AppData } from '../types';

/**
 * ExchangeRateService
 * Multi-currency conversion service with real-time market FX queries,
 * persistent localStorage caching, and offline fallback matrix.
 */

export interface CurrencyMeta {
  code: string;
  symbol: string;
  label: string;
}

export const SUPPORTED_CURRENCIES: CurrencyMeta[] = [
  { code: 'BDT', symbol: '৳', label: 'Bangladeshi Taka' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'AU$', label: 'Australian Dollar' }
];

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

export const SYMBOL_TO_CODE: Record<string, string> = {
  '$': 'USD',
  'US$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '৳': 'BDT',
  'TK': 'BDT',
  '₹': 'INR',
  'RS': 'INR',
  '¥': 'JPY',
  'CA$': 'CAD',
  'C$': 'CAD',
  'AU$': 'AUD',
  'A$': 'AUD'
};

// Fallback offline exchange rates relative to USD (1 USD = X)
export const OFFLINE_USD_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  BDT: 119.5,
  INR: 84.4,
  JPY: 154.2,
  CAD: 1.4,
  AUD: 1.54
};

export interface LiveRateTable {
  base: 'USD';
  rates: Record<string, number>;
  updatedAt: string;
  source: 'live' | 'cached' | 'offline';
}

const FX_CACHE_KEY = 'tx_fx_live_table_v1';
const FX_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const roundMoney = (val: number, decimals: number = 2): number => {
  if (!Number.isFinite(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
};

const readFxCache = (): LiveRateTable | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(FX_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.rates && typeof parsed.rates.USD === 'number') {
      return parsed as LiveRateTable;
    }
  } catch {
    // ignore malformed cache
  }
  return null;
};

const writeFxCache = (table: LiveRateTable) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(FX_CACHE_KEY, JSON.stringify(table));
  } catch {
    // ignore storage quota errors
  }
};

export const ExchangeRateService = {
  normalizeCode: (currOrSymbol?: string): string => {
    if (!currOrSymbol) return 'USD';
    const raw = currOrSymbol.trim();
    if (SYMBOL_TO_CODE[raw]) return SYMBOL_TO_CODE[raw];
    const upper = raw.toUpperCase();
    if (SYMBOL_TO_CODE[upper]) return SYMBOL_TO_CODE[upper];
    if (OFFLINE_USD_RATES[upper]) return upper;
    return 'USD';
  },

  normalizeSymbol: (currOrSymbol?: string): string => {
    if (!currOrSymbol) return '৳';
    const code = ExchangeRateService.normalizeCode(currOrSymbol);
    return CURRENCY_SYMBOLS[code] || currOrSymbol;
  },

  getCachedRateTable: (): LiveRateTable => {
    const cached = readFxCache();
    if (cached) {
      return {
        ...cached,
        rates: { ...OFFLINE_USD_RATES, ...cached.rates, USD: 1.0 }
      };
    }
    return {
      base: 'USD',
      rates: { ...OFFLINE_USD_RATES },
      updatedAt: new Date().toISOString(),
      source: 'offline'
    };
  },

  fetchLiveUsdRates: async (): Promise<{ rates: Record<string, number>; updatedAt: string } | null> => {
    // Primary: open.er-api.com (keyless, CORS-enabled, includes BDT and 160+ currencies)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json?.result === 'success' && json.rates && typeof json.rates.BDT === 'number') {
          return {
            rates: { ...OFFLINE_USD_RATES, ...json.rates, USD: 1.0 },
            updatedAt: json.time_last_update_utc
              ? new Date(json.time_last_update_utc).toISOString()
              : new Date().toISOString()
          };
        }
      }
    } catch {
      // Fall through to secondary provider
    }

    // Secondary: Frankfurter (ECB currencies; lacks BDT so we preserve fallback BDT)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://api.frankfurter.app/latest?from=USD', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const json = await res.json();
        if (json?.rates) {
          return {
            rates: { ...OFFLINE_USD_RATES, ...json.rates, USD: 1.0 },
            updatedAt: new Date().toISOString()
          };
        }
      }
    } catch {
      // Offline or rate-limited
    }

    return null;
  },

  getLiveRateTable: async (forceRefresh: boolean = false): Promise<LiveRateTable> => {
    const cached = readFxCache();
    if (!forceRefresh && cached) {
      const age = Date.now() - new Date(cached.updatedAt).getTime();
      if (Number.isFinite(age) && age < FX_CACHE_TTL_MS) {
        return {
          ...cached,
          rates: { ...OFFLINE_USD_RATES, ...cached.rates, USD: 1.0 },
          source: 'cached'
        };
      }
    }

    const fetched = await ExchangeRateService.fetchLiveUsdRates();
    if (fetched) {
      const liveTable: LiveRateTable = {
        base: 'USD',
        rates: fetched.rates,
        updatedAt: fetched.updatedAt,
        source: 'live'
      };
      writeFxCache(liveTable);
      return liveTable;
    }

    if (cached) {
      return {
        ...cached,
        rates: { ...OFFLINE_USD_RATES, ...cached.rates, USD: 1.0 },
        source: 'cached'
      };
    }

    return {
      base: 'USD',
      rates: { ...OFFLINE_USD_RATES },
      updatedAt: new Date().toISOString(),
      source: 'offline'
    };
  },

  fetchRates: async (base: string = 'USD'): Promise<Record<string, number> | null> => {
    const baseCode = ExchangeRateService.normalizeCode(base);
    const table = await ExchangeRateService.getLiveRateTable();
    const baseRate = table.rates[baseCode];
    if (!baseRate) return null;
    const derived: Record<string, number> = {};
    for (const c of SUPPORTED_CURRENCIES) {
      derived[c.code] = (table.rates[c.code] || OFFLINE_USD_RATES[c.code] || 1) / baseRate;
    }
    return derived;
  },

  getRateFromTable: (fromCurr: string, toCurr: string, usdRates?: Record<string, number>): number => {
    const from = ExchangeRateService.normalizeCode(fromCurr);
    const to = ExchangeRateService.normalizeCode(toCurr);
    if (from === to) return 1.0;
    const map = usdRates || ExchangeRateService.getCachedRateTable().rates;
    const fromRate = map[from] || OFFLINE_USD_RATES[from] || 1.0;
    const toRate = map[to] || OFFLINE_USD_RATES[to] || 1.0;
    return toRate / fromRate;
  },

  getRate: async (fromCurr: string, toCurr: string, forceRefresh: boolean = false): Promise<number> => {
    const from = ExchangeRateService.normalizeCode(fromCurr);
    const to = ExchangeRateService.normalizeCode(toCurr);
    if (from === to) return 1.0;
    const table = await ExchangeRateService.getLiveRateTable(forceRefresh);
    return ExchangeRateService.getRateFromTable(from, to, table.rates);
  },

  convertAmountSync: (amount: number, fromCurr: string, toCurr: string, usdRates?: Record<string, number>): number => {
    if (!amount) return 0;
    const rate = ExchangeRateService.getRateFromTable(fromCurr, toCurr, usdRates);
    return roundMoney(amount * rate, 2);
  },

  convertAmount: async (amount: number, fromCurr: string, toCurr: string): Promise<number> => {
    if (amount === 0) return 0;
    const rate = await ExchangeRateService.getRate(fromCurr, toCurr);
    return roundMoney(amount * rate, 2);
  },

  /**
   * Converts all user financial records, limits, goals, debts, and wallets
   * from their prior currencies into `targetCurrOrSymbol` using live FX rates.
   */
  convertAppDataCurrency: async (
    data: AppData,
    targetCurrOrSymbol: string,
    forceRefresh: boolean = false
  ): Promise<{
    updates: Partial<AppData>;
    fromCode: string;
    toCode: string;
    toSymbol: string;
    rate: number;
    table: LiveRateTable;
  }> => {
    const table = await ExchangeRateService.getLiveRateTable(forceRefresh);
    const fromDefaultCode = ExchangeRateService.normalizeCode(data.settings?.currencySymbol);
    const toCode = ExchangeRateService.normalizeCode(targetCurrOrSymbol);
    const toSymbol = CURRENCY_SYMBOLS[toCode] || targetCurrOrSymbol;
    const nowIso = new Date().toISOString();

    const defaultRate = ExchangeRateService.getRateFromTable(fromDefaultCode, toCode, table.rates);

    // Map each wallet from its own previous currency -> target currency
    const walletRateMap: Record<string, number> = {};
    const updatedWallets = (data.wallets || []).map(w => {
      const wFromCode = ExchangeRateService.normalizeCode(w.currency || data.settings?.currencySymbol);
      const wRate = ExchangeRateService.getRateFromTable(wFromCode, toCode, table.rates);
      walletRateMap[w.id] = wRate;
      const convertedTarget =
        typeof w.targetAmount === 'number' && w.targetAmount > 0
          ? roundMoney(w.targetAmount * wRate, 2)
          : w.targetAmount;
      return {
        ...w,
        currency: toSymbol,
        targetAmount: convertedTarget,
        updated_at: nowIso
      };
    });

    // Convert transactions using their owning wallet's rate
    const updatedTransactions = (data.transactions || []).map(tx => {
      const txRate = walletRateMap[tx.walletId] ?? defaultRate;
      if (txRate === 1) return tx;
      return {
        ...tx,
        amount: roundMoney(tx.amount * txRate, 2),
        splits: tx.splits?.map(s => ({
          ...s,
          amount: roundMoney(s.amount * txRate, 2)
        })),
        updated_at: nowIso
      };
    });

    // Convert debts & debt payments using default currency rate
    const updatedDebts =
      defaultRate === 1
        ? data.debts
        : (data.debts || []).map(d => ({
            ...d,
            amount: roundMoney(d.amount * defaultRate, 2),
            payments: d.payments?.map(p => ({
              ...p,
              amount: roundMoney(p.amount * defaultRate, 2)
            })),
            updated_at: nowIso
          }));

    // Convert provisions
    const updatedProvisions =
      defaultRate === 1
        ? data.provisions
        : (data.provisions || []).map(p => ({
            ...p,
            amount: roundMoney(p.amount * defaultRate, 2),
            updated_at: nowIso
          }));

    // Convert recurring rules using their wallet rate (or defaultRate)
    const updatedRecurringRules = (data.recurringRules || []).map(r => {
      const rRate = walletRateMap[r.walletId] ?? defaultRate;
      if (rRate === 1) return r;
      return {
        ...r,
        amount: roundMoney(r.amount * rRate, 2),
        updated_at: nowIso
      };
    });

    // Convert templates
    const updatedTemplates =
      defaultRate === 1
        ? data.templates
        : (data.templates || []).map(t => ({
            ...t,
            amount: roundMoney(t.amount * defaultRate, 2),
            updated_at: nowIso
          }));

    // Convert balance snapshots
    const updatedBalanceHistory =
      defaultRate === 1
        ? data.balanceHistory
        : (data.balanceHistory || []).map(b => ({
            ...b,
            amount: roundMoney(b.amount * defaultRate, 2)
          }));

    // Convert category budget limits
    const updatedBudgetLimits: Record<string, { limit: number; period: 'DAILY' | 'MONTHLY' }> = {};
    for (const [cat, cfg] of Object.entries(data.settings?.budgetLimits || {})) {
      updatedBudgetLimits[cat] = {
        ...cfg,
        limit: defaultRate === 1 ? cfg.limit : roundMoney(cfg.limit * defaultRate, 2)
      };
    }

    // Convert profile goals
    const updatedProfile = {
      ...data.profile,
      dailyGoal:
        data.profile?.dailyGoal && defaultRate !== 1
          ? roundMoney(data.profile.dailyGoal * defaultRate, 2)
          : data.profile?.dailyGoal || 0,
      monthlyGoal:
        data.profile?.monthlyGoal && defaultRate !== 1
          ? roundMoney(data.profile.monthlyGoal * defaultRate, 2)
          : data.profile?.monthlyGoal || 0
    };

    const updatedSettings = {
      ...data.settings,
      currencySymbol: toSymbol,
      budgetLimits: updatedBudgetLimits
    };

    return {
      updates: {
        wallets: updatedWallets,
        transactions: updatedTransactions,
        debts: updatedDebts,
        provisions: updatedProvisions,
        recurringRules: updatedRecurringRules,
        templates: updatedTemplates,
        balanceHistory: updatedBalanceHistory,
        profile: updatedProfile,
        settings: updatedSettings
      },
      fromCode: fromDefaultCode,
      toCode,
      toSymbol,
      rate: defaultRate,
      table
    };
  }
};
