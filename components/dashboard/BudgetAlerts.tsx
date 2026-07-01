import React from 'react';
import { AppData } from '../../types';

interface BudgetAlertsProps {
    budgetAlerts: any[];
    data: AppData;
    formatMoney: (val: number, sym: string) => string;
}

export const BudgetAlerts: React.FC<BudgetAlertsProps> = ({ budgetAlerts, data, formatMoney }) => {
    if (budgetAlerts.length === 0) return null;

    return (
        <div className="bento-grid gap-y-3">
            <h3 className="text-[9px] font-black text-muted/40 uppercase tracking-[0.2em] px-1">Budget Limits</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                {budgetAlerts.map((b: any) => (
                    <div key={b.cat} className="glass-card bento-card border-rose-500/20 flex-row items-center justify-between shadow-lg shadow-rose-500/5 group">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${b.period === 'DAILY' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                                    {b.period === 'DAILY' ? 'DAILY' : 'MONTHLY'}
                                </span>
                                <p className="text-sm font-bold text-main tracking-tight">{b.cat}</p>
                            </div>
                            <p className="text-[9px] text-rose-400 font-black uppercase tracking-widest">{Math.round((b.spent/b.limit)*100)}% Spent</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold text-main">{formatMoney(b.spent, data.settings.currencySymbol)}</p>
                            <p className="text-[8px] font-black text-muted/40 uppercase tracking-tighter">of {formatMoney(b.limit, data.settings.currencySymbol)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
