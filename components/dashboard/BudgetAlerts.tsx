import React from 'react';
import { AppData } from '../../types';
import { LayerCard } from '../shared/LayerCard';

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
                <span className="text-[12px] font-medium text-[var(--text-muted)]">
                    Budget threshold alerts
                </span>
                <span className="text-[12px] font-medium text-[var(--status-warning-fg)] font-mono">
                    {budgetAlerts.length} near limit
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                {budgetAlerts.map((b: any) => {
                    const ratio = b.spent / b.limit;
                    const isExceeded = ratio >= 1;

                    return (
                        <LayerCard
                            key={b.cat}
                            className="px-5 py-4 flex flex-col justify-between"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <span className={`w-1.5 h-1.5 rounded-full ${isExceeded ? 'bg-[var(--status-error-fg)]' : 'bg-[var(--status-warning-fg)]'}`} />
                                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                                            {b.period ? (b.period.charAt(0).toUpperCase() + b.period.slice(1).toLowerCase()) : 'Monthly'}
                                        </span>
                                    </div>
                                    <h4 className="text-[14px] font-semibold text-[var(--text-primary)] truncate max-w-[130px]">
                                        {b.cat}
                                    </h4>
                                </div>

                                <div className="text-right">
                                    <span className="text-[14px] font-mono font-semibold text-[var(--text-primary)]">
                                        {formatMoney(b.spent, currency)}
                                    </span>
                                    <div className="text-[11px] text-[var(--text-muted)]">
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
                                <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                                    <span>{Math.round(ratio * 100)}% utilized</span>
                                    <span className={isExceeded ? 'text-[var(--status-error-fg)] font-medium' : 'text-[var(--status-warning-fg)]'}>
                                        {isExceeded ? 'Exceeded' : 'Near limit'}
                                    </span>
                                </div>
                            </div>
                        </LayerCard>
                    );
                })}
            </div>
        </div>
    );
};
