import React from 'react';
import { TrendingUp, TrendingDown, ShieldCheck, Zap, Scale, AlertCircle } from 'lucide-react';

interface AnalyticsKpiStripProps {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number;
  avgDailySpend: number;
  runwayDays: number;
  totalIOwe: number;
  totalOwesMe: number;
  upcomingLiabilities: number;
  incomeTxCount: number;
  expenseTxCount: number;
  formatMoney: (val: number, sym: string) => string;
  currencySymbol: string;
  privacyMode: boolean;
}

export const AnalyticsKpiStrip: React.FC<AnalyticsKpiStripProps> = ({
  totalIncome,
  totalExpense,
  netSavings,
  savingsRate,
  avgDailySpend,
  runwayDays,
  totalIOwe,
  totalOwesMe,
  upcomingLiabilities,
  incomeTxCount,
  expenseTxCount,
  formatMoney,
  currencySymbol,
  privacyMode,
}) => {
  const displayVal = (val: number, isCurrency: boolean = true) => {
    if (privacyMode) return '••••';
    return isCurrency ? formatMoney(val, currencySymbol) : val.toString();
  };

  const isNetPositive = netSavings >= 0;
  const runwayLabel = runwayDays === Infinity ? '365+ days' : `${runwayDays} days`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
      {/* 1. Total Inflow / Income */}
      <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 flex flex-col justify-between transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Total Inflow
          </span>
          <TrendingUp size={16} strokeWidth={1.5} className="text-[var(--status-success-fg)]" />
        </div>
        <div className="mt-3">
          <div className="text-xl lg:text-2xl font-medium text-[var(--text-primary)] tracking-tight">
            {displayVal(totalIncome)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mt-1 font-mono">
            <span>{incomeTxCount} credits</span>
            <span className="text-[var(--status-success-fg)]">
              {totalIncome > 0 ? '+100%' : '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Total Outflow / Expenses */}
      <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 flex flex-col justify-between transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Total Outflow
          </span>
          <TrendingDown size={16} strokeWidth={1.5} className="text-[var(--status-error-fg)]" />
        </div>
        <div className="mt-3">
          <div className="text-xl lg:text-2xl font-medium text-[var(--text-primary)] tracking-tight">
            {displayVal(totalExpense)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mt-1 font-mono">
            <span>Avg {displayVal(avgDailySpend)}/day</span>
            <span className="text-[var(--text-muted)]">
              {expenseTxCount} debits
            </span>
          </div>
        </div>
      </div>

      {/* 3. Net Savings & Rate */}
      <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 flex flex-col justify-between transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Net Savings
          </span>
          <Scale size={16} strokeWidth={1.5} className={isNetPositive ? "text-[var(--status-success-fg)]" : "text-[var(--status-error-fg)]"} />
        </div>
        <div className="mt-3">
          <div className={`text-xl lg:text-2xl font-medium tracking-tight ${isNetPositive ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`}>
            {isNetPositive ? '+' : ''}{displayVal(netSavings)}
          </div>
          <div className="flex items-center justify-between text-[11px] mt-1">
            <span className="text-[var(--text-secondary)]">Rate</span>
            <span className={`font-mono font-medium px-1.5 py-0.2 rounded-[4px] text-[10px] ${
              savingsRate >= 20 
                ? 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]' 
                : savingsRate >= 0 
                ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]' 
                : 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)]'
            }`}>
              {privacyMode ? '••%' : `${savingsRate.toFixed(1)}%`}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Financial Runway & Daily Burn */}
      <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 flex flex-col justify-between transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Estimated Runway
          </span>
          <ShieldCheck size={16} strokeWidth={1.5} className="text-[#3b82f6]" />
        </div>
        <div className="mt-3">
          <div className="text-xl lg:text-2xl font-medium text-[var(--text-primary)] tracking-tight">
            {privacyMode ? '•••' : runwayLabel}
          </div>
          <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] mt-1 font-mono">
            <span>Burn {displayVal(avgDailySpend)}/d</span>
            <span className="text-[var(--text-muted)]">
              {upcomingLiabilities > 0 ? `+${displayVal(upcomingLiabilities)} due` : 'No dues'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
