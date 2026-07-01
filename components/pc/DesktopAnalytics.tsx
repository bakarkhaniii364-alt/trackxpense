
import React, { useMemo, useState } from 'react';
import { AppData, Transaction, TransactionType, CategoryItem, Debt } from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, LineChart, Line, AreaChart, Area, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award, Activity, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import { AdvancedAnalytics } from '../AdvancedAnalytics';

interface DesktopAnalyticsProps {
    data: AppData;
    formatMoney: (val: number, sym: string) => string;
}

export const DesktopAnalytics: React.FC<DesktopAnalyticsProps> = ({ data, formatMoney }) => {
    const transactions = useMemo(() => 
        data.transactions.filter(t => t.walletId === data.currentWalletId)
    , [data.transactions, data.currentWalletId]);

    // Data Aggregation
    const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    const totalAssets = data.wallets.reduce((sum, w) => {
        const walletBalance = data.transactions
            .filter(t => t.walletId === w.id)
            .reduce((s, t) => s + (t.type === TransactionType.INCOME ? t.amount : -t.amount), 0);
        return sum + walletBalance;
    }, 0);

    const totalLiabilities = data.debts
        .filter(d => !d.isSettled && d.type === 'I_OWE')
        .reduce((sum, d) => sum + d.amount, 0);
    
    const netWorth = totalAssets - totalLiabilities;

    const expenseByCategory = useMemo(() => {
        const acc: Record<string, number> = {};
        transactions.filter(t => t.type === TransactionType.EXPENSE).forEach(t => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
        });
        return Object.entries(acc)
            .sort((a, b) => b[1] - a[1])
            .map(([name, value]) => ({ name, value }));
    }, [transactions]);

    const dailySpending = useMemo(() => {
        const last14Days = [...Array(14)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (13 - i));
            const dateStr = d.toISOString().split('T')[0];
            const amt = transactions
                .filter(t => t.type === TransactionType.EXPENSE && t.date && typeof t.date === 'string' && t.date.startsWith(dateStr))
                .reduce((s, t) => s + t.amount, 0);
            return { date: dateStr, name: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), value: amt };
        });
        return last14Days;
    }, [transactions]);

    const COLORS = ['#5e5ce6', '#32d74b', '#ff453a', '#ff9f0a', '#64d2ff', '#bf5af2', '#ff375f'];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto pb-6 overflow-x-hidden">

            {/* Top Row: High-Density Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
                {[
                    { label: 'Net Worth', value: formatMoney(netWorth, data.settings.currencySymbol), icon: Award, color: 'text-primary' },
                    { label: 'Total Assets', value: formatMoney(totalAssets, data.settings.currencySymbol), icon: TrendingUp, color: 'text-emerald-400' },
                    { label: 'Total Debt', value: formatMoney(totalLiabilities, data.settings.currencySymbol), icon: TrendingDown, color: 'text-rose-400' },
                    { label: 'Retention', value: `${savingsRate.toFixed(1)}%`, icon: Target, color: 'text-blue-400' },
                    { label: 'Avg Burn', value: formatMoney(totalExpense / 30, data.settings.currencySymbol), icon: Activity, color: 'text-rose-500' },
                    { label: 'Inflow', value: formatMoney(totalIncome, data.settings.currencySymbol), icon: ArrowUpRight, color: 'text-emerald-500' },
                ].map((stat, i) => (
                    <div key={i} className="glass-card p-4 rounded-md group hover:border-primary/20 transition-all">
                        <p className="text-[9px] font-black text-muted/40 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                        <div className="flex items-center gap-2">
                             <div className={`${stat.color} opacity-40 group-hover:opacity-100 transition-opacity`}><stat.icon size={12} strokeWidth={3} /></div>
                             <p className="text-sm font-bold text-main tracking-tight">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Middle Row: Strategic Visualizations */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                {/* Consumption Velocity (Line Chart) */}
                <div className="xl:col-span-8 liquid-glass p-6 rounded-sm shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[9px] font-black text-muted/40 uppercase tracking-[0.2em]">Spending Velocity</h3>
                        <div className="flex gap-2">
                             <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-[8px] font-black uppercase tracking-[0.2em]">Active Forecast</span>
                        </div>
                    </div>
                    <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={dailySpending}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#5e5ce6" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#5e5ce6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 600}} />
                                <YAxis hide />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1c1c1e', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
                                    formatter={(val: number) => [formatMoney(val, data.settings.currencySymbol), '']}
                                />
                                <Area type="monotone" dataKey="value" stroke="#5e5ce6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorValue)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Behavioral Mix (Donut) */}
                <div className="xl:col-span-4 liquid-glass p-6 rounded-sm shadow-lg flex flex-col">
                    <h3 className="text-[9px] font-black text-muted/40 uppercase tracking-[0.2em] mb-6 text-center">Category Breakdown</h3>
                    <div className="flex-1 flex flex-col justify-center relative min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={expenseByCategory.slice(0, 6)}
                                    innerRadius={50}
                                    outerRadius={75}
                                    paddingAngle={8}
                                    dataKey="value"
                                    animationDuration={1000}
                                >
                                    {expenseByCategory.slice(0, 6).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1c1c1e', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
                                    formatter={(val: number) => formatMoney(val, data.settings.currencySymbol)}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <p className="text-[14px] font-bold text-main tracking-tighter">{formatMoney(totalExpense, data.settings.currencySymbol)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        {expenseByCategory.slice(0, 4).map((cat, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="text-[8px] font-black text-muted/50 uppercase truncate tracking-tight">{cat.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Historical Balance Projection */}
            {data.balanceHistory && data.balanceHistory.length > 0 && (
                <div className="liquid-glass p-8 rounded-lg shadow-2xl border border-white/5 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-5">
                        <Zap size={200} className="text-primary" />
                    </div>
                    <div className="flex justify-between items-center mb-10 relative z-10">
                        <div>
                            <p className="text-[9px] font-black text-muted/40 uppercase tracking-[0.2em] mb-2">30-Day Snapshot Analysis</p>
                            <h3 className="text-2xl font-bold text-main tracking-tight">Net Worth Velocity Trend</h3>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">Historical Delta Tracked</span>
                        </div>
                    </div>
                    
                    <div className="h-[280px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.balanceHistory.map(h => ({ 
                                name: new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), 
                                value: h.amount 
                            }))}>
                                <defs>
                                    <linearGradient id="colorNetWorthDesktop" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#5e5ce6" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#5e5ce6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'rgba(255,255,255,0.2)', fontSize: 9, fontWeight: 600}} />
                                <YAxis hide />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1c1c1e', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
                                    formatter={(val: number) => [formatMoney(val, data.settings.currencySymbol), 'Historical Net Worth']}
                                />
                                <Area type="monotone" dataKey="value" stroke="#5e5ce6" strokeWidth={3} fillOpacity={1} fill="url(#colorNetWorthDesktop)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Bottom Row: Insights & Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* AI Diagnostic Report */}
                <div className="glass-card p-6 rounded-sm group overflow-hidden border-indigo-500/20 hover:border-indigo-500/40 transition-all">
                     <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-sm shadow-lg shadow-indigo-500/10">
                            <Activity size={14} />
                        </div>
                        <h3 className="text-[9px] font-black text-muted/40 uppercase tracking-[0.2em]">Health Report</h3>
                     </div>
                     <div className="space-y-3 text-[11px] text-indigo-100/60 leading-relaxed font-bold tracking-tight">
                        <p>Asset retention currently remains <span className="text-main">Stable</span>. Operating efficiency at <span className="text-emerald-400">{savingsRate.toFixed(1)}%</span>.</p>
                        <p>Core liquidity drain identified in <span className="text-main">{expenseByCategory[0]?.name || 'N/A'}</span>. Recommend <span className="text-primary font-black uppercase tracking-widest text-[9px]">8.5% Inflow Optimization</span>.</p>
                     </div>
                </div>

                {/* Granular Taxonomy Breakdown */}
                <div className="liquid-glass p-6 rounded-sm shadow-lg">
                    <h3 className="text-[9px] font-black text-muted/40 uppercase tracking-[0.2em] mb-5">Category List</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 max-h-[180px] overflow-y-auto no-scrollbar pr-2">
                        {expenseByCategory.map((cat, i) => {
                            const prog = (cat.value / (totalExpense || 1)) * 100;
                            return (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-bold text-main">{cat.name}</span>
                                        <span className="text-[10px] font-mono text-muted">{Math.round(prog)}%</span>
                                    </div>
                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary/40 group-hover:bg-primary transition-all duration-1000" style={{ width: `${prog}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
            {/* High Density Analytical Layer */}
            <div className="pt-8 border-t border-white/5">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-4 w-1 bg-primary rounded-full shadow-lg shadow-primary/50" />
                    <h3 className="text-sm font-black text-main uppercase tracking-[0.3em]">Detailed Analytics</h3>
                </div>
                <AdvancedAnalytics data={data} formatMoney={formatMoney} />
            </div>
        </div>
    );
};
