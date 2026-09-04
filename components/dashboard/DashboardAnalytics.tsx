import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AppData, Transaction, TransactionType } from '../../types';

interface DashboardAnalyticsProps {
    chartData: any[];
    data: AppData;
    walletTransactions: Transaction[];
    totalExpense: number;
    formatMoney: (val: number, sym: string) => string;
    timeframeLabel?: string;
}

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
    chartData,
    data,
    walletTransactions,
    totalExpense,
    formatMoney,
    timeframeLabel = 'Last 7 days'
}) => {
    const currency = data.settings.currencySymbol;

    // Calculate top categories
    const categoryTotals = data.categories.map(cat => {
        const amount = walletTransactions
            .filter(t => t.category === cat.name && t.type === TransactionType.EXPENSE)
            .reduce((s, t) => s + t.amount, 0);
        const percent = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
        return { ...cat, amount, percent };
    }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

    const maxChartValue = Math.max(...chartData.map(d => d.spent || 0), 10);
    const avgDaily = chartData.length > 0 ? totalExpense / chartData.length : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
            {/* Main Spending Sparkline / Trend Card */}
            <div className="w-full rounded-[18px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 lg:p-6 flex flex-col justify-between transition-colors">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                            Spending Volume
                        </span>
                        <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                            {timeframeLabel}
                        </span>
                    </div>

                    <div className="flex items-baseline justify-between mb-4">
                        <div>
                            <div className="text-2xl lg:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
                                {formatMoney(totalExpense, currency)}
                            </div>
                            <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                                Avg {formatMoney(avgDaily, currency)}/day
                            </div>
                        </div>
                    </div>
                </div>

                {/* Cloudflare-inspired chart */}
                <div className="h-[160px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -24, bottom: 0 }}>
                            <defs>
                                <linearGradient id="cfSpendGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F6821F" stopOpacity={0.25} />
                                    <stop offset="95%" stopColor="#F6821F" stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 2" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                stroke="var(--text-muted)" 
                                fontSize={11} 
                                tickLine={false} 
                                axisLine={false}
                                dy={5}
                            />
                            <YAxis 
                                stroke="var(--text-muted)" 
                                fontSize={10} 
                                tickLine={false} 
                                axisLine={false}
                                tickFormatter={(v) => `${v}`}
                                domain={[0, Math.ceil(maxChartValue * 1.15)]}
                                orientation="right"
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--bg-surface)',
                                    borderColor: 'var(--border-strong)',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    color: 'var(--text-primary)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                    padding: '6px 10px'
                                }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                                labelStyle={{ color: 'var(--text-secondary)', marginBottom: '2px', fontSize: '10px' }}
                                formatter={(val: any) => [formatMoney(Number(val) || 0, currency), 'Spent']}
                            />
                            <Area
                                type="monotone"
                                dataKey="spent"
                                stroke="#F6821F"
                                strokeWidth={1.5}
                                fill="url(#cfSpendGrad)"
                                activeDot={{ r: 4, fill: '#F6821F', stroke: 'var(--bg-surface)', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Category Allocation Meter Card */}
            <div className="w-full rounded-[18px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 lg:p-6 flex flex-col justify-between transition-colors">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                            Category Distribution
                        </span>
                        <span className="text-[11px] font-medium text-[var(--text-secondary)] font-mono">
                            {categoryTotals.length} active
                        </span>
                    </div>

                    <div className="mb-4">
                        <div className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
                            {categoryTotals.length > 0 ? categoryTotals[0].name : 'No expenses'}
                        </div>
                        <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                            {categoryTotals.length > 0 ? `Top expense category (${Math.round(categoryTotals[0].percent)}% of total)` : 'No category spend recorded'}
                        </div>
                    </div>
                </div>

                <div className="space-y-3 mt-2 overflow-y-auto max-h-[160px] no-scrollbar">
                    {categoryTotals.length > 0 ? (
                        categoryTotals.slice(0, 4).map(cat => (
                            <div key={cat.id || cat.name} className="space-y-1.5">
                                <div className="flex justify-between items-center text-[12px]">
                                    <span className="font-medium text-[var(--text-primary)] truncate max-w-[140px]">{cat.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-[var(--text-secondary)]">{formatMoney(cat.amount, currency)}</span>
                                        <span className="text-[11px] font-mono text-[var(--text-muted)] w-8 text-right">{Math.round(cat.percent)}%</span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full transition-all duration-700 bg-[var(--accent-solid)]"
                                        style={{ 
                                            width: `${Math.min(100, cat.percent)}%`,
                                            backgroundColor: cat.color || 'var(--accent-solid)'
                                        }}
                                    />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-6 text-center text-[12px] text-[var(--text-muted)]">
                            No spending breakdown data available.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
