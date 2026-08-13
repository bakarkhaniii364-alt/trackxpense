import React from 'react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AppData, CategoryItem } from '../../types';

interface HistoryStatsProps {
    pieData: any[];
    data: AppData;
    formatMoney: (val: number, sym: string) => string;
}

const COLORS = ['#5e5ce6', '#32d74b', '#ff453a', '#ff9f0a', '#64d2ff', '#bf5af2', '#ff375f'];

export const HistoryStats: React.FC<HistoryStatsProps> = ({ pieData, data, formatMoney }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
            <div className="bg-surface/50 rounded-[40px] p-8 border border-white/5 shadow-xl flex flex-col items-center">
                <h3 className="text-xl font-bold text-main mb-8 w-full text-center tracking-tight">Spending Distribution</h3>
                <div className="h-72 w-full relative">
                        <ResponsiveContainer minWidth={0} minHeight={280} width="100%" height="100%">
                            <RePieChart>
                                <Pie 
                                    data={pieData} 
                                    innerRadius={70} 
                                    outerRadius={100} 
                                    paddingAngle={8} 
                                    dataKey="value"
                                    animationBegin={0}
                                    animationDuration={1000}
                                >
                                    {pieData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={data.categories.find((c: CategoryItem) => c.name === entry.name)?.color || COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1c1c1e', borderColor: '#2c2c2e', borderRadius: '16px', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)' }}
                                    formatter={(val: number) => formatMoney(val, data.settings.currencySymbol)}
                                />
                            </RePieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <span className="text-xs text-muted font-black uppercase tracking-widest opacity-50">Total</span>
                                <p className="text-3xl font-bold text-main mt-1 tracking-tighter">{formatMoney(pieData.reduce((a:any,b:any)=>a+b.value,0), data.settings.currencySymbol)}</p>
                            </div>
                        </div>
                </div>
            </div>

            <div className="bg-surface/50 rounded-[40px] p-8 border border-white/5 shadow-xl">
                <h3 className="text-lg font-bold text-main mb-6 tracking-tight">Breakdown by Category</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                    {pieData.map((entry: any, index: number) => {
                        const total = pieData.reduce((a:any,b:any)=>a+b.value,0);
                        const percentage = Math.round((entry.value / total) * 100);
                        return (
                            <div key={entry.name} className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: data.categories.find((c: CategoryItem) => c.name === entry.name)?.color || COLORS[index % COLORS.length] }} />
                                        <span className="text-sm font-bold text-main">{entry.name}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-main text-sm">{formatMoney(entry.value as number, data.settings.currencySymbol)}</span>
                                        <span className="text-[10px] text-muted font-bold ml-2 opacity-50">{percentage}%</span>
                                    </div>
                                </div>
                                <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${percentage}%`, backgroundColor: data.categories.find((c: CategoryItem) => c.name === entry.name)?.color || COLORS[index % COLORS.length] }} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};
