import React, { useMemo } from 'react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AppData, CategoryItem, Transaction, TransactionType } from '../../types';
import { NoDataWave } from '../shared/NoDataWave';

interface HistoryStatsProps {
    transactions?: Transaction[];
    pieData?: Array<{ name: string; value: number }>;
    data?: AppData;
    formatMoney?: (val: number, sym?: string) => string;
}

const DEFAULT_COLORS = ['#F6821F', '#10B981', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

export const HistoryStats: React.FC<HistoryStatsProps> = ({ 
    transactions = [], 
    pieData: propPieData, 
    data, 
    formatMoney = (val: number, sym: string = '$') => `${sym} ${val.toLocaleString()}` 
}) => {
    const currencySymbol = data?.settings?.currencySymbol || '$';
    const categories = data?.categories || [];

    // Derive pieData from transactions if not passed explicitly
    const resolvedPieData = useMemo(() => {
        if (propPieData && propPieData.length > 0) return propPieData;
        if (!transactions || transactions.length === 0) return [];

        const catMap: Record<string, number> = {};
        transactions
            .filter((t: Transaction) => t.type === TransactionType.EXPENSE)
            .forEach((t: Transaction) => {
                catMap[t.category] = (catMap[t.category] || 0) + t.amount;
            });

        return Object.entries(catMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [propPieData, transactions]);

    const totalSpending = useMemo(() => {
        return resolvedPieData.reduce((acc, curr) => acc + curr.value, 0);
    }, [resolvedPieData]);

    if (resolvedPieData.length === 0 || totalSpending === 0) {
        return (
            <div className="bg-[var(--bg-surface)] rounded-[8px] p-6 border border-[var(--border-default)]">
                <div className="flex items-center justify-between pb-4">
                    <span className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em]">
                        SPENDING DISTRIBUTION
                    </span>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">0.00</span>
                </div>
                <NoDataWave height={200} />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5 animate-in fade-in duration-200">
            {/* Donut Chart Card */}
            <div className="bg-[var(--bg-surface)] rounded-[8px] p-5 border border-[var(--border-default)] flex flex-col items-center">
                <div className="w-full flex items-center justify-between pb-3">
                    <span className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em]">
                        SPENDING DISTRIBUTION
                    </span>
                    <span className="text-[11px] font-mono font-medium text-[var(--text-primary)]">
                        {formatMoney(totalSpending, currencySymbol)}
                    </span>
                </div>

                <div className="h-64 w-full relative">
                    <ResponsiveContainer minWidth={0} minHeight={240} width="100%" height="100%">
                        <RePieChart>
                            <Pie 
                                data={resolvedPieData} 
                                innerRadius={65} 
                                outerRadius={92} 
                                paddingAngle={4} 
                                dataKey="value"
                                animationBegin={0}
                                animationDuration={800}
                                isAnimationActive={true}
                            >
                                {resolvedPieData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${entry.name}-${index}`} 
                                        fill={categories.find((c: CategoryItem) => c.name === entry.name)?.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} 
                                    />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#0D0D10', 
                                    borderColor: '#202026', 
                                    borderRadius: '6px', 
                                    color: '#F4F4F5', 
                                    border: '1px solid #202026', 
                                    fontSize: '12px',
                                    padding: '6px 10px'
                                }}
                                formatter={(val: number) => [formatMoney(val, currencySymbol), 'Spent']}
                            />
                        </RePieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="text-center">
                            <span className="text-[10px] uppercase font-mono tracking-wider text-[var(--text-muted)]">TOTAL</span>
                            <p className="text-[18px] font-bold font-mono text-[var(--text-primary)] mt-0.5 tracking-tight">
                                {formatMoney(totalSpending, currencySymbol)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Breakdown by Category Card */}
            <div className="bg-[var(--bg-surface)] rounded-[8px] p-5 border border-[var(--border-default)]">
                <div className="w-full flex items-center justify-between pb-3">
                    <span className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em]">
                        CATEGORY BREAKDOWN
                    </span>
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                        {resolvedPieData.length} Categories
                    </span>
                </div>

                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                    {resolvedPieData.map((entry, index) => {
                        const percentage = Math.round((entry.value / totalSpending) * 100);
                        const catColor = categories.find((c: CategoryItem) => c.name === entry.name)?.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                        return (
                            <div key={entry.name} className="flex flex-col gap-1.5 pb-2 border-b border-[var(--border-default)]/40 last:border-0 last:pb-0">
                                <div className="flex items-center justify-between text-[13px]">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                                        <span className="font-medium text-[var(--text-primary)]">{entry.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 font-mono">
                                        <span className="text-[var(--text-primary)]">{formatMoney(entry.value, currencySymbol)}</span>
                                        <span className="text-[11px] text-[var(--text-muted)]">({percentage}%)</span>
                                    </div>
                                </div>
                                <div className="h-1 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full transition-all duration-500" 
                                        style={{ width: `${percentage}%`, backgroundColor: catColor }} 
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
