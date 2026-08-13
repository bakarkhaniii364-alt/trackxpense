import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { AppData, Transaction, TransactionType } from '../../types';
import { FieldHelp } from '../pc/FieldHelp';

interface DashboardAnalyticsProps {
    chartData: any[];
    data: AppData;
    walletTransactions: Transaction[];
    totalExpense: number;
    formatMoney: (val: number, sym: string) => string;
}

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
    chartData,
    data,
    walletTransactions,
    totalExpense,
    formatMoney
}) => {
    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                     <h3 className="text-[9px] font-black text-muted/40 uppercase tracking-[0.2em]">Weekly Spending</h3>
                     <FieldHelp text="Spending trend over the last 7 days." />
                </div>
                <div className="glass-card bento-card h-[180px]">
                    <ResponsiveContainer minWidth={0} minHeight={180} width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorSpentMob" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#5e5ce6" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#5e5ce6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                            <XAxis dataKey="name" hide />
                            <YAxis hide />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1c1c1e', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '10px' }}
                                formatter={(val: number) => [formatMoney(val, data.settings.currencySymbol), '']}
                            />
                            <Area type="monotone" dataKey="spent" stroke="#5e5ce6" strokeWidth={2} fill="url(#colorSpentMob)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                     <h3 className="text-[9px] font-black text-muted/40 uppercase tracking-[0.2em]">Top Categories</h3>
                     <FieldHelp text="Breakdown of your spending by categories." />
                </div>
                <div className="glass-card bento-card grid grid-cols-2 gap-4">
                     {data.categories.slice(0, 4).map(cat => {
                         const amount = walletTransactions.filter(t => t.category === cat.name && t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
                         const percent = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
                         return (
                             <div key={cat.id} className="space-y-1.5">
                                 <div className="flex justify-between items-center">
                                     <span className="text-[9px] font-bold text-main truncate">{cat.name}</span>
                                     <span className="text-[9px] font-mono text-muted">{Math.round(percent)}%</span>
                                 </div>
                                 <div className="h-1 bg-black/20 rounded-full overflow-hidden">
                                     <div className="h-full transition-all duration-1000" style={{ width: `${percent}%`, backgroundColor: cat.color }} />
                                 </div>
                             </div>
                         );
                     })}
                </div>
            </div>
        </div>
    );
};
