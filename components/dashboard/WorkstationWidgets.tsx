import React from 'react';
import { AppData, TransactionType, Streak } from '../../types';
import { 
    Zap, 
    TrendingUp, 
    AlertCircle, 
    CheckCircle2, 
    Activity
} from 'lucide-react';
import { formatMoney } from '../../utils/formatters';

interface WidgetProps {
    data: AppData;
}

export const FinancialHealthScore: React.FC<WidgetProps> = ({ data }) => {
    // Logic: 
    // 1. Budget Adherence (40%)
    // 2. Savings Rate (30%)
    // 3. Debt-to-Income (20%)
    // 4. Streak Consistency (10%)

    const calculateScore = () => {
        let score = 0;

        // Budget Adherence
        const limits = data.settings.budgetLimits || {};
        const breaches = Object.keys(limits).filter(cat => {
            const limit = typeof limits[cat] === 'number' ? limits[cat] : limits[cat].limit;
            const spend = data.transactions
                .filter(t => t.type === TransactionType.EXPENSE && t.category === cat)
                .reduce((sum, t) => sum + t.amount, 0);
            return spend > limit;
        }).length;
        score += Math.max(0, 40 - (breaches * 10));

        // Savings Rate
        const totalIncome = data.transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = data.transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
        score += Math.min(30, savingsRate > 0 ? (savingsRate / 20) * 30 : 0);

        // Debt/Income
        const totalDebt = data.debts.filter(d => !d.isSettled && d.type === 'I_OWE').reduce((sum, d) => sum + d.amount, 0);
        const debtRatio = totalIncome > 0 ? (totalDebt / totalIncome) : 0;
        score += Math.max(0, 20 - (debtRatio * 40));

        // Streaks
        const totalStreaks: number = (Object.values(data.streaks || {}) as Streak[]).reduce((sum: number, s) => sum + s.current, 0);
        score += Math.min(10, totalStreaks > 0 ? 10 : 0);

        return Math.round(score);
    };

    const score = calculateScore();
    const getStatus = () => {
        if (score >= 80) return { label: 'Optimum', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
        if (score >= 50) return { label: 'Stable', color: 'text-primary', bg: 'bg-primary/10' };
        return { label: 'Critical', color: 'text-rose-500', bg: 'bg-rose-500/10' };
    };

    const status = getStatus();

    return (
        <div className="liquid-glass p-6 rounded-sm border border-white/5 h-full flex flex-col justify-between group overflow-hidden relative">
            <div className="absolute -right-4 -top-4 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                <Activity size={120} />
            </div>
            
            <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Stability Index</span>
                    <h3 className="text-xl font-bold text-white tracking-tight">Financial Health</h3>
                </div>
                <div className={`px-3 py-1 rounded-full ${status.bg} ${status.color} text-[8px] font-black uppercase tracking-widest border border-current/10`}>
                    {status.label}
                </div>
            </div>

            <div className="flex items-baseline gap-2 mb-6">
                <span className="text-6xl font-black text-white tracking-tighter">{score}</span>
                <span className="text-sm font-bold text-white/20 uppercase tracking-widest">/ 100</span>
            </div>

            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">Market Standing</span>
                    <div className="flex items-center gap-1.5">
                        {score >= 50 ? <CheckCircle2 size={12} className="text-emerald-500" /> : <AlertCircle size={12} className="text-rose-500" />}
                        <span className="text-[10px] font-bold text-white/80">{score >= 50 ? 'Strong' : 'At Risk'}</span>
                    </div>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${score}%` }} />
                </div>
            </div>
        </div>
    );
};

export const SpendingHeatmap: React.FC<WidgetProps> = ({ data }) => {
    // Last 21 days
    const days = Array.from({ length: 21 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (20 - i));
        return d.toISOString().split('T')[0];
    });

    const getIntensity = (date: string) => {
        const daySpend = data.transactions
            .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(date))
            .reduce((sum, t) => sum + t.amount, 0);
        
        if (daySpend === 0) return 'bg-white/[0.02] border-white/[0.02]';
        if (daySpend < 20) return 'bg-primary/20 border-primary/20';
        if (daySpend < 100) return 'bg-primary/50 border-primary/40';
        return 'bg-primary border-primary shadow-[0_0_12px_rgb(var(--color-primary)/0.3)]';
    };

    return (
        <div className="liquid-glass p-6 rounded-sm border border-white/5 h-full flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-1">Consumption Graph</span>
                    <h3 className="text-xl font-bold text-white tracking-tight">Active Velocity</h3>
                </div>
                <Zap size={18} className="text-primary animate-pulse" />
            </div>

            <div className="grid grid-cols-7 gap-2">
                {days.map(date => (
                    <div 
                        key={date}
                        className={`aspect-square rounded-sm border transition-all hover:scale-110 cursor-help ${getIntensity(date)}`}
                        title={date}
                    />
                ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Efficiency</span>
                        <span className="text-xs font-bold text-emerald-500">
                            {days.filter(d => data.transactions.filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(d)).length === 0).length} No-Spend Days
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 opacity-20">
                    <div className="w-2 h-2 rounded-sm bg-white/5" />
                    <div className="w-2 h-2 rounded-sm bg-primary/40" />
                    <div className="w-2 h-2 rounded-sm bg-primary" />
                </div>
            </div>
        </div>
    );
};
