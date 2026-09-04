import { describe, it, expect } from 'vitest';
import { PredictiveEngine } from '../PredictiveEngine';
import { AppData, TransactionType } from '../../types';

describe('PredictiveEngine', () => {
  const createBaseData = (): AppData => ({
    transactions: [],
    wallets: [{ id: 'w1', name: 'Main', type: 'STANDARD', currency: 'BDT' }],
    categories: [],
    settings: {
      currencySymbol: 'BDT',
      budgetLimits: {},
      debtReminders: false,
      privacyMode: false
    },
    profile: { name: 'Test User' },
    debts: [],
    subscriptions: [],
    provisions: [],
    templates: [],
    lastUsedCategoryMap: {}
  });

  describe('getRunwayDays', () => {
    it('returns 0 when balance is 0 or negative', () => {
      const data = createBaseData();
      expect(PredictiveEngine.getRunwayDays(data, 0)).toBe(0);
      expect(PredictiveEngine.getRunwayDays(data, -500)).toBe(0);
    });

    it('returns safe default (90) when positive balance but zero expense history', () => {
      const data = createBaseData();
      expect(PredictiveEngine.getRunwayDays(data, 10000)).toBe(90);
    });

    it('accurately calculates runway days based on daily burn rate', () => {
      const data = createBaseData();
      const today = new Date().toISOString().split('T')[0];
      data.transactions = [
        {
          id: 't1',
          walletId: 'w1',
          amount: 100,
          type: TransactionType.EXPENSE,
          category: 'Food',
          date: `${today}T12:00:00Z`
        }
      ];

      // Balance = 1000, daily burn = 100 -> Runway = 10 days
      expect(PredictiveEngine.getRunwayDays(data, 1000)).toBe(10);
    });
  });

  describe('detectAnomalies', () => {
    it('detects spending that is > 1.5x of moving category average', () => {
      const data = createBaseData();
      const today = new Date().toISOString().split('T')[0];
      
      data.transactions = [
        // Historical normal spend
        { id: 't1', walletId: 'w1', amount: 50, type: TransactionType.EXPENSE, category: 'Dining', date: '2026-08-01T12:00:00Z' },
        { id: 't2', walletId: 'w1', amount: 50, type: TransactionType.EXPENSE, category: 'Dining', date: '2026-08-02T12:00:00Z' },
        // Today spike
        { id: 't3', walletId: 'w1', amount: 200, type: TransactionType.EXPENSE, category: 'Dining', date: `${today}T15:00:00Z` }
      ];

      const anomalies = PredictiveEngine.detectAnomalies(data);
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].id).toBe('t3');
    });
  });

  describe('detectPaydayCycles', () => {
    it('identifies repeating income dates', () => {
      const data = createBaseData();
      data.transactions = [
        { id: 'i1', walletId: 'w1', amount: 50000, type: TransactionType.INCOME, category: 'Salary', date: '2026-06-01T10:00:00Z' },
        { id: 'i2', walletId: 'w1', amount: 50000, type: TransactionType.INCOME, category: 'Salary', date: '2026-07-01T10:00:00Z' },
        { id: 'i3', walletId: 'w1', amount: 50000, type: TransactionType.INCOME, category: 'Salary', date: '2026-08-01T10:00:00Z' }
      ];

      const cycle = PredictiveEngine.detectPaydayCycles(data);
      expect(cycle).not.toBeNull();
      expect(cycle?.day).toBe(1);
      expect(cycle?.confidence).toBe('HIGH');
    });
  });
});
