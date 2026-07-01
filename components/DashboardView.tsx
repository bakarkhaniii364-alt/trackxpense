import React, { useState, useRef, useMemo } from 'react';
import { RotateCw, Activity } from 'lucide-react';
import { Transaction, TransactionType, AppData, Wallet, Category } from '../types';
import { PredictiveEngine } from '../services/PredictiveEngine';
import { BalanceHero } from './dashboard/BalanceHero';
import { QuickActions } from './dashboard/QuickActions';
import { DailyBudget } from './dashboard/DailyBudget';
import { LocalAdvisor } from './dashboard/LocalAdvisor';
import { DashboardAnalytics } from './dashboard/DashboardAnalytics';
import { BudgetAlerts } from './dashboard/BudgetAlerts';
import { GoalSummary } from './dashboard/GoalSummary';
import { RecentLedger } from './dashboard/RecentLedger';
import { TemplatePresets } from './dashboard/TemplatePresets';
import { StreakDisplay } from './dashboard/StreakDisplay';
import { Haptics } from '../services/haptics';

interface DashboardProps {
    data: AppData;
    setView: (view: any) => void;
    updateData: (data: Partial<AppData>) => void;
    formatMoney: (val: number, sym: string) => string;
    onAddTransactionRequest: (type: TransactionType, quickData?: any) => void;
    onEditTransaction: (t: Transaction) => void;
    onDeleteTemplate: (id: string) => void;
}

