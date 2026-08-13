import React from 'react';

interface BentoMetricsProps {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  avgDailySpend: number;
  runwayDays: number;
  totalIOwe: number;
  totalOwesMe: number;
  formatMoney: (val: number, sym: string) => string;
  currencySymbol: string;
  privacyMode: boolean;
}

export const BentoMetrics: React.FC<BentoMetricsProps> = ({
  totalIncome,
  totalExpense,
  netSavings,
  savingsRate,
  avgDailySpend,
  runwayDays,
  totalIOwe,
  totalOwesMe,
  formatMoney,
  currencySymbol,
  privacyMode,
}) => {
  const displayVal = (val: number) => {
    if (privacyMode) return '••••';
    return formatMoney(val, currencySymbol);
  };

  const isNetPositive = netSavings >= 0;
  const runwayLabel = runwayDays === Infinity ? '365+ days' : `${runwayDays} days`;

  return (
    <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 flex flex-col justify-between h-full">
      <div>
        <span className="text-[13px] font-medium text-[var(--text-secondary)] block mb-2">
          Executive summary
        </span>
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block">
              Net Savings
            </span>
            <span className={`text-xl font-semibold tracking-tight font-mono ${isNetPositive ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`}>
              {isNetPositive ? '+' : ''}{displayVal(netSavings)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block">
              Savings Rate
            </span>
            <span className={`text-sm font-mono font-medium ${savingsRate >= 0 ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`}>
              {privacyMode ? '••%' : `${savingsRate.toFixed(1)}%`}
            </span>
          </div>
        </div>

        {/* 2x2 Metric Grid */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-default)] text-[11px]">
          <div className="p-2 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
            <span className="text-[10px] text-[var(--text-muted)] block">Total Inflow</span>
            <span className="font-mono font-medium text-[var(--text-primary)] block mt-0.5">
              {displayVal(totalIncome)}
            </span>
          </div>

          <div className="p-2 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
            <span className="text-[10px] text-[var(--text-muted)] block">Total Outflow</span>
            <span className="font-mono font-medium text-[var(--text-primary)] block mt-0.5">
              {displayVal(totalExpense)}
            </span>
          </div>

          <div className="p-2 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
            <span className="text-[10px] text-[var(--text-muted)] block">Daily Burn</span>
            <span className="font-mono font-medium text-[var(--text-primary)] block mt-0.5">
              {displayVal(avgDailySpend)}/d
            </span>
          </div>

          <div className="p-2 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
            <span className="text-[10px] text-[var(--text-muted)] block">Runway</span>
            <span className="font-mono font-medium text-[var(--text-primary)] block mt-0.5">
              {privacyMode ? '•••' : runwayLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Debt Footer */}
      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] pt-2 mt-2 border-t border-[var(--border-default)] font-mono">
        <span>Liabilities: {displayVal(totalIOwe)}</span>
        <span>Receivables: {displayVal(totalOwesMe)}</span>
      </div>
    </div>
  );
};
