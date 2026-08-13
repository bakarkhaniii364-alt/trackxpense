import React, { useMemo } from 'react';
import { AppData, Transaction, TransactionType } from '../../types';
import { PredictiveEngine } from '../../services/PredictiveEngine';

interface BentoHealthAuditProps {
  data: AppData;
  filteredTransactions: Transaction[];
  formatMoney: (val: number, sym: string) => string;
  currencySymbol: string;
  privacyMode: boolean;
}

export const BentoHealthAudit: React.FC<BentoHealthAuditProps> = ({
  data,
  filteredTransactions,
  formatMoney,
  currencySymbol,
  privacyMode,
}) => {
  const { healthScore, grade, observations } = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === TransactionType.INCOME)
      .reduce((s, t) => s + t.amount, 0);
    const expense = filteredTransactions
      .filter((t) => t.type === TransactionType.EXPENSE)
      .reduce((s, t) => s + t.amount, 0);
    const rate = income > 0 ? ((income - expense) / income) * 100 : 0;

    const iOwe = data.debts
      .filter((d) => !d.isSettled && d.type === 'I_OWE')
      .reduce((s, d) => s + d.amount, 0);

    const runway = PredictiveEngine.getRunwayDays(data, income - expense > 0 ? income - expense : 1000);

    let score = 0;
    if (rate >= 20) score += 30;
    else if (rate >= 10) score += 20;
    else if (rate >= 0) score += 10;

    if (runway >= 90) score += 25;
    else if (runway >= 30) score += 18;
    else if (runway >= 14) score += 10;
    else score += 3;

    if (iOwe === 0) score += 25;
    else if (income > 0 && iOwe <= income * 0.25) score += 15;
    else score += 5;

    const goalCount = data.wallets.filter((w) => w.type === 'GOAL').length;
    if (goalCount > 0) score += 10;
    else score += 5;

    let overBudgetCount = 0;
    Object.entries(data.settings.budgetLimits || {}).forEach(([cat, config]: [string, any]) => {
      const catSpent = filteredTransactions
        .filter((t) => t.type === TransactionType.EXPENSE && t.category === cat)
        .reduce((s, t) => s + t.amount, 0);
      if (config && config.limit && catSpent > config.limit) overBudgetCount++;
    });
    if (overBudgetCount === 0) score += 10;
    else if (overBudgetCount === 1) score += 5;

    const finalScore = Math.min(100, Math.max(0, score));
    let finalGrade = 'C';
    if (finalScore >= 90) finalGrade = 'A+';
    else if (finalScore >= 80) finalGrade = 'A';
    else if (finalScore >= 70) finalGrade = 'B';
    else if (finalScore >= 50) finalGrade = 'C';
    else finalGrade = 'D';

    const localInsights = PredictiveEngine.getLocalAdvice(data);
    const anomalies = PredictiveEngine.detectAnomalies(data);

    const items: string[] = [];
    if (anomalies.length > 0) {
      items.push(`Anomaly: ${anomalies.length} transaction(s) exceeded 1.5x of your category moving average.`);
    }
    localInsights.forEach((ins) => {
      if (items.length < 3) items.push(ins);
    });

    return { healthScore: finalScore, grade: finalGrade, observations: items };
  }, [filteredTransactions, data]);

  return (
    <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-medium text-[var(--text-secondary)]">
            Health audit
          </span>
          <div className="text-right font-mono text-[12px]">
            <span className="font-semibold text-[var(--text-primary)]">
              {healthScore}/100
            </span>
            <span className="text-[var(--text-secondary)] ml-1">
              (Grade {grade})
            </span>
          </div>
        </div>

        {/* Observations list */}
        <div className="space-y-2 mt-3">
          {observations.map((obs, i) => (
            <div key={i} className="p-2.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                {obs}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="text-[10px] text-[var(--text-muted)] pt-2 mt-2 border-t border-[var(--border-default)] font-mono">
        Local rule-based heuristic engine • updates automatically
      </div>
    </div>
  );
};
