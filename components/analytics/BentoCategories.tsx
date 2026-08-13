import React, { useMemo } from 'react';
import { AppData, Transaction, TransactionType } from '../../types';

interface BentoCategoriesProps {
  transactions: Transaction[];
  data: AppData;
  formatMoney: (val: number, sym: string) => string;
  currencySymbol: string;
  privacyMode: boolean;
}

export const BentoCategories: React.FC<BentoCategoriesProps> = ({
  transactions,
  data,
  formatMoney,
  currencySymbol,
  privacyMode,
}) => {
  const expenseTransactions = useMemo(
    () => transactions.filter((t) => t.type === TransactionType.EXPENSE),
    [transactions]
  );

  const totalExpense = useMemo(
    () => expenseTransactions.reduce((sum, t) => sum + t.amount, 0),
    [expenseTransactions]
  );

  const categories = useMemo(() => {
    const map: Record<string, number> = {};
    expenseTransactions.forEach((t) => {
      const cat = t.category || 'Other';
      map[cat] = (map[cat] || 0) + t.amount;
    });

    return Object.entries(map)
      .map(([name, amount]) => {
        const percent = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
        const budget = data.settings.budgetLimits?.[name]?.limit || null;
        const isOver = budget ? amount > budget : false;
        return { name, amount, percent, budget, isOver };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [expenseTransactions, totalExpense, data.settings.budgetLimits]);

  const displayMoney = (val: number) => {
    if (privacyMode) return '••••';
    return formatMoney(val, currencySymbol);
  };

  return (
    <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-medium text-[var(--text-secondary)]">
            Category allocation
          </span>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            {categories.length} active
          </span>
        </div>

        <div className="space-y-2.5 mt-1">
          {categories.length === 0 ? (
            <div className="py-8 text-center text-[11px] text-[var(--text-muted)]">
              No expense records.
            </div>
          ) : (
            categories.slice(0, 4).map((cat) => (
              <div key={cat.name} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[var(--text-primary)] font-medium truncate max-w-[130px]">
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-[var(--text-secondary)]">{displayMoney(cat.amount)}</span>
                    <span className="text-[var(--text-muted)] text-[10px]">({cat.percent.toFixed(0)}%)</span>
                  </div>
                </div>
                <div className="h-1 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${cat.isOver ? 'bg-[var(--status-error-fg)]' : 'bg-[var(--accent-solid)]'}`}
                    style={{ width: `${Math.min(cat.percent, 100)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-2 mt-2 border-t border-[var(--border-default)]">
        <span>Total Outflow: {displayMoney(totalExpense)}</span>
        <span className="font-mono">{categories[0] ? `Top: ${categories[0].name}` : '—'}</span>
      </div>
    </div>
  );
};
