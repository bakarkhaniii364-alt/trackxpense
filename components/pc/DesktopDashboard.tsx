import React, { useState, useMemo } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Transaction, TransactionType, AppData, Wallet, Category } from '../../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PredictiveEngine } from '../../services/PredictiveEngine';
import { BalanceHero } from '../dashboard/BalanceHero';
import { DailyBudget } from '../dashboard/DailyBudget';
import { FinancialHealthScore } from '../dashboard/WorkstationWidgets';
import { StreakDisplay } from '../dashboard/StreakDisplay';
import { LocalAdvisor } from '../dashboard/LocalAdvisor';
import { GoalSummary } from '../dashboard/GoalSummary';
import { QuickActions } from '../dashboard/QuickActions';
import { TemplatePresets } from '../dashboard/TemplatePresets';
import { RecentLedger } from '../dashboard/RecentLedger';
import { BudgetAlerts } from '../dashboard/BudgetAlerts';
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

type Timeframe = '7d' | '30d' | 'month';

export const DesktopDashboard: React.FC<DesktopDashboardProps> = ({ 
    data, setView, updateData, formatMoney, onAddTransactionRequest, onEditTransaction, onDeleteTemplate
}) => {
    const [timeframe, setTimeframe] = useState<Timeframe>('7d');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSimOpen, setIsSimOpen] = useState(false);

    const currency = data.settings.currencySymbol;

    // Filter transactions for current wallet
    const walletTransactions = useMemo(() => 
        data.transactions.filter((t: Transaction) => {
            const isWalletMatch = t.walletId === data.currentWalletId;
            if (data.settings.privacyMode && t.isPrivate) return false;
            return isWalletMatch;
        })
    , [data.transactions, data.currentWalletId, data.settings.privacyMode]);

    const totalIncome = walletTransactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
    const totalExpense = walletTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;

    const adjustedBalance = PredictiveEngine.getAdjustedBalance(data, balance);
    const runwayDays = PredictiveEngine.getRunwayDays(data, balance);
    const futureLiability = PredictiveEngine.getFutureLiabilities(data, 30);

    const currentWallet = data.wallets.find((w: Wallet) => w.id === data.currentWalletId);
    const goalWallets = data.wallets.filter((w: Wallet) => w.type === 'GOAL');
    const goalProgress = currentWallet?.type === 'GOAL' ? Math.min((balance / (currentWallet.targetAmount || 1)) * 100, 100) : 0;

    // Daily budget calculations
    const today = new Date().toISOString().split('T')[0];
    const dailySpent = data.transactions
        .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(today))
        .reduce((sum, t) => sum + t.amount, 0);
    const dailyLimit = data.profile.dailyGoal || 0;
    const dailyProgress = dailyLimit > 0 ? Math.min((dailySpent / dailyLimit) * 100, 100) : 0;
    const isOverBudget = dailyLimit > 0 && dailySpent > dailyLimit;

    // Timeframe chart calculation
    const { chartData, timeframeExpense, deltaPercent, isDeltaLower } = useMemo(() => {
        const daysCount = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 30;
        
        const now = new Date();
        const currentPeriodSpend: number[] = [];
        const prevPeriodSpend: number[] = [];

        const points = [...Array(daysCount)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (daysCount - 1 - i));
            const dateStr = d.toISOString().split('T')[0];
            const label = timeframe === '7d' 
                ? d.toLocaleDateString('en-US', { weekday: 'short' }) 
                : d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
            
            const spent = walletTransactions
                .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(dateStr))
                .reduce((s, t) => s + t.amount, 0);
            
            currentPeriodSpend.push(spent);
            return { name: label, spent };
        });

        // Previous period for comparison delta
        for (let i = 0; i < daysCount; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (daysCount * 2 - 1 - i));
            const dateStr = d.toISOString().split('T')[0];
            const spent = walletTransactions
                .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(dateStr))
                .reduce((s, t) => s + t.amount, 0);
            prevPeriodSpend.push(spent);
        }

        const currentTotal = currentPeriodSpend.reduce((a, b) => a + b, 0);
        const prevTotal = prevPeriodSpend.reduce((a, b) => a + b, 0);

        let delta = 0;
        if (prevTotal > 0) {
            delta = Math.round(((currentTotal - prevTotal) / prevTotal) * 100);
        }

        return {
            chartData: points,
            timeframeExpense: currentTotal,
            deltaPercent: Math.abs(delta),
            isDeltaLower: delta <= 0
        };
    }, [walletTransactions, timeframe]);

    // Quick Action suggestions
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
        const defaults = [Category.TRANSPORT, Category.SHOPPING, Category.BILLS, Category.FOODPANDA];
        for (const def of defaults) { if (actions.length < 4 && !actions.includes(def)) actions.push(def); }
        return actions.slice(0, 4);
    }, [walletTransactions]);

    // Category distribution calculation
    const categoryTotals = useMemo(() => {
        return data.categories.map(cat => {
            const amount = walletTransactions
                .filter(t => t.category === cat.name && t.type === TransactionType.EXPENSE)
                .reduce((s, t) => s + t.amount, 0);
            const percent = totalExpense > 0 ? (amount / totalExpense) * 100 : 0;
            return { ...cat, amount, percent };
        }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
    }, [data.categories, walletTransactions, totalExpense]);

    // Budget alerts
    const todayStr = new Date().toISOString().split('T')[0];
    const monthStr = new Date().toISOString().slice(0, 7);
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
        .filter((b: any) => b.limit > 0 && b.spent > b.limit * 0.7)
        .sort((a: any, b: any) => (b.spent/b.limit) - (a.spent/a.limit));

    const handleRefresh = () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 600);
    };

    const maxChartValue = Math.max(...chartData.map(d => d.spent || 0), 10);

    return (
        <div className="space-y-4 lg:space-y-5 pb-8 animate-in fade-in duration-500 w-full max-w-6xl mx-auto">
            
            {/* BENTO TIER 1: Balance Hero + Spending Sparkline (2 Cards) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                {/* Balance Hero (Left) */}
                <div className="w-full flex">
                    <BalanceHero 
                        balance={balance} 
                        adjustedBalance={adjustedBalance} 
                        totalIncome={totalIncome} 
                        totalExpense={totalExpense} 
                        goalProgress={goalProgress} 
                        currentWallet={currentWallet} 
                        data={data} 
                        updateData={updateData} 
                        formatMoney={formatMoney} 
                        onAddTransactionRequest={onAddTransactionRequest} 
                        refreshing={isRefreshing} 
                    />
                </div>

                {/* Total Spending Volume & Trend (Right) */}
                <div className="w-full rounded-[18px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 lg:p-6 flex flex-col justify-between transition-colors h-full">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                                Total Spending
                            </span>
                            {/* Timeframe Selector directly in card */}
                            <div className="tabs">
                                <button
                                    onClick={() => setTimeframe('7d')}
                                    className={`tab text-[11px] py-0.5 px-2.5 ${timeframe === '7d' ? 'is-active' : ''}`}
                                >
                                    7D
                                </button>
                                <button
                                    onClick={() => setTimeframe('30d')}
                                    className={`tab text-[11px] py-0.5 px-2.5 ${timeframe === '30d' ? 'is-active' : ''}`}
                                >
                                    30D
                                </button>
                                <button
                                    onClick={() => setTimeframe('month')}
                                    className={`tab text-[11px] py-0.5 px-2.5 ${timeframe === 'month' ? 'is-active' : ''}`}
                                >
                                    Month
                                </button>
                            </div>
                        </div>

                        <div className="flex items-baseline justify-between mb-2">
                            <div className="flex items-baseline gap-3">
                                <span className="text-2xl lg:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
                                    {formatMoney(timeframeExpense, currency)}
                                </span>
                                {deltaPercent > 0 && (
                                    <span className={`inline-flex items-center text-[12px] font-medium font-mono ${
                                        isDeltaLower ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'
                                    }`}>
                                        {isDeltaLower ? (
                                            <ArrowDownRight size={14} strokeWidth={1.5} className="mr-0.5" />
                                        ) : (
                                            <ArrowUpRight size={14} strokeWidth={1.5} className="mr-0.5" />
                                        )}
                                        {deltaPercent}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Clean Recharts Area/Sparkline */}
                    <div className="h-[145px] w-full mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -24, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="cfTopSpendGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
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
                                    stroke="#3b82f6"
                                    strokeWidth={1.5}
                                    fill="url(#cfTopSpendGrad)"
                                    activeDot={{ r: 4, fill: '#3b82f6', stroke: 'var(--bg-surface)', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* BENTO TIER 2: 4-Metric Grid (Cloudflare 4-card structure) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
                {/* 1. Daily Budget Cap */}
                <DailyBudget 
                    dailySpent={dailySpent} 
                    dailyLimit={dailyLimit} 
                    dailyProgress={dailyProgress} 
                    isOverBudget={isOverBudget} 
                    data={data} 
                    updateData={updateData} 
                    formatMoney={formatMoney} 
                />

                {/* 2. Financial Stability Score */}
                <FinancialHealthScore data={data} />

                {/* 3. 30-Day Outlook & Liabilities */}
                <div className="rounded-[18px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 lg:p-6 flex flex-col justify-between transition-colors h-full">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                                30-Day Outlook
                            </span>
                            <span className="text-[11px] font-medium text-[var(--text-secondary)] font-mono">
                                {runwayDays}d runway
                            </span>
                        </div>

                        <div className="mb-3">
                            <div className="text-2xl lg:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">
                                {formatMoney(futureLiability, currency)}
                            </div>
                            <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                                Scheduled future liabilities
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden mb-2.5">
                            <div 
                                className="h-full bg-[var(--status-warning-fg)] rounded-full transition-all duration-700" 
                                style={{ width: `${Math.min(100, balance > 0 ? (futureLiability / balance) * 100 : 0)}%` }} 
                            />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                            <span>Balance impact</span>
                            <span className="font-mono text-[var(--text-primary)] font-medium">
                                {balance > 0 ? Math.round((futureLiability / balance) * 100) : 0}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Active Streaks & Discipline */}
                <StreakDisplay data={data} />
            </div>

            {/* BENTO TIER 3: Category Breakdown & Local Intelligence (2 Columns) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                {/* Category Allocation */}
                <div className="w-full rounded-[18px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 lg:p-6 flex flex-col justify-between transition-colors">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                                Category Allocation
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
                                {categoryTotals.length > 0 ? `Leading spending category (${Math.round(categoryTotals[0].percent)}% of total)` : 'No category spend recorded'}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 mt-1 overflow-y-auto max-h-[160px] no-scrollbar">
                        {categoryTotals.length > 0 ? (
                            categoryTotals.slice(0, 4).map(cat => (
                                <div key={cat.id || cat.name} className="space-y-1.5">
                                    <div className="flex justify-between items-center text-[12px]">
                                        <span className="font-medium text-[var(--text-primary)] truncate max-w-[150px]">{cat.name}</span>
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

                {/* Local Advisor / Smart Insights */}
                <div className="w-full">
                    <LocalAdvisor data={data} formatMoney={formatMoney} />
                </div>
            </div>

            {/* BENTO TIER 4: Savings Goals & Quick Entry / Templates */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                {/* Savings Goals */}
                <div className={goalWallets.length > 0 && currentWallet?.type !== 'GOAL' ? 'w-full' : 'col-span-full'}>
                    <GoalSummary goalWallets={goalWallets} currentWallet={currentWallet} data={data} updateData={updateData} />
                    {goalWallets.length === 0 && (
                        <QuickActions quickActions={quickActions} data={data} onAddTransactionRequest={onAddTransactionRequest} />
                    )}
                </div>

                {/* Quick Actions & Templates */}
                {goalWallets.length > 0 && currentWallet?.type !== 'GOAL' && (
                    <div className="w-full flex flex-col gap-4 lg:gap-5">
                        <QuickActions quickActions={quickActions} data={data} onAddTransactionRequest={onAddTransactionRequest} />
                        <TemplatePresets data={data} onAddTransactionRequest={onAddTransactionRequest} onDeleteTemplate={onDeleteTemplate} />
                    </div>
                )}
            </div>

            {/* Budget Alerts if any */}
            {budgetAlerts.length > 0 && (
                <BudgetAlerts budgetAlerts={budgetAlerts} data={data} formatMoney={formatMoney} />
            )}

            {/* BENTO TIER 5: Recent Transactions Ledger */}
            <RecentLedger 
                walletTransactions={walletTransactions} 
                data={data} 
                updateData={updateData}
                setView={setView} 
                onEditTransaction={onEditTransaction} 
                formatMoney={formatMoney} 
            />

            {/* Simulator Module */}
            <SimulationModule isOpen={isSimOpen} onClose={() => setIsSimOpen(false)} data={data} />
        </div>
    );
};
