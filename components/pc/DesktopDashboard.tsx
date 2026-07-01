
import React, { useMemo } from 'react';
import { TrendingUp, ChevronRight, ArrowUpRight, ArrowDownRight, Plus, CreditCard } from 'lucide-react';
import { Transaction, TransactionType, AppData, Wallet, Category } from '../../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PredictiveEngine } from '../../services/PredictiveEngine';
import { CategoryIcon } from '../shared/CategoryIcon';
import { IntelligenceRunway } from '../dashboard/IntelligenceRunway';
import { BalanceHero } from '../dashboard/BalanceHero';
import { DailyBudget } from '../dashboard/DailyBudget';
import { TemplatePresets } from '../dashboard/TemplatePresets';
import { FinancialHealthScore, SpendingHeatmap } from '../dashboard/WorkstationWidgets';
import { SimulationModule } from '../dashboard/SimulationModule';

interface DesktopDashboardProps {
    data: AppData;
    setView: (view: any) => void;
    updateData: (data: Partial<AppData>) => void;
    formatMoney: (val: number, sym: string) => string;
    onAddTransactionRequest: (type: TransactionType, quickData?: any) => void;
    onEditTransaction: (t: Transaction) => void;
    onDeleteTemplate: (id: string) => void;
}

export const DesktopDashboard: React.FC<DesktopDashboardProps> = ({ 
    data, setView, updateData, formatMoney, onAddTransactionRequest, onEditTransaction, onDeleteTemplate
}) => {
    const [isSimOpen, setIsSimOpen] = React.useState(false);
    // --- Data Processing ---
    const walletTransactions = useMemo(() => 
        data.transactions.filter((t: Transaction) => {
            const isWalletMatch = t.walletId === data.currentWalletId;
            if (data.settings.privacyMode && t.isPrivate) return false;
            return isWalletMatch;
        })
    , [data.transactions, data.currentWalletId, data.settings.privacyMode]);

    const stats = useMemo(() => {
        const income = walletTransactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
        const expense = walletTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
        const balance = income - expense;
        const adjustedBalance = PredictiveEngine.getAdjustedBalance(data, balance);
        const runwayDays = PredictiveEngine.getRunwayDays(data, balance);
        const futureLiability = PredictiveEngine.getFutureLiabilities(data, 30);
        return { income, expense, balance, adjustedBalance, runwayDays, futureLiability };
    }, [walletTransactions, data]);

    const currentWallet = data.wallets.find(w => w.id === data.currentWalletId);

    const today = new Date().toISOString().split('T')[0];
    const dailySpent = data.transactions
        .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(today))
        .reduce((sum, t) => sum + t.amount, 0);
    const dailyLimit = data.profile.dailyGoal || 0;
    const dailyProgress = dailyLimit > 0 ? Math.min((dailySpent / dailyLimit) * 100, 100) : 0;
    const isOverBudget = dailyLimit > 0 && dailySpent > dailyLimit;

    // Smart Quick Actions
    const getSmartQuickActions = () => {
        const counts: Record<string, number> = {};
        walletTransactions.slice(0, 150).forEach(t => {
            if (t.type === TransactionType.EXPENSE) {
                counts[t.category] = (counts[t.category] || 0) + 1;
            }
        });

        const sortedCategories = Object.entries(counts)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .map(([cat]) => cat);

        const hour = new Date().getHours();
        let timeSuggestion = Category.SNACKS;

        if (hour >= 5 && hour < 11) timeSuggestion = Category.BREAKFAST;
        else if (hour >= 11 && hour < 16) timeSuggestion = Category.LUNCH;
        else if (hour >= 16 && hour < 21) timeSuggestion = Category.DINNER;
        
        const actions: string[] = [];
        if (timeSuggestion) actions.push(timeSuggestion);
        
        for (const cat of sortedCategories) {
            if (actions.length < 8 && !actions.includes(cat)) actions.push(cat);
        }

        const defaults = [Category.TRANSPORT, Category.SHOPPING, Category.BILLS, Category.FOODPANDA];
        for (const def of defaults) {
            if (actions.length < 8 && !actions.includes(def)) actions.push(def);
        }
        
        return actions.slice(0, 8);
    };
    
    const quickActions = useMemo(() => getSmartQuickActions(), [walletTransactions]);

    return (
        <div className="grid grid-cols-12 gap-4 p-4 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-5xl mx-auto overflow-x-hidden">
            
            {/* --- TIER 1: COMMAND HUB & DAILY BUDGET --- */}
            <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
                 <BalanceHero 
                    balance={stats.balance} 
                    adjustedBalance={stats.adjustedBalance} 
                    totalIncome={stats.income} 
                    totalExpense={stats.expense} 
                    goalProgress={currentWallet?.type === 'GOAL' ? (stats.balance / (currentWallet.targetAmount || 1)) * 100 : 0} 
                    currentWallet={currentWallet} 
                    data={data} 
                    updateData={updateData} 
                    formatMoney={formatMoney} 
                    onAddTransactionRequest={onAddTransactionRequest} 
                    refreshing={false} 
                 />
            </div>

            <div className="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
                 <DailyBudget dailySpent={dailySpent} dailyLimit={dailyLimit} dailyProgress={dailyProgress} isOverBudget={isOverBudget} data={data} updateData={updateData} formatMoney={formatMoney} />
                 
                 {/* Forecast Card */}
                 <div className={`liquid-glass bento-card p-6 flex flex-col justify-between h-full transition-all group hover:border-amber-500/30 ${stats.futureLiability > 0 ? 'border-amber-500/20 bg-amber-500/5' : 'opacity-40 grayscale'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">Monthly Forecast</h4>
                        </div>
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">30 Day Window</span>
                    </div>
                    <div className="flex items-end justify-between mt-4">
                        <div>
                            <p className="text-3xl font-black text-white tracking-tighter leading-none">
                                {formatMoney(stats.futureLiability, data.settings.currencySymbol)}
                            </p>
                            <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mt-2">Upcoming Expenses</p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-black text-amber-200/80 tracking-tighter">
                                {stats.balance > 0 ? Math.round((stats.futureLiability / stats.balance) * 100) : 0}%
                            </div>
                            <p className="text-[7px] text-white/20 font-black uppercase tracking-widest">Impact on Balance</p>
                        </div>
                    </div>
                 </div>
            </div>

            {/* --- TIER 2: INTELLIGENCE RUNWAY (FULL WIDTH BENTO) --- */}
            <div className="col-span-12">
                <IntelligenceRunway data={data} formatMoney={formatMoney} />
            </div>

            {/* --- TIER 2.5: ADVANCED METRICS --- */}
            <div className="col-span-12 lg:col-span-4">
                <FinancialHealthScore data={data} />
            </div>
            <div className="col-span-12 lg:col-span-5">
                <SpendingHeatmap data={data} />
            </div>
            <div className="col-span-12 lg:col-span-3">
                <div className="liquid-glass p-6 rounded-sm border border-white/5 h-full flex flex-col justify-between group bg-primary/5 hover:border-primary/40 transition-all">
                    <div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Simulator</span>
                        <h3 className="text-xl font-bold text-white tracking-tight">What-If Simulator</h3>
                        <p className="text-[10px] text-white/40 font-medium mt-2 leading-relaxed">Model large transactions without impacting your live transactions list.</p>
                    </div>
                    <button 
                        onClick={() => setIsSimOpen(true)}
                        className="w-full py-4 bg-primary text-white rounded-md font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mt-6"
                    >
                        Open Simulator
                    </button>
                </div>
            </div>

            {/* --- TIER 3: QUICK ACTIONS & FEED --- */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
                {/* Quick Actions */}
                <div className="glass-card bento-card p-6 flex flex-col h-full group transition-all hover:border-primary/30">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Quick Actions</h3>
                        </div>
                        <Plus size={14} className="text-white/20 group-hover:text-primary transition-colors" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        {quickActions.map((cat) => (
                            <button 
                                key={cat}
                                onClick={() => onAddTransactionRequest(TransactionType.EXPENSE, { category: cat })}
                                className="flex items-center gap-3 bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 p-3 rounded-md transition-all active:scale-[0.95] group/btn"
                            >
                                <div className="text-white/30 group-hover/btn:text-primary transition-colors scale-90">
                                    <CategoryIcon category={cat} color={data.categories.find(c => c.name === cat)?.color} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-tight text-white/60 group-hover/btn:text-white truncate">{cat}</span>
                            </button>
                        ))}
                    </div>

                    <div className="mt-auto">
                        <TemplatePresets data={data} onAddTransactionRequest={onAddTransactionRequest} onDeleteTemplate={onDeleteTemplate} />
                    </div>
                </div>
            </div>

            <div className="col-span-12 lg:col-span-8">
                 <div className="glass-card bento-card p-6 h-full">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-4 w-1 bg-primary rounded-full shadow-[0_0_10px_rgb(var(--color-primary)/0.5)]" />
                            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Recent Transactions</h3>
                        </div>
                        <button onClick={() => setView('history')} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-sm text-[9px] font-black text-primary uppercase tracking-[0.2em] transition-all border border-white/5 hover:border-primary/20 active:scale-95">
                            View Full History
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto pr-2 custom-scrollbar max-h-[500px]">
                        {walletTransactions.slice(0, 24).map((t: Transaction) => (
                            <div key={t.id} onClick={() => onEditTransaction(t)} className="flex items-center justify-between p-4 bg-black/30 border border-white/5 rounded-md hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer group active:scale-[0.98]">
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="h-10 w-10 rounded-sm bg-surface flex items-center justify-center border border-white/5 text-white/40 transition-all group-hover:scale-110 group-hover:text-primary group-hover:border-primary/20 shadow-lg">
                                        <CategoryIcon category={t.category} color={data.categories.find(c => c.name === t.category)?.color} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-black text-white/80 text-[11px] leading-tight truncate tracking-tight">{t.note || t.category}</p>
                                        <p className="text-[8px] text-white/30 font-black mt-1 uppercase tracking-widest flex items-center gap-2">
                                            {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            <span className="w-1 h-1 rounded-full bg-white/10" />
                                            {t.category}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-black text-[12px] tracking-tighter ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-white/90'}`}>
                                        {t.type === TransactionType.INCOME ? '+' : ''}{formatMoney(t.amount, data.settings.currencySymbol)}
                                    </p>
                                    <div className="h-0.5 w-0 bg-primary ml-auto mt-1 transition-all group-hover:w-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>
            <SimulationModule isOpen={isSimOpen} onClose={() => setIsSimOpen(false)} data={data} />
        </div>
    );
};
