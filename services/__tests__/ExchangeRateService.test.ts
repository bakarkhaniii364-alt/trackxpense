import { describe, it, expect } from 'vitest';
import { ExchangeRateService, OFFLINE_USD_RATES } from '../ExchangeRateService';
import { AppData, TransactionType } from '../../types';

describe('ExchangeRateService', () => {
  it('normalizes currency codes and symbols consistently', () => {
    expect(ExchangeRateService.normalizeCode('৳')).toBe('BDT');
    expect(ExchangeRateService.normalizeCode('BDT')).toBe('BDT');
    expect(ExchangeRateService.normalizeCode('$')).toBe('USD');
    expect(ExchangeRateService.normalizeSymbol('BDT')).toBe('৳');
    expect(ExchangeRateService.normalizeSymbol('USD')).toBe('$');
  });

  it('converts app balances, budgets, and wallets on default currency change', async () => {
    const baseData: AppData = {
      wallets: [{ id: 'main', name: 'Main Wallet', type: 'STANDARD', currency: '$' }],
      transactions: [
        {
          id: 'tx_1',
          amount: 100,
          type: TransactionType.INCOME,
          category: 'Salary',
          date: '2026-11-26T10:00:00Z',
          walletId: 'main'
        }
      ],
      debts: [
        {
          id: 'd_1',
          person: 'Alex',
          amount: 50,
          type: 'OWES_ME',
          isSettled: false
        }
      ],
      categories: [],
      currentWalletId: 'main',
      settings: {
        theme: 'amber',
        darkMode: true,
        notificationsEnabled: false,
        expenseReminders: false,
        debtReminders: false,
        privacyMode: false,
        lastOpened: '2026-11-26T00:00:00Z',
        currencySymbol: '$',
        budgetLimits: { Dining: { limit: 20, period: 'DAILY' } },
        hasOnboarded: true
      },
      profile: { name: 'User', dailyGoal: 10, monthlyGoal: 500 },
      provisions: [],
      lastUsedCategoryMap: {},
      balanceHistory: [],
      templates: [],
      streaks: {},
      recurringRules: []
    };

    const cachedRates = { USD: 1, BDT: 120 };
    const convertedAmount = ExchangeRateService.convertAmountSync(100, 'USD', 'BDT', cachedRates);
    expect(convertedAmount).toBe(12000);

    // Populate offline cache check via convertAppDataCurrency without requiring network
    const rate = ExchangeRateService.getRateFromTable('$', '৳', OFFLINE_USD_RATES);
    expect(rate).toBe(OFFLINE_USD_RATES.BDT);

    // Direct app-data conversion test with offline/live fallback
    const result = await ExchangeRateService.convertAppDataCurrency(baseData, '৳', false);
    expect(result.toCode).toBe('BDT');
    expect(result.toSymbol).toBe('৳');
    expect(result.updates.settings?.currencySymbol).toBe('৳');
    expect(result.updates.wallets?.[0].currency).toBe('৳');
    expect(result.updates.transactions?.[0].amount).toBe(Math.round(100 * result.rate * 100) / 100);
    expect(result.updates.profile?.dailyGoal).toBe(Math.round(10 * result.rate * 100) / 100);
    expect(result.updates.settings?.budgetLimits?.Dining.limit).toBe(Math.round(20 * result.rate * 100) / 100);
  });
});
