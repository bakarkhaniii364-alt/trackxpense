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

export const SpendingHeatmap: React.FC<WidgetProps> = ({ data }) => {
    const days = Array.from({ length: 21 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (20 - i));
        return d.toISOString().split('T')[0];
    });

    const getIntensity = (date: string) => {
        const daySpend = data.transactions
            .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(date))
            .reduce((sum, t) => sum + t.amount, 0);
        
        if (daySpend === 0) return 'bg-[var(--bg-subtle)] border-transparent';
        if (daySpend < 30) return 'bg-[rgba(246,130,31,0.25)] border-[rgba(246,130,31,0.2)]';
        if (daySpend < 100) return 'bg-[rgba(246,130,31,0.6)] border-[rgba(246,130,31,0.4)]';
        return 'bg-[var(--accent)] border-[var(--accent)]';
    };

    const noSpendDays = days.filter(d => 
        data.transactions.filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(d)).length === 0
    ).length;

    return (
        <div className="rounded-[18px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 lg:p-6 flex flex-col justify-between transition-colors h-full">
            <div>
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        Spending Velocity
                    </span>
                    <span className="text-[11px] font-medium text-[var(--text-secondary)] font-mono">
                        21-day matrix
                    </span>
                </div>

                <div className="mb-3">
                    <div className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
                        {noSpendDays} <span className="text-sm font-normal text-[var(--text-secondary)]">no-spend days</span>
                    </div>
                    <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                        Daily transaction frequency
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 py-1">
                    {days.map(date => (
                        <div 
                            key={date}
                            className={`aspect-square rounded-[4px] border transition-transform hover:scale-110 cursor-default ${getIntensity(date)}`}
                            title={date}
                        />
                    ))}
                </div>
            </div>

            <div className="pt-2 mt-2 border-t border-[var(--border-default)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                <span>Velocity index</span>
                <div className="flex items-center gap-1">
                    <span className="text-[10px] text-[var(--text-muted)] mr-1">Low</span>
                    <div className="w-2 h-2 rounded-[2px] bg-[var(--bg-subtle)]" />
                    <div className="w-2 h-2 rounded-[2px] bg-[rgba(246,130,31,0.4)]" />
                    <div className="w-2 h-2 rounded-[2px] bg-[var(--accent)]" />
                    <span className="text-[10px] text-[var(--text-muted)] ml-1">High</span>
                </div>
            </div>
        </div>
    );
};