export const DashboardView: React.FC<DashboardProps> = ({ 
    data, setView, updateData, formatMoney, onAddTransactionRequest, onEditTransaction, onDeleteTemplate
}) => {
    const [refreshing, setRefreshing] = useState(false);
    const pullStart = useRef<number>(0);
    const pullRef = useRef<HTMLDivElement>(null);
    const thresholdTriggered = useRef<boolean>(false);

    const walletTransactions = useMemo(() => 
        data.transactions.filter((t: Transaction) => {
            const isWalletMatch = t.walletId === data.currentWalletId;
            if (data.settings.privacyMode && t.isPrivate) return false;
            return isWalletMatch;
        })
    , [data.transactions, data.currentWalletId, data.settings.privacyMode]);
    
    const totalIncome = walletTransactions.filter((t: Transaction) => t.type === TransactionType.INCOME).reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const totalExpense = walletTransactions.filter((t: Transaction) => t.type === TransactionType.EXPENSE).reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const adjustedBalance = PredictiveEngine.getAdjustedBalance(data, balance);
    const runwayDays = PredictiveEngine.getRunwayDays(data, balance);
    const futureLiability = PredictiveEngine.getFutureLiabilities(data, 30);

    const chartData = useMemo(() => {
        return [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dateStr = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('en-US', { weekday: 'short' });
            const spent = walletTransactions
                .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(dateStr))
                .reduce((s, t) => s + t.amount, 0);
            return { name: label, spent };
        });
    }, [walletTransactions]);

    const today = new Date().toISOString().split('T')[0];
    const dailySpent = data.transactions
        .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(today))
        .reduce((sum, t) => sum + t.amount, 0);
    const dailyLimit = data.profile.dailyGoal || 0;
    const dailyProgress = dailyLimit > 0 ? Math.min((dailySpent / dailyLimit) * 100, 100) : 0;
    const isOverBudget = dailyLimit > 0 && dailySpent > dailyLimit;

    const quickActions = useMemo(() => {
        const counts: Record<string, number> = {};
        walletTransactions.slice(0, 150).forEach(t => {
            if (t.type === TransactionType.EXPENSE) {
                counts[t.category] = (counts[t.category] || 0) + 1;
            }
        });
        const sortedCategories = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([cat]) => cat);
        const hour = new Date().getHours();
        let timeSuggestion = Category.SNACKS;
        if (hour >= 5 && hour < 11) timeSuggestion = Category.BREAKFAST;
        else if (hour >= 11 && hour < 16) timeSuggestion = Category.LUNCH;
        else if (hour >= 16 && hour < 21) timeSuggestion = Category.DINNER;
        const actions: string[] = [];
        for (const cat of sortedCategories) { if (actions.length < 2 && cat !== timeSuggestion) actions.push(cat); }
        actions.push(timeSuggestion);
        for (const cat of sortedCategories) { if (actions.length < 4 && !actions.includes(cat)) actions.push(cat); }
        const defaults = [Category.TRANSPORT, Category.SHOPPING, Category.BILLS];
        for (const def of defaults) { if (actions.length < 4 && !actions.includes(def)) actions.push(def); }
        return actions.slice(0, 4);
    }, [walletTransactions]);

    const todayStr = new Date().toISOString().split('T')[0];
    const monthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    const spentTodayByCategory = walletTransactions
        .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(todayStr))
        .reduce((acc: any, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});

    const spentMonthByCategory = walletTransactions
        .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(monthStr))
        .reduce((acc: any, t) => { acc[t.category] = (acc[t.category] || 0) + t.amount; return acc; }, {});
    
    const budgetAlerts = Object.entries(data.settings.budgetLimits || {})
        .map(([cat, config]: any) => {
            const normalized = typeof config === 'number' ? { limit: config, period: 'MONTHLY' } : config;
            const spent = normalized.period === 'DAILY' ? (spentTodayByCategory[cat] || 0) : (spentMonthByCategory[cat] || 0);
            return { cat, limit: normalized.limit, period: normalized.period, spent };
        })
        .filter((b: any) => b.limit > 0 && b.spent > b.limit * 0.7) // Alert at 70%
        .sort((a: any, b: any) => (b.spent/b.limit) - (a.spent/a.limit));

    const goalWallets = data.wallets.filter((w: Wallet) => w.type === 'GOAL');
    const currentWallet = data.wallets.find((w: Wallet) => w.id === data.currentWalletId);
    const goalProgress = currentWallet?.type === 'GOAL' ? Math.min((balance / (currentWallet.targetAmount || 1)) * 100, 100) : 0;

    const handleTouchStart = (e: React.TouchEvent) => {
        const scroller = (e.target as HTMLElement).closest('.overflow-y-auto');
        if (scroller && scroller.scrollTop === 0) {
            pullStart.current = e.targetTouches[0].clientY;
            thresholdTriggered.current = false;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!pullStart.current) return;
        const diff = e.targetTouches[0].clientY - pullStart.current;
        if (diff > 0 && diff < 200 && pullRef.current) {
            pullRef.current.style.transition = 'none';
            pullRef.current.style.transform = `translateY(${diff * 0.4}px) rotate(${diff * 2}deg)`;
            const opacity = Math.min(diff / 100, 1);
            pullRef.current.style.opacity = `${opacity}`;
            
            // Premium haptic touch feedback when crossing pull threshold
            if (opacity > 0.6 && !thresholdTriggered.current) {
                Haptics.light();
                thresholdTriggered.current = true;
            } else if (opacity <= 0.6 && thresholdTriggered.current) {
                thresholdTriggered.current = false;
            }
        }
    };

    const handleTouchEnd = () => {
        if (!pullStart.current || !pullRef.current) return;
        const currentOpacity = parseFloat(pullRef.current.style.opacity || '0');
        if (currentOpacity > 0.6) {
            Haptics.success();
            setRefreshing(true);
            pullRef.current.style.transform = 'translateY(40px) rotate(0deg)';
            pullRef.current.style.opacity = '1';
            setTimeout(() => {
                setRefreshing(false);
                if (pullRef.current) { pullRef.current.style.transform = 'translateY(0px)'; pullRef.current.style.opacity = '0'; }
            }, 1500);
        } else {
            pullRef.current.style.transform = 'translateY(0px)';
            pullRef.current.style.opacity = '0';
        }
        pullStart.current = 0;
        thresholdTriggered.current = false;
    };

    return (
      <div className="flex flex-col gap-5 mt-0 relative min-h-full pb-8" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            <div ref={pullRef} className="absolute top-0 left-0 w-full flex justify-center -mt-10 pointer-events-none z-0 opacity-0">
                <div className={`p-2.5 rounded-full bg-surface shadow-xl border border-white/10 ${refreshing ? 'animate-spin' : ''}`}><RotateCw size={18} className="text-primary" /></div>
            </div>

            {/* Level 1: Primary Metrics */}
            <BalanceHero balance={balance} adjustedBalance={adjustedBalance} totalIncome={totalIncome} totalExpense={totalExpense} goalProgress={goalProgress} currentWallet={currentWallet} data={data} updateData={updateData} formatMoney={formatMoney} onAddTransactionRequest={onAddTransactionRequest} refreshing={refreshing} />

            {/* Level 2: Behavioral & Budget Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <StreakDisplay data={data} />
                <DailyBudget dailySpent={dailySpent} dailyLimit={dailyLimit} dailyProgress={dailyProgress} isOverBudget={isOverBudget} data={data} updateData={updateData} formatMoney={formatMoney} />
            </div>

            {/* Level 3: AI Advisor (Full Width) */}
            <LocalAdvisor data={data} formatMoney={formatMoney} />

            {/* Level 4: Future & Rapid Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {futureLiability > 0 && (
                    <div className="liquid-glass p-6 rounded-[32px] border-amber-500/20 bg-amber-500/5 flex flex-col justify-between min-h-[140px]">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[9px] font-black text-amber-500 uppercase tracking-widest">30-Day Outlook</h4>
                            <Activity size={14} className="text-amber-500" />
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-2xl font-black text-main leading-none">{formatMoney(futureLiability, data.settings.currencySymbol)}</p>
                                <p className="text-[8px] text-muted font-bold uppercase tracking-widest mt-2">Scheduled Expenses</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-amber-200">{Math.round((futureLiability / (balance || 1)) * 100)}%</p>
                                <p className="text-[7px] text-muted font-black uppercase tracking-widest">Impact</p>
                            </div>
                        </div>
                    </div>
                )}
                <div className={futureLiability > 0 ? "" : "col-span-full"}>
                    <TemplatePresets data={data} onAddTransactionRequest={onAddTransactionRequest} onDeleteTemplate={onDeleteTemplate} />
                </div>
            </div>

            {/* Level 5: Analytics & Goals */}
            <div className="space-y-5">
                <DashboardAnalytics chartData={chartData} data={data} walletTransactions={walletTransactions} totalExpense={totalExpense} formatMoney={formatMoney} />
                {budgetAlerts.length > 0 && <BudgetAlerts budgetAlerts={budgetAlerts} data={data} formatMoney={formatMoney} />}
                <QuickActions quickActions={quickActions} data={data} onAddTransactionRequest={onAddTransactionRequest} />
                <GoalSummary goalWallets={goalWallets} currentWallet={currentWallet} data={data} updateData={updateData} />
            </div>

            {/* Level 6: Ledger */}
            <RecentLedger walletTransactions={walletTransactions} data={data} setView={setView} onEditTransaction={onEditTransaction} formatMoney={formatMoney} />
      </div>
    );
};
