import { useEffect } from 'react';
import { AppData, TransactionType } from '../types';
import { ExchangeRateService } from '../services/ExchangeRateService';

interface UseNetWorthProps {
  data: AppData | null;
  updateData: (newData: Partial<AppData>) => void;
}

export function useNetWorth({ data, updateData }: UseNetWorthProps) {
  useEffect(() => {
    if (!data || !data.settings.hasOnboarded) return;

    const today = new Date().toISOString().split('T')[0];
    const lastSnapshot = data.balanceHistory[0];

    if (!lastSnapshot || lastSnapshot.date !== today) {
      const baseCurrency = data.settings.currencySymbol || 'USD';

      const computeNetWorth = async () => {
        let netWorth = 0;
        for (const w of data.wallets) {
          const wCurr = w.currency || baseCurrency;
          const wTxs = data.transactions.filter(t => t.walletId === w.id);
          const wIncome = wTxs.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
          const wExpense = wTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
          const wBal = wIncome - wExpense;

          if (wCurr === baseCurrency || wBal === 0) {
            netWorth += wBal;
          } else {
            const converted = await ExchangeRateService.convertAmount(wBal, wCurr, baseCurrency);
            netWorth += converted;
          }
        }

        const newSnapshot = { date: today, amount: Math.round(netWorth * 100) / 100 };
        updateData({ balanceHistory: [newSnapshot, ...data.balanceHistory].slice(0, 30) });
      };

      computeNetWorth();
    }
  }, [data?.settings.hasOnboarded, data?.transactions.length, data?.wallets.length]);
}
