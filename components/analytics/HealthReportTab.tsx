import React, { useMemo } from 'react';
import {
  Pulse as Activity,
  ShieldCheck,
  Target,
  Medal as Award,
  Warning as AlertTriangle,
  ArrowRight,
  CheckCircle as CheckCircle2,
  TrendUp as TrendingUp,
  Download,
  Copy,
  Check
} from '@phosphor-icons/react';
import { AppData, Transaction, TransactionType, Debt } from '../../types';
import { PredictiveEngine } from '../../services/PredictiveEngine';

interface HealthReportTabProps {
  data: AppData;
  filteredTransactions: Transaction[];
  formatMoney: (val: number, sym: string) => string;
  currencySymbol: string;
  privacyMode: boolean;
  onCopyReport: () => void;
  onExportReport: () => void;
  isCopied: boolean;
}

export const HealthReportTab: React.FC<HealthReportTabProps> = ({
  data,
  filteredTransactions,
  formatMoney,
  currencySymbol,
  privacyMode,
  onCopyReport,
  onExportReport,
  isCopied,
}) => {
  // Aggregate stats
  const { totalIncome, totalExpense, savingsRate, totalIOwe, totalOwesMe, runwayDays, topCategory } = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = filteredTransactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);
    const rate = income > 0 ? ((income - expense) / income) * 100 : 0;
    
    const iOwe = data.debts
      .filter((d) => !d.isSettled && d.type === 'I_OWE')
      .reduce((sum, d) => sum + d.amount, 0);
    const owesMe = data.debts
      .filter((d) => !d.isSettled && d.type === 'OWES_ME')
      .reduce((sum, d) => sum + d.amount, 0);

    const runway = PredictiveEngine.getRunwayDays(data, totalIncome - totalExpense > 0 ? totalIncome - totalExpense : 1000);

    const catMap: Record<string, number> = {};
    filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });
    const sortedCats = Object.entries(catMap).sort((a,b) => b[1] - a[1]);
    const top = sortedCats[0] ? { name: sortedCats[0][0], amount: sortedCats[0][1] } : null;

    return {
      totalIncome: income,
      totalExpense: expense,
      savingsRate: rate,
      totalIOwe: iOwe,
      totalOwesMe: owesMe,
      runwayDays: runway,
      topCategory: top,
    };
  }, [filteredTransactions, data]);

  // Compute 0-100 Financial Health Composite Score
  const healthScore = useMemo(() => {
    let score = 0;
    
    // 1. Savings Rate component (30 max)
    if (savingsRate >= 25) score += 30;
    else if (savingsRate >= 15) score += 24;
    else if (savingsRate >= 5) score += 16;
    else if (savingsRate >= 0) score += 10;
    else score += 2;

    // 2. Runway component (25 max)
    if (runwayDays >= 120) score += 25;
    else if (runwayDays >= 60) score += 20;
    else if (runwayDays >= 30) score += 15;
    else if (runwayDays >= 14) score += 8;
    else score += 3;

    // 3. Debt-to-Income component (25 max)
    if (totalIOwe === 0) score += 25;
    else if (totalIncome > 0 && totalIOwe <= totalIncome * 0.2) score += 18;
    else if (totalIncome > 0 && totalIOwe <= totalIncome * 0.5) score += 10;
    else score += 4;

    // 4. Budget Adherence & Planning component (20 max)
    const activeGoals = data.wallets.filter(w => w.type === 'GOAL').length;
    if (activeGoals > 0) score += 10;
    else score += 5;

    let overBudgetCount = 0;
    Object.entries(data.settings.budgetLimits || {}).forEach(([cat, config]: [string, any]) => {
      const catSpent = filteredTransactions
        .filter(t => t.type === TransactionType.EXPENSE && t.category === cat)
        .reduce((s,t) => s + t.amount, 0);
      if (config && config.limit && catSpent > config.limit) overBudgetCount++;
    });
    if (overBudgetCount === 0) score += 10;
    else if (overBudgetCount === 1) score += 5;

    return Math.min(100, Math.max(0, score));
  }, [savingsRate, runwayDays, totalIOwe, totalIncome, data.wallets, data.settings.budgetLimits, filteredTransactions]);

  // Determine Grade & Tier
  const { grade, tierName, tierColor } = useMemo(() => {
    if (healthScore >= 90) return { grade: 'A+', tierName: 'Elite Financial Health', tierColor: 'var(--status-success-fg)' };
    if (healthScore >= 80) return { grade: 'A', tierName: 'Strong Financial Health', tierColor: 'var(--status-success-fg)' };
    if (healthScore >= 70) return { grade: 'B', tierName: 'Stable Financial Posture', tierColor: '#3b82f6' };
    if (healthScore >= 55) return { grade: 'C', tierName: 'Moderate Vulnerability', tierColor: 'var(--status-warning-fg)' };
    return { grade: 'D', tierName: 'Action Required', tierColor: 'var(--status-error-fg)' };
  }, [healthScore]);

  // Local algorithmic advice
  const localAdvice = useMemo(() => PredictiveEngine.getLocalAdvice(data), [data]);

  const displayMoney = (val: number) => {
    if (privacyMode) return '••••';
    return formatMoney(val, currencySymbol);
  };

  return (
    <div className="space-y-6">
      {/* 1. Executive Health Scorecard */}
      <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Score Ring / Grade Display */}
            <div className="w-16 h-16 rounded-[10px] bg-[var(--bg-subtle)] border border-[var(--border-default)] flex flex-col items-center justify-center shrink-0">
              <span className="text-2xl font-bold font-mono tracking-tight text-[var(--text-primary)]">
                {healthScore}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">/ 100</span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  Composite Financial Score
                </span>
                <span
                  className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-[4px]"
                  style={{ color: tierColor, backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  Grade {grade}
                </span>
              </div>
              <h2 className="text-lg font-medium text-[var(--text-primary)] mt-0.5">
                {tierName}
              </h2>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                Evaluates savings rate, cash buffer coverage, debt exposure, and budget discipline.
              </p>
            </div>
          </div>

          {/* Quick Share / Export Buttons */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onCopyReport}
              className="h-[32px] px-3 rounded-[6px] text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] transition-colors flex items-center gap-1.5"
            >
              {isCopied ? <Check size={14} strokeWidth={1.5} className="text-[var(--status-success-fg)]" /> : <Copy size={14} strokeWidth={1.5} />}
              <span>{isCopied ? 'Copied' : 'Copy Diagnosis'}</span>
            </button>
          </div>
        </div>

        {/* 4 Pillars Breakdown Progress Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-5 mt-5 border-t border-[var(--border-default)]">
          {/* Pillar 1 */}
          <div className="p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-[var(--text-muted)]">Savings Rate</span>
              <span className="font-mono text-[var(--text-primary)]">{savingsRate.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full bg-[var(--bg-surface)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#22c55e]"
                style={{ width: `${Math.min(Math.max(0, savingsRate), 100)}%` }}
              />
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-[var(--text-muted)]">Runway Depth</span>
              <span className="font-mono text-[var(--text-primary)]">
                {runwayDays === Infinity ? '365d+' : `${runwayDays}d`}
              </span>
            </div>
            <div className="h-1.5 w-full bg-[var(--bg-surface)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#3b82f6]"
                style={{ width: `${Math.min(100, (runwayDays / 90) * 100)}%` }}
              />
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-[var(--text-muted)]">Debt Obligation</span>
              <span className="font-mono text-[var(--text-primary)]">
                {totalIOwe === 0 ? 'Zero Debt' : displayMoney(totalIOwe)}
              </span>
            </div>
            <div className="h-1.5 w-full bg-[var(--bg-surface)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#f59e0b]"
                style={{ width: totalIOwe === 0 ? '100%' : '35%' }}
              />
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-[var(--text-muted)]">Active Goals</span>
              <span className="font-mono text-[var(--text-primary)]">
                {data.wallets.filter((w) => w.type === 'GOAL').length} Tracked
              </span>
            </div>
            <div className="h-1.5 w-full bg-[var(--bg-surface)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[#8b5cf6]"
                style={{ width: data.wallets.filter((w) => w.type === 'GOAL').length > 0 ? '100%' : '20%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Automated Financial Diagnostic & Action Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        {/* Diagnostic Observations */}
        <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Algorithmic Audit
              </span>
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">Heuristic Audit</span>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
              Automated Behavioral Insights
            </h3>

            <div className="space-y-2.5">
              {localAdvice.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-start gap-2.5"
                >
                  <Activity size={15} strokeWidth={1.5} className="text-[#3b82f6] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                    {insight}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-[11px] text-[var(--text-muted)] pt-3 mt-3 border-t border-[var(--border-default)]">
            Observations update dynamically as you log new transactions.
          </div>
        </div>

        {/* Actionable Financial Prescription */}
        <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Action Plan
              </span>
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">Prescription</span>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
              Key Optimization Steps
            </h3>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-start gap-2.5">
                <CheckCircle2 size={16} strokeWidth={1.5} className="text-[#22c55e] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[12px] font-medium text-[var(--text-primary)]">
                    {topCategory ? `Optimize ${topCategory.name} Outflow` : 'Maintain Balanced Category Distribution'}
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    {topCategory
                      ? `${topCategory.name} is your largest expense (${displayMoney(topCategory.amount)}). Shaving 10% from this category saves ${displayMoney(topCategory.amount * 0.1)}.`
                      : 'Distribute expenses across clear categories to maintain visibility.'}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-start gap-2.5">
                <CheckCircle2 size={16} strokeWidth={1.5} className="text-[#22c55e] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[12px] font-medium text-[var(--text-primary)]">
                    {totalIOwe > 0 ? 'Clear Outstanding Borrowings' : 'Expand Savings Goal Reserves'}
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    {totalIOwe > 0
                      ? `Prioritize settling active debts totaling ${displayMoney(totalIOwe)} to eliminate liability drag.`
                      : 'Set up or top-up a Goal Wallet to lock in surplus liquid cash.'}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-start gap-2.5">
                <CheckCircle2 size={16} strokeWidth={1.5} className="text-[#22c55e] shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-[12px] font-medium text-[var(--text-primary)]">
                    Enforce Category Budget Caps
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                    Set spending limits in Settings &gt; Budget Limits to get real-time alerts before overspending occurs.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[var(--text-secondary)] pt-3 mt-3 border-t border-[var(--border-default)]">
            Implementing these steps will elevate your score toward Grade A+ (90+).
          </div>
        </div>
      </div>
    </div>
  );
};
