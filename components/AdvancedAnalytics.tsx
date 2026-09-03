import React, { useMemo } from 'react';
import { AppData, TransactionType } from '../types';
import { PredictiveEngine } from '../services/PredictiveEngine';
import {
  TrendUp as TrendingUp
} from '@phosphor-icons/react';

interface AdvancedAnalyticsProps {
    data: AppData;
    formatMoney: (val: number, sym: string) => string;
}

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ data, formatMoney }) => {
    
    // 1. Heatmap Data
    const heatmapData = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const map: Record<string, number> = {};
        
        data.transactions.forEach(tx => {
            const d = new Date(tx.date);
            const key = `${days[d.getDay()]}-${d.getHours()}`;
            map[key] = (map[key] || 0) + 1;
        });

        const max = Math.max(...Object.values(map), 1);
        return { map, max, days };
    }, [data.transactions]);

    // 2. Anomalies
    const anomalies = useMemo(() => PredictiveEngine.detectAnomalies(data), [data]);

    // 3. Top category pairs (computed from actual transactions)
    const topPairs = useMemo(() => {
        const expenses = data.transactions.filter(t => t.type === TransactionType.EXPENSE);
        const catTotals: Record<string, number> = {};
        expenses.forEach(t => {
            catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
        });
        const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
        const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0) || 1;
        const pairs: { cat1: string; cat2: string; share: number }[] = [];
        for (let i = 0; i < sorted.length - 1 && pairs.length < 3; i += 2) {
            pairs.push({
                cat1: sorted[i][0],
                cat2: sorted[i + 1]?.[0] || '—',
                share: ((sorted[i][1] + (sorted[i + 1]?.[1] || 0)) / totalExpenses),
            });
        }
        return pairs;
    }, [data.transactions]);

    // 4. Inflation impact (based on actual total spending)
    const totalYearlySpending = useMemo(() => {
        const expenses = data.transactions.filter(t => t.type === TransactionType.EXPENSE);
        if (expenses.length === 0) return 0;
        const days = new Set(expenses.map(t => t.date.split('T')[0]));
        const total = expenses.reduce((s, t) => s + t.amount, 0);
        const dailyAvg = total / Math.max(days.size, 1);
        return dailyAvg * 365;
    }, [data.transactions]);

    const inflationRate = 0.06;
    const inflationImpact = totalYearlySpending * inflationRate;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Anomaly Alerts */}
            {anomalies.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] px-2 flex items-center gap-2">
                        Unusual Spending Alerts
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {anomalies.map(tx => (
                            <div key={tx.id} className="liquid-glass border-rose-500/20 bg-rose-500/5 p-4 rounded-xl flex items-center justify-between">
                                 <div>
                                     <p className="text-xs font-bold text-main">{tx.category} — Unusually high</p>
                                     <p className="text-[10px] text-rose-400/60 font-medium">1.5x above your average</p>
                                 </div>
                                 <span className="text-sm font-bold text-rose-500">{formatMoney(tx.amount, data.settings.currencySymbol)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Heatmap */}
                <div className="liquid-glass p-4 lg:p-8 rounded-2xl lg:rounded-[32px] space-y-4 lg:space-y-6">
                    <div className="flex items-center justify-between">
                         <h3 className="text-sm font-bold text-main uppercase tracking-wider">Activity Heatmap</h3>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5">
                        <div />
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="text-[8px] font-black text-muted/30 text-center uppercase tracking-tighter">{i*3}h</div>
                        ))}
                        {heatmapData.days.map(day => (
                            <React.Fragment key={day}>
                                <div className="text-[9px] font-black text-muted/40 uppercase self-center">{day}</div>
                                {[...Array(7)].map((_, i) => {
                                    const count = heatmapData.map[`${day}-${i*3}`] || 0;
                                    const intensity = count / heatmapData.max;
                                    return (
                                        <div 
                                            key={i} 
                                            className="aspect-square rounded-lg transition-all hover:scale-110" 
                                            style={{ backgroundColor: intensity > 0 ? `rgba(94, 92, 230, ${0.1 + intensity * 0.9})` : 'rgba(255,255,255,0.03)' }}
                                            title={`${day} ${i*3}:00 — ${count} transaction${count !== 1 ? 's' : ''}`}
                                        />
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Top Spending Pairs & Inflation */}
                <div className="space-y-6">
                    <div className="glass-card p-4 lg:p-6 rounded-2xl lg:rounded-[28px] space-y-3 lg:space-y-4">
                        <div className="flex items-center justify-between">
                             <h3 className="text-sm font-bold text-main uppercase tracking-wider">Top Spending Categories</h3>
                        </div>
                        {topPairs.length > 0 ? (
                            <div className="space-y-3">
                                {topPairs.map(c => (
                                    <div key={c.cat1+c.cat2} className="flex items-center gap-4">
                                        <div className="flex-1 flex items-center justify-between bg-black/10 px-4 py-2.5 rounded-xl border border-white/5">
                                            <span className="text-[10px] font-bold text-main">{c.cat1}</span>
                                            <span className="text-muted/20 text-[8px]">+</span>
                                            <span className="text-[10px] font-bold text-main">{c.cat2}</span>
                                        </div>
                                        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full transition-all duration-1000 bg-primary" style={{ width: `${Math.min(c.share * 100, 100)}%` }} />
                                        </div>
                                        <span className="text-[10px] font-mono font-bold w-10 text-right text-primary">{(c.share * 100).toFixed(0)}%</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted/40 py-4 text-center">Add expenses to see category breakdowns</p>
                        )}
                    </div>

                    <div className="liquid-glass p-4 lg:p-6 rounded-2xl lg:rounded-[28px] bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/10">
                         <div className="flex items-center justify-between mb-4">
                             <h3 className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em]">Inflation Impact</h3>
                             <TrendingUp size={16} className="text-amber-500/40" />
                         </div>
                         <p className="text-xs text-amber-200/60 leading-relaxed mb-4">
                            {totalYearlySpending > 0
                                ? <>Based on your spending patterns, a 6% annual inflation would cost you an extra <span className="text-amber-500 font-bold">{formatMoney(inflationImpact, data.settings.currencySymbol)}</span> per year to maintain the same lifestyle.</>
                                : <>Start tracking expenses to see how inflation could affect your spending.</>
                            }
                         </p>
                         <div className="flex gap-2">
                             <div className="flex-1 h-1 bg-amber-500/20 rounded-full" />
                             <div className="flex-1 h-1 bg-amber-500/40 rounded-full" />
                             <div className="flex-1 h-1 bg-amber-500/10 rounded-full" />
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
