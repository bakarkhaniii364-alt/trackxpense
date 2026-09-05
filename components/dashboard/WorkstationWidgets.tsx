import React from 'react';
import { AppData, TransactionType, Streak } from '../../types';

interface WidgetProps {
    data: AppData;
}

export const FinancialHealthScore: React.FC<WidgetProps> = ({ data }) => {
    const calculateScore = () => {
        const totalIncome = data.transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = data.transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
        const currentBalance = totalIncome - totalExpense;
        const totalDebtOwed = (data.debts || [])
            .filter(d => !d.isSettled && d.type === 'I_OWE')
            .reduce((sum, d) => {
                const paid = (d.payments || []).reduce((s, p) => s + p.amount, 0);
                return sum + Math.max(0, d.amount - paid);
            }, 0);

        // Immediate Critical Check: Uncovered debt with zero or negative liquid balance
        if (totalDebtOwed > 0 && currentBalance <= 0) {
            return Math.max(10, Math.round(25 - Math.min(15, totalDebtOwed / 1000)));
        }

        let score = 0;

        // 1. Budget Adherence (30%)
        const limits = data.settings.budgetLimits || {};
        const limitKeys = Object.keys(limits);
        if (limitKeys.length > 0) {
            const breaches = limitKeys.filter(cat => {
                const limit = typeof limits[cat] === 'number' ? limits[cat] : limits[cat].limit;
                const spend = data.transactions
                    .filter(t => t.type === TransactionType.EXPENSE && t.category === cat)
                    .reduce((sum, t) => sum + t.amount, 0);
                return spend > limit;
            }).length;
            score += Math.max(0, 30 - (breaches * 10));
        } else {
            score += currentBalance > 0 ? 20 : 10;
        }

        // 2. Net Liquidity & Savings Rate (30%)
        if (totalIncome > 0) {
            const savingsRate = ((totalIncome - totalExpense) / totalIncome) * 100;
            if (savingsRate > 0) {
                score += Math.min(30, (savingsRate / 25) * 30);
            }
        } else if (currentBalance > 0) {
            score += 15;
        }

        // 3. Debt Solvency (30%)
        if (totalDebtOwed === 0) {
            score += 30; // Debt-free bonus
        } else if (currentBalance > 0) {
            const coverage = currentBalance / totalDebtOwed;
            if (coverage >= 2) score += 25;
            else if (coverage >= 1) score += 18;
            else score += Math.round(coverage * 15);
        } else {
            score += 0;
        }

        // 4. Activity & Streaks (10%)
        const totalStreaks: number = (Object.values(data.streaks || {}) as Streak[]).reduce((sum: number, s) => sum + s.current, 0);
        score += Math.min(10, totalStreaks > 0 ? 10 : 0);

        return Math.max(0, Math.min(100, Math.round(score)));
    };

    const score = calculateScore();
    const getStatus = () => {
        if (score >= 80) return { label: 'Optimum', textClass: 'text-[var(--status-success-fg)]', dotClass: 'bg-[var(--status-success-fg)]' };
        if (score >= 50) return { label: 'Stable', textClass: 'text-[var(--status-warning-fg)]', dotClass: 'bg-[var(--status-warning-fg)]' };
        return { label: 'Critical', textClass: 'text-[var(--status-error-fg)]', dotClass: 'bg-[var(--status-error-fg)]' };
    };

    const status = getStatus();

    return (
        <div className="rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 sm:p-5 flex flex-col justify-between transition-colors h-full">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)] truncate">
                        Stability
                    </span>
                    <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass}`} />
                        <span className={`text-[10px] font-medium ${status.textClass}`}>{status.label}</span>
                    </div>
                </div>

                <div className="mb-2">
                    <div className="text-base sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] tracking-tight font-mono">
                        {score} <span className="text-[11px] font-normal text-[var(--text-secondary)]">/ 100</span>
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-normal truncate">
                        Health rating
                    </div>
                </div>
            </div>

            <div>
                <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden mb-2.5">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${
                            score >= 80
                                ? 'bg-[var(--status-success-fg)]'
                                : score >= 50
                                    ? 'bg-[var(--status-warning-fg)]'
                                    : 'bg-[var(--status-error-fg)]'
                        }`}
                        style={{ width: `${score}%` }}
                    />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                    <span>Performance tier</span>
                    <span className="font-mono text-[var(--text-primary)] font-medium">
                        {score >= 80 ? 'Top 15%' : score >= 50 ? 'Moderate' : 'Needs Review'}
                    </span>
                </div>
            </div>
        </div>
    );
};
