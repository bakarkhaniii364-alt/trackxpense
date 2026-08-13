import React, { useMemo } from 'react';
import { AppData, Transaction, TransactionType } from '../../types';

interface BentoCategoryTableProps {
  transactions: Transaction[];
  data: AppData;
  formatMoney: (val: number, sym: string) => string;
  currencySymbol: string;
  privacyMode: boolean;
}

export const BentoCategoryTable: React.FC<BentoCategoryTableProps> = ({
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
    const map: Record<string, { total: number; count: number }> = {};
    expenseTransactions.forEach((t) => {
      const cat = t.category || 'Other';
      if (!map[cat]) map[cat] = { total: 0, count: 0 };
      map[cat].total += t.amount;
      map[cat].count += 1;
    });

    return Object.entries(map)
      .map(([name, stat]) => {
        const percent = totalExpense > 0 ? (stat.total / totalExpense) * 100 : 0;
        const avgPerTx = stat.count > 0 ? stat.total / stat.count : 0;
        const budgetConfig = data.settings.budgetLimits?.[name];
        const budgetLimit = budgetConfig?.limit || null;
        const isOverBudget = budgetLimit ? stat.total > budgetLimit : false;

        return {
          name,
          total: stat.total,
          count: stat.count,
          percent,
          avgPerTx,
          budgetLimit,
          isOverBudget,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [expenseTransactions, totalExpense, data.settings.budgetLimits]);

  const displayMoney = (val: number) => {
    if (privacyMode) return '••••';
    return formatMoney(val, currencySymbol);
  };

  return (
    <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] overflow-hidden h-full flex flex-col justify-between">
      <div>
        <div className="p-4 border-b border-[var(--border-default)] flex items-center justify-between">
          <span className="text-[13px] font-medium text-[var(--text-secondary)]">
            Outflow ledger
          </span>
          <span className="text-[11px] font-mono text-[var(--text-muted)]">
            {categories.length} entries
          </span>
        </div>

        <div className="overflow-x-auto no-scrollbar max-h-[220px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-default)] text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.05em] bg-[var(--bg-subtle)]">
                <th className="py-2 px-3.5">Category</th>
                <th className="py-2 px-3.5">Spent</th>
                <th className="py-2 px-3.5">Share</th>
                <th className="py-2 px-3.5">Txs</th>
                <th className="py-2 px-3.5">Avg / Tx</th>
                <th className="py-2 px-3.5 text-right">Budget Limit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)] text-[12px]">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[11px] text-[var(--text-muted)]">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.name} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                    <td className="py-2.5 px-3.5 font-medium text-[var(--text-primary)] truncate max-w-[130px]">
                      {cat.name}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-[var(--text-primary)]">
                      {displayMoney(cat.total)}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-[var(--text-secondary)]">
                      {cat.percent.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-[var(--text-muted)]">
                      {cat.count}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-[var(--text-secondary)]">
                      {displayMoney(cat.avgPerTx)}
                    </td>
                    <td className="py-2.5 px-3.5 font-mono text-[11px] text-right">
                      {cat.budgetLimit !== null ? (
                        <span className={cat.isOverBudget ? 'text-[var(--status-error-fg)] font-medium' : 'text-[var(--text-secondary)]'}>
                          {displayMoney(cat.budgetLimit)} {cat.isOverBudget && '(!)'}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-3 border-t border-[var(--border-default)] flex items-center justify-between text-[10px] text-[var(--text-muted)] font-mono">
        <span>Average Ticket: {displayMoney(expenseTransactions.length > 0 ? totalExpense / expenseTransactions.length : 0)}</span>
        <span>Total Debits: {expenseTransactions.length}</span>
      </div>
    </div>
  );
};
