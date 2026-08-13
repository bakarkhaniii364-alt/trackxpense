
import React, { useMemo, useState } from 'react';
import { AppData, Transaction, TransactionType, CategoryItem, Debt } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, AreaChart, Area, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Target, Award, BrainCircuit, Activity } from 'lucide-react';
import { AdvancedAnalytics } from './AdvancedAnalytics';
import { EmptyStateSeeder } from './shared/EmptyStateSeeder';

interface AnalyticsProps {
    data: AppData;
    updateData?: (d: Partial<AppData>) => void;
    formatMoney: (val: number, sym: string) => string;
}

export const AnalyticsView: React.FC<AnalyticsProps> = ({ data, updateData, formatMoney }) => {
    const [tab, setTab] = useState<'overview' | 'spending' | 'report'>('overview');

    const transactions = data.transactions.filter(t => t.walletId === data.currentWalletId);
    
    // --- Data Processing ---
    
    // Totals
    const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((s: number, t: Transaction) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s: number, t: Transaction) => s + t.amount, 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    // Debt
    const totalIOwe = data.debts.filter(d => !d.isSettled && d.type === 'I_OWE').reduce((s: number, d: Debt) => s + d.amount, 0);
    const totalOwesMe = data.debts.filter(d => !d.isSettled && d.type === 'OWES_ME').reduce((s: number, d: Debt) => s + d.amount, 0);
    const netDebt = totalOwesMe - totalIOwe;

    // Spending by Category (Top 5)
    const expenseByCategory = transactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((acc: Record<string, number>, t: Transaction) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);
    
    const sortedCategories = Object.entries(expenseByCategory)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 5)
        .map(([name, value]: [string, number]) => ({ name, value }));

    // Last 7 Days Spending
    const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        const amt = transactions
            .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(dateStr))
            .reduce((s: number, t: Transaction) => s + t.amount, 0);
        return { name: dayName, value: amt };
    });

    // Average Spending
    const avgDailySpend = totalExpense / (transactions.length > 0 ? 30 : 1);

    // --- Report Text Generation ---
    const getReportText = () => {
        const topCat = sortedCategories[0];
        const health = savingsRate > 20 ? "Excellent" : savingsRate > 0 ? "Stable" : "Needs Attention";
        
        let intro = `Hi ${data.profile.name.split(' ')[0] || 'there'}! Here is your financial snapshot.`;
        
        if (savingsRate < 0) {
            intro += ` You're currently spending more than you earn. Let's look at where the money is going.`;
        } else if (savingsRate > 20) {
            intro += ` You're doing a fantastic job saving money! Keep it up.`;
        } else {
             intro += ` You're balancing your budget well, but there's room to save more.`;
        }

        let habit = "";
        if (topCat) {
            habit = ` Your biggest expense recently has been **${topCat.name}**, taking up a significant chunk of your outflow.`;
        }

        let debtStatus = "";
        if (totalIOwe > 0) {
            debtStatus = ` You currently have active debts totaling ${formatMoney(totalIOwe, data.settings.currencySymbol)}. Prioritize clearing these to reduce financial stress.`;
        } else if (totalOwesMe > 0) {
             debtStatus = ` People owe you ${formatMoney(totalOwesMe, data.settings.currencySymbol)}. Might be time to send a friendly reminder!`;
        } else {
            debtStatus = ` You are debt-free! That is a major achievement.`;
        }

        return { intro, habit, debtStatus, health };
    };

    const report = getReportText();
    const COLORS = ['#5e5ce6', '#32d74b', '#ff453a', '#ff9f0a', '#64d2ff'];

    return (
        <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-20 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2 lg:mb-4">
                <div>
                    <h2 className="text-xl lg:text-3xl font-bold text-main tracking-tight px-2">Analytics</h2>
                    <p className="text-[9px] lg:text-[10px] text-muted/40 font-black uppercase tracking-[0.2em] px-2 mt-0.5 lg:mt-1">Spending & Income Summary</p>
                </div>
                <div className="flex bg-black/20 p-1 rounded-md border border-white/5 shadow-inner">
                    {(['overview', 'spending', 'report'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-3 py-1.5 lg:px-5 lg:py-2 rounded lg:rounded-sm text-[9px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 ${tab === t ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted/60 hover:text-main'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {transactions.length === 0 ? (
                <EmptyStateSeeder 
                    data={data} 
                    updateData={updateData || (() => {})} 
                    title="No Analytics Data Available" 
                    description="Your transaction ledger is empty for this wallet. Seed sample data to generate spending pie charts, income vs expense breakdowns, and financial health scores." 
                />
            ) : (
                <>
                {tab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-6">
                        {/* Net Worth / Savings Card */}
                        <div className="liquid-glass rounded-2xl lg:rounded-md p-4 lg:p-8 border border-white/10 relative overflow-hidden shadow-2xl group transition-all hover:border-white/20">
                            <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />
                            <div className="flex justify-between items-start mb-6 lg:mb-10 relative z-10">
                                <div>
                                    <p className="text-muted/40 text-[9px] font-black uppercase tracking-[0.2em] mb-1 lg:mb-2">Financial Health</p>
                                    <h3 className={`text-2xl lg:text-4xl font-bold tracking-tighter ${savingsRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{report.health}</h3>
                                </div>
                                <div className={`p-2.5 lg:p-4 rounded-xl lg:rounded-sm border transition-all ${savingsRate >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} shadow-inner`}>
                                    <Activity size={20} className="lg:size-[24px]" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 lg:gap-6 relative z-10">
                                <div className="bg-black/20 p-3 lg:p-5 rounded-xl lg:rounded-sm border border-white/5 transition-all hover:border-white/10">
                                    <p className="text-[9px] text-muted/40 uppercase font-black tracking-[0.2em] mb-2 lg:mb-3">Savings Rate</p>
                                    <p className="text-lg lg:text-2xl font-bold text-main tracking-tight">{savingsRate.toFixed(1)}%</p>
                                </div>
                                <div className="bg-black/20 p-3 lg:p-5 rounded-xl lg:rounded-sm border border-white/5 transition-all hover:border-white/10">
                                    <p className="text-[9px] text-muted/40 uppercase font-black tracking-[0.2em] mb-2 lg:mb-3">Net Debt</p>
                                    <p className={`text-lg lg:text-2xl font-bold tracking-tight ${netDebt >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{netDebt >= 0 ? '+' : ''}{formatMoney(netDebt, data.settings.currencySymbol)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 lg:gap-4">
                            <div className="glass-card p-4 lg:p-6 rounded-2xl lg:rounded-md border-emerald-500/10 flex flex-col justify-between transition-all hover:border-emerald-500/30">
                                <div className="flex items-center gap-2 lg:gap-3 mb-3 lg:mb-4 text-emerald-400">
                                    <div className="p-2 lg:p-2.5 bg-emerald-500/10 rounded-xl lg:rounded-md border border-emerald-500/20">
                                        <TrendingUp size={14} className="lg:size-[16px]" />
                                    </div>
                                    <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em]">Income</span>
                                </div>
                                <p className="text-lg lg:text-2xl font-bold text-main tracking-tighter">{formatMoney(totalIncome, data.settings.currencySymbol)}</p>
                            </div>
                            <div className="glass-card p-4 lg:p-6 rounded-2xl lg:rounded-md border-rose-500/10 flex flex-col justify-between transition-all hover:border-rose-500/30">
                                <div className="flex items-center gap-2 lg:gap-3 mb-3 lg:mb-4 text-rose-400">
                                    <div className="p-2 lg:p-2.5 bg-rose-500/10 rounded-xl lg:rounded-md border border-rose-500/20">
                                        <TrendingDown size={14} className="lg:size-[16px]" />
                                    </div>
                                    <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em]">Expenses</span>
                                </div>
                                <p className="text-lg lg:text-2xl font-bold text-main tracking-tighter">{formatMoney(totalExpense, data.settings.currencySymbol)}</p>
                            </div>
                        </div>

                        {/* Historical Net Worth Trend */}
                        {data.balanceHistory && data.balanceHistory.length > 0 && (
                            <div className="glass-card rounded-2xl lg:rounded-md p-4 lg:p-8 border border-white/5 shadow-xl transition-all hover:border-white/20">
                                <div className="flex justify-between items-center mb-4 lg:mb-8">
                                    <div>
                                        <h3 className="text-base lg:text-lg font-bold text-main tracking-tight">Balance Trend</h3>
                                        <p className="text-[9px] text-muted/40 font-black uppercase tracking-[0.2em] mt-0.5 lg:mt-1">30-Day Balance History</p>
                                    </div>
                                </div>
                                <div className="h-[200px] w-full">
                                    <ResponsiveContainer minWidth={0} minHeight={200} width="100%" height="100%">
                                        <AreaChart data={data.balanceHistory.map(h => ({ name: new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: h.amount }))}>
                                            <defs>
                                                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#5e5ce6" stopOpacity={0.2}/>
                                                    <stop offset="95%" stopColor="#5e5ce6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                            <XAxis dataKey="name" hide />
                                            <YAxis hide />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#1c1c1e', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
                                                formatter={(val: number) => [formatMoney(val, data.settings.currencySymbol), 'Net Worth']}
                                            />
                                            <Area type="monotone" dataKey="value" stroke="#5e5ce6" strokeWidth={2} fill="url(#colorNetWorth)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        {/* Weekly Trend */}
                        <div className="glass-card rounded-2xl lg:rounded-md p-4 lg:p-8 border border-white/5 shadow-xl flex flex-col transition-all hover:border-white/20">
                            <div className="flex justify-between items-center mb-6 lg:mb-10">
                                <div>
                                    <h3 className="text-base lg:text-lg font-bold text-main tracking-tight">Weekly Spending</h3>
                                    <p className="text-[9px] text-muted/40 font-black uppercase tracking-[0.2em] mt-0.5 lg:mt-1">Last 7 Days Spending</p>
                                </div>
                                <div className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-md lg:rounded-sm">
                                    <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em]">Real-Time</span>
                                </div>
                            </div>
                            <div className="flex-1 min-h-[220px] lg:min-h-[300px]">
                                <ResponsiveContainer minWidth={0} minHeight={220} width="100%" height="100%">
                                    <BarChart data={last7Days}>
                                        <XAxis dataKey="name" tick={{fontSize: 12, fill: '#666', fontWeight: 600}} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            cursor={{fill: 'rgba(255,255,255,0.05)', radius: 12}}
                                            contentStyle={{ backgroundColor: '#1c1c1e', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '12px 16px' }}
                                            itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}
                                            formatter={(val: number) => [formatMoney(val, data.settings.currencySymbol), 'Spent']}
                                        />
                                        <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={40}>
                                            {last7Days.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.value > avgDailySpend * 1.5 ? '#ff453a' : '#5e5ce6'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                      </div>
                </div>
            )}

            {tab === 'spending' && (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
                    <div className="bg-surface/50 rounded-2xl lg:rounded-[40px] p-4 lg:p-8 border border-white/5 flex flex-col items-center shadow-xl">
                        <h3 className="text-base lg:text-xl font-bold text-main mb-4 lg:mb-8 self-start tracking-tight">Top Categories</h3>
                        <div className="h-60 lg:h-80 w-full relative">
                            <ResponsiveContainer minWidth={0} minHeight={240} width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={sortedCategories}
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={8}
                                        dataKey="value"
                                        animationBegin={0}
                                        animationDuration={1000}
                                    >
                                        {sortedCategories.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1c1c1e', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                        formatter={(val: number) => formatMoney(val, data.settings.currencySymbol)}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <span className="text-[9px] lg:text-xs text-muted font-black uppercase tracking-widest opacity-50">Total Spending</span>
                                    <p className="text-xl lg:text-3xl font-bold text-main tracking-tighter mt-1">{formatMoney(totalExpense, data.settings.currencySymbol)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                          <h3 className="text-[10px] font-black text-muted/40 uppercase tracking-[0.2em] px-4">Spending by Category</h3>
                          <div className="grid grid-cols-1 gap-3 lg:gap-4">
                             {sortedCategories.map((cat, idx) => {
                                 const percentage = Math.round((cat.value / totalExpense) * 100);
                                 return (
                                     <div key={idx} className="flex items-center justify-between p-3 lg:p-5 glass-card rounded-2xl lg:rounded-sm border border-white/5 hover:border-white/20 transition-all shadow-lg group">
                                         <div className="flex items-center gap-3 lg:gap-4">
                                             <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full shadow-sm" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                             <div>
                                                 <span className="font-bold text-main text-xs lg:text-sm tracking-tight">{cat.name}</span>
                                                 <p className="text-[8px] lg:text-[9px] text-muted/40 font-black uppercase tracking-widest mt-0.5 lg:mt-1">{percentage}% of total spending</p>
                                             </div>
                                         </div>
                                         <span className="font-bold text-main text-sm lg:text-lg tracking-tighter">{formatMoney(cat.value, data.settings.currencySymbol)}</span>
                                     </div>
                                 );
                             })}
                          </div>
                     </div>
                  </div>
              )}

            {tab === 'report' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                    <div className="lg:col-span-2 space-y-4 lg:space-y-6">
                        <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent p-4 lg:p-10 rounded-2xl lg:rounded-[40px] border border-indigo-500/20 shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 lg:p-8 opacity-20 group-hover:scale-110 transition-transform duration-700">
                                <BrainCircuit size={100} className="text-indigo-400 lg:size-[120px]" />
                            </div>
                            <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-8 relative z-10">
                                <div className="p-3 lg:p-4 bg-indigo-500 rounded-xl lg:rounded-[24px] text-white shadow-lg shadow-indigo-500/30">
                                    <BrainCircuit size={20} className="lg:size-[28px]" />
                                </div>
                                <div>
                                    <h3 className="text-lg lg:text-2xl font-bold text-white tracking-tight">Summary Report</h3>
                                    <p className="text-indigo-200/60 text-[10px] lg:text-xs font-bold uppercase tracking-widest">Automated Insights</p>
                                </div>
                            </div>
                            <div className="space-y-4 lg:space-y-6 text-sm lg:text-lg leading-relaxed text-indigo-100/90 relative z-10 font-medium">
                                <p className="animate-in slide-in-from-bottom-2 duration-500">{report.intro}</p>
                                <p className="animate-in slide-in-from-bottom-2 duration-700">{report.habit.replace(/\*\*(.*?)\*\*/g, (match, p1) => p1)}</p>
                                <p className="animate-in slide-in-from-bottom-2 duration-1000">{report.debtStatus}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                            <div className="bg-surface/50 p-4 lg:p-8 rounded-2xl lg:rounded-[40px] border border-white/5 shadow-xl flex items-center justify-between group hover:border-amber-500/30 transition-all">
                                <div>
                                    <p className="text-[9px] lg:text-[10px] text-muted font-black uppercase tracking-widest mb-1 lg:mb-2">Goals Status</p>
                                    <p className="text-base lg:text-xl text-main font-bold tracking-tight">
                                        {data.wallets.filter(w => w.type === 'GOAL').length} Active Saving Goals
                                    </p>
                                </div>
                                <div className="p-3.5 lg:p-5 bg-amber-500/10 text-amber-500 rounded-xl lg:rounded-[24px] shadow-inner group-hover:scale-110 transition-transform">
                                    <Target size={20} className="lg:size-[28px]" />
                                </div>
                            </div>

                            {savingsRate > 10 && (
                                <div className="bg-surface/50 p-4 lg:p-8 rounded-2xl lg:rounded-[40px] border border-white/5 shadow-xl flex items-center justify-between group hover:border-yellow-500/30 transition-all">
                                    <div>
                                        <p className="text-[9px] lg:text-[10px] text-muted font-black uppercase tracking-widest mb-1 lg:mb-2">Current Rank</p>
                                        <p className="text-base lg:text-xl text-main font-bold tracking-tight">
                                            Super Saver Badge
                                        </p>
                                    </div>
                                    <div className="p-3.5 lg:p-5 bg-yellow-500/10 text-yellow-500 rounded-xl lg:rounded-[24px] shadow-inner group-hover:scale-110 transition-transform">
                                        <Award size={20} className="lg:size-[28px]" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 lg:space-y-6">
                        <h3 className="text-[11px] lg:text-sm font-black text-muted uppercase tracking-widest px-4">Balances & Debts</h3>
                        <div className="bg-surface/50 rounded-2xl lg:rounded-[40px] p-4 lg:p-8 border border-white/5 shadow-xl space-y-6 lg:space-y-8">
                             <div className="space-y-2">
                                 <div className="flex justify-between items-end">
                                     <span className="text-[10px] lg:text-xs font-bold text-muted uppercase tracking-widest">Available Cash</span>
                                     <span className="text-sm lg:text-lg font-bold text-main">{formatMoney(totalIncome - totalExpense, data.settings.currencySymbol)}</span>
                                 </div>
                                 <div className="h-1.5 lg:h-2 bg-black/20 rounded-full overflow-hidden">
                                     <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max(0, savingsRate)}%` }} />
                                 </div>
                             </div>
                             
                             <div className="space-y-2">
                                 <div className="flex justify-between items-end">
                                     <span className="text-[10px] lg:text-xs font-bold text-muted uppercase tracking-widest">Active Debts</span>
                                     <span className="text-sm lg:text-lg font-bold text-rose-400">{formatMoney(totalIOwe, data.settings.currencySymbol)}</span>
                                 </div>
                                 <div className="h-1.5 lg:h-2 bg-black/20 rounded-full overflow-hidden">
                                     <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, (totalIOwe / (totalIncome || 1)) * 100)}%` }} />
                                 </div>
                             </div>

                             <div className="pt-3 lg:pt-4 border-t border-white/5">
                                 <p className="text-[10px] lg:text-xs text-muted font-medium leading-relaxed italic">
                                     "Financial freedom is available to those who learn about it and work for it."
                                 </p>
                             </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="pt-10 border-t border-white/5">
                <div className="flex items-center gap-3 mb-6 px-2">
                    <div className="h-4 w-1 bg-primary rounded-full shadow-lg shadow-primary/50" />
                    <h3 className="text-sm font-black text-main uppercase tracking-[0.3em]">Detailed Analytics</h3>
                </div>
                <AdvancedAnalytics data={data} formatMoney={formatMoney} />
            </div>
            </>
            )}
        </div>
    );
};
