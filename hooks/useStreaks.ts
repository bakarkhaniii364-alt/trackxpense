import { useEffect } from 'react';
import { AppData, TransactionType } from '../types';

interface UseStreaksProps {
  data: AppData | null;
  updateData: (newData: Partial<AppData>) => void;
}

export function useStreaks({ data, updateData }: UseStreaksProps) {
  useEffect(() => {
    if (!data || !data.settings.hasOnboarded) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const limits = data.settings.budgetLimits || {};
    const currentStreaks = { ...(data.streaks || {}) };
    let hasChanges = false;

    Object.keys(limits).forEach(category => {
      const limitData = limits[category];
      const limit = typeof limitData === 'number' ? limitData : limitData?.limit;
      if (!limit || limit <= 0) return;

      const streak = currentStreaks[category] || { current: 0, max: 0, lastUpdate: '' };

      // Check if not yet computed for today
      if (streak.lastUpdate !== todayStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];

        const yesterdaySpend = data.transactions
          .filter(t => t.type === TransactionType.EXPENSE && t.category === category && t.date.startsWith(yStr))
          .reduce((sum, t) => sum + t.amount, 0);

        if (yesterdaySpend <= limit) {
          streak.current = (streak.current || 0) + 1;
          if (streak.current > streak.max) streak.max = streak.current;
        } else {
          streak.current = 0;
        }

        streak.lastUpdate = todayStr;
        currentStreaks[category] = streak;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      updateData({ streaks: currentStreaks });
    }
  }, [data?.settings.hasOnboarded, data?.transactions.length, data?.settings.budgetLimits]);
}
