import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Layers, AlertTriangle, CheckCircle, Tag, Wallet, ArrowRight } from 'lucide-react';
import { AppData, Transaction, TransactionType, CategoryItem } from '../../types';

interface CategoryTabProps {
  transactions: Transaction[];
  data: AppData;
  formatMoney: (val: number, sym: string) => string;
  currencySymbol: string;
  privacyMode: boolean;
}

const DEFAULT_COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#64748b', // Slate
  '#eab308', // Yellow
  '#10b981', // Emerald
];

export const CategoryTab: React.FC<CategoryTabProps> = ({
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

  // Compute breakdown by category
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    expenseTransactions.forEach((t) => {
      const cat = t.category || 'Other';
      if (!map[cat]) map[cat] = { total: 0, count: 0 };
      map[cat].total += t.amount;
      map[cat].count += 1;
    });

    return Object.entries(map)
      .map(([name, stat], idx) => {
        const percent = totalExpense > 0 ? (stat.total / totalExpense) * 100 : 0;
        const avgPerTx = stat.count > 0 ? stat.total / stat.count : 0;
        
        // Check if there is an active budget limit for this category
        const budgetConfig = data.settings.budgetLimits?.[name];
        const budgetLimit = budgetConfig?.limit || null;
        const budgetPercent = budgetLimit ? (stat.total / budgetLimit) * 100 : null;
        const isOverBudget = budgetLimit ? stat.total > budgetLimit : false;
        
        const registeredCat = data.categories.find((c) => c.name === name);
        const color = registeredCat?.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

        return {
          name,
          total: stat.total,
          count: stat.count,
          percent,
          avgPerTx,
          budgetLimit,
          budgetPercent,
          isOverBudget,
          color,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [expenseTransactions, totalExpense, data.categories, data.settings.budgetLimits]);

  // Compute top category pairs for co-occurrence / high impact groupings
  const categoryPairs = useMemo(() => {
    if (categoryBreakdown.length < 2) return [];
    const pairs: { cat1: string; cat2: string; totalShare: number; combinedTotal: number }[] = [];
    for (let i = 0; i < categoryBreakdown.length - 1 && pairs.length < 3; i += 2) {
      const c1 = categoryBreakdown[i];
      const c2 = categoryBreakdown[i + 1];
      const combined = c1.total + c2.total;
      pairs.push({
        cat1: c1.name,
        cat2: c2.name,
        totalShare: totalExpense > 0 ? (combined / totalExpense) * 100 : 0,
        combinedTotal: combined,
      });
    }
    return pairs;
  }, [categoryBreakdown, totalExpense]);

  const displayMoney = (val: number) => {
    if (privacyMode) return '••••';
    return formatMoney(val, currencySymbol);
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Donut Allocation & Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        {/* Donut Chart Card */}
        <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between mb-2">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Allocation Donut
              </span>
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                Category Distribution
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[var(--text-secondary)]">
              {categoryBreakdown.length} Categories
            </span>
          </div>

          <div className="h-[200px] w-full relative my-2">
            {categoryBreakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[12px] text-[var(--text-muted)]">
                No expense data available.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      innerRadius={65}
                      outerRadius={88}
                      paddingAngle={3}
                      dataKey="total"
                      animationDuration={800}
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--bg-surface)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-strong)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        padding: '6px 10px',
                      }}
                      formatter={(val: any) => [displayMoney(Number(val) || 0), 'Expense']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] uppercase font-medium tracking-wider text-[var(--text-muted)]">
                    Total Spent
                  </span>
                  <span className="text-base font-semibold text-[var(--text-primary)] tracking-tight">
                    {displayMoney(totalExpense)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="w-full flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-default)]">
            <span>Largest Share</span>
            <span className="font-mono text-[var(--text-primary)] font-medium">
              {categoryBreakdown[0] ? `${categoryBreakdown[0].name} (${categoryBreakdown[0].percent.toFixed(0)}%)` : '—'}
            </span>
          </div>
        </div>

        {/* Category Pairs & Allocation Intensity (2 Columns on Desktop) */}
        <div className="lg:col-span-2 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Portfolio Concentration
              </span>
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">Pair Affinity</span>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
              Dominant Outflow Groupings
            </h3>
            
            {categoryPairs.length > 0 ? (
              <div className="space-y-3">
                {categoryPairs.map((pair, idx) => (
                  <div key={idx} className="p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-default)] space-y-2">
                    <div className="flex items-center justify-between text-[12px]">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--text-primary)]">{pair.cat1}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">+</span>
                        <span className="font-medium text-[var(--text-primary)]">{pair.cat2}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[var(--text-secondary)]">{displayMoney(pair.combinedTotal)}</span>
                        <span className="text-[10px] text-[var(--accent-solid)] font-semibold">({pair.totalShare.toFixed(0)}%)</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--bg-surface)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#3b82f6] transition-all duration-500"
                        style={{ width: `${Math.min(pair.totalShare, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-[12px] text-[var(--text-muted)]">
                Add more transactions across different categories to reveal spending pairs.
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-3 mt-3 border-t border-[var(--border-default)]">
            <span>Tracking {categoryBreakdown.length} unique expense classifications</span>
            <span className="font-mono text-[var(--text-muted)]">
              Avg Ticket: {displayMoney(expenseTransactions.length > 0 ? totalExpense / expenseTransactions.length : 0)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Comprehensive Category Ledger & Budget Tracker */}
      <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[var(--border-default)] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Detailed Breakdown
            </span>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mt-0.5">
              Category Metrics & Budget Limit Adherence
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-secondary)]">
            Sorted by Outflow
          </span>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-default)] text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.05em] bg-[var(--bg-subtle)]">
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Total Spent</th>
                <th className="py-2.5 px-4">% Share</th>
                <th className="py-2.5 px-4">Volume</th>
                <th className="py-2.5 px-4">Avg / Tx</th>
                <th className="py-2.5 px-4">Budget Limit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)] text-[13px]">
              {categoryBreakdown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[12px] text-[var(--text-muted)]">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                categoryBreakdown.map((cat) => (
                  <tr key={cat.name} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                    {/* Category Name */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-medium text-[var(--text-primary)]">{cat.name}</span>
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="py-3 px-4 font-mono font-medium text-[var(--text-primary)]">
                      {displayMoney(cat.total)}
                    </td>

                    {/* % Share with Micro Bar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(cat.percent, 100)}%`, backgroundColor: cat.color }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-[var(--text-secondary)]">{cat.percent.toFixed(1)}%</span>
                      </div>
                    </td>

                    {/* Volume */}
                    <td className="py-3 px-4 font-mono text-[12px] text-[var(--text-secondary)]">
                      {cat.count} tx{cat.count !== 1 ? 's' : ''}
                    </td>

                    {/* Avg Ticket */}
                    <td className="py-3 px-4 font-mono text-[12px] text-[var(--text-secondary)]">
                      {displayMoney(cat.avgPerTx)}
                    </td>

                    {/* Budget Limit Status */}
                    <td className="py-3 px-4">
                      {cat.budgetLimit !== null ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className={`font-medium ${cat.isOverBudget ? 'text-[var(--status-error-fg)]' : 'text-[var(--text-secondary)]'}`}>
                              {cat.isOverBudget ? 'Over Budget' : `${cat.budgetPercent?.toFixed(0)}% used`}
                            </span>
                            <span className="font-mono text-[var(--text-muted)]">
                              Limit: {displayMoney(cat.budgetLimit)}
                            </span>
                          </div>
                          <div className="h-1.5 w-32 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                cat.isOverBudget ? 'bg-[var(--status-error-fg)]' : 'bg-[var(--status-success-fg)]'
                              }`}
                              style={{ width: `${Math.min(cat.budgetPercent || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)] italic">No limit set</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
