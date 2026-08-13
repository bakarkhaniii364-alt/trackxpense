import React from 'react';
import { AppData } from '../../types';

interface BudgetAlertsProps {
    budgetAlerts: any[];
    data: AppData;
    formatMoney: (val: number, sym: string) => string;
}

export const BudgetAlerts: React.FC<BudgetAlertsProps> = ({ budgetAlerts, data, formatMoney }) => {
    if (budgetAlerts.length === 0) return null;
    const currency = data.settings.currencySymbol;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                    Budget Threshold Alerts
                </span>
                <span className="text-[11px] font-medium text-[var(--status-warning-fg)] font-mono">
                    {budgetAlerts.length} near limit
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
                {budgetAlerts.map((b: any) => {
                    const ratio = b.spent / b.limit;
                    const isExceeded = ratio >= 1;

                    return (
                        <div
                            key={b.cat}
                            className="rounded-[18px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 lg:p-6 flex flex-col justify-between transition-colors"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${isExceeded ? 'bg-[var(--status-error-fg)]' : 'bg-[var(--status-warning-fg)]'}`} />
                                        <span className="text-[10px] uppercase font-mono text-[var(--text-muted)]">
                                            {b.period || 'MONTHLY'}
                                        </span>
                                    </div>
                                    <h4 className="text-[13px] font-semibold text-[var(--text-primary)] truncate max-w-[130px]">
                                        {b.cat}
                                    </h4>
                                </div>

                                <div className="text-right">
                                    <span className="text-[13px] font-mono font-semibold text-[var(--text-primary)]">
                                        {formatMoney(b.spent, currency)}
                                    </span>
                                    <div className="text-[10px] text-[var(--text-muted)]">
                                        of {formatMoney(b.limit, currency)}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden mb-1.5">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${isExceeded ? 'bg-[var(--status-error-fg)]' : 'bg-[var(--status-warning-fg)]'}`}
                                        style={{ width: `${Math.min(100, ratio * 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                                    <span>{Math.round(ratio * 100)}% utilized</span>
                                    <span className={isExceeded ? 'text-[var(--status-error-fg)] font-medium' : 'text-[var(--status-warning-fg)]'}>
                                        {isExceeded ? 'Exceeded' : 'Near limit'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
