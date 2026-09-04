import { useEffect } from 'react';
import { AppData, Transaction } from '../types';
import { Haptics } from '../services/haptics';

interface UseRecurringEngineProps {
  data: AppData | null;
  updateData: (newData: Partial<AppData>) => void;
}

export function useRecurringEngine({ data, updateData }: UseRecurringEngineProps) {
  useEffect(() => {
    if (!data || !data.settings.hasOnboarded) return;

    const processRecurring = () => {
      const now = new Date();
      let newTransactions = [...data.transactions];
      let updatedRules = [...(data.recurringRules || [])];
      let hasChanges = false;

      updatedRules = updatedRules.map(rule => {
        if (!rule.isActive) return rule;
        let nextDue = new Date(rule.nextDueDate);
        let currentRule = { ...rule };

        while (nextDue <= now) {
          const txId = `recurring_${rule.id}_${nextDue.getTime()}`;
          const alreadyExists = data.transactions.some(t => t.id === txId);

          if (!alreadyExists) {
            const newTx: Transaction = {
              id: txId,
              amount: rule.amount,
              type: rule.type,
              category: rule.category,
              date: nextDue.toISOString(),
              note: `[Recurring] ${rule.note || rule.name}`,
              walletId: rule.walletId,
              isSubscription: true
            };
            newTransactions = [newTx, ...newTransactions];
            hasChanges = true;
          }

          if (rule.frequency === 'DAILY') nextDue.setDate(nextDue.getDate() + 1);
          else if (rule.frequency === 'WEEKLY') nextDue.setDate(nextDue.getDate() + 7);
          else if (rule.frequency === 'MONTHLY') nextDue.setMonth(nextDue.getMonth() + 1);
          else if (rule.frequency === 'YEARLY') nextDue.setFullYear(nextDue.getFullYear() + 1);

          currentRule.nextDueDate = nextDue.toISOString().split('T')[0];
          currentRule.updated_at = new Date().toISOString();
        }
        return currentRule;
      });

      if (hasChanges) {
        updateData({
          transactions: newTransactions,
          recurringRules: updatedRules
        });
        Haptics.success();
      }
    };

    processRecurring();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        processRecurring();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    const heartbeatInterval = setInterval(processRecurring, 30 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeatInterval);
    };
  }, [data?.settings.hasOnboarded, data?.recurringRules, data?.transactions.length]);
}
