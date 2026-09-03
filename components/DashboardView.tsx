import React, { useState, useRef, useMemo } from 'react';
import {
  ArrowClockwise as RotateCw,
  Plus,
  Microphone,
  ArrowUp,
  Paperclip,
  X,
  Sparkle,
  Check
} from '@phosphor-icons/react';
import { Transaction, TransactionType, AppData, Wallet, Category } from '../types';
import { PredictiveEngine } from '../services/PredictiveEngine';
import { BalanceHero } from './dashboard/BalanceHero';
import { DailyBudget } from './dashboard/DailyBudget';
import { FinancialHealthScore } from './dashboard/WorkstationWidgets';
import { StreakDisplay } from './dashboard/StreakDisplay';
import { LocalAdvisor } from './dashboard/LocalAdvisor';
import { BudgetAlerts } from './dashboard/BudgetAlerts';
import { GoalSummary } from './dashboard/GoalSummary';
import { QuickActions } from './dashboard/QuickActions';
import { RecentLedger } from './dashboard/RecentLedger';
import { sendRabbAiTextMessage, sendRabbAiImageMessage, RabbAiMessage } from '../services/rabbAiService';
import { Haptics } from '../services/haptics';

interface DashboardProps {
    data: AppData;
    setView: (view: any) => void;
    updateData: (data: Partial<AppData>) => void;
    formatMoney: (val: number, sym: string) => string;
    onAddTransactionRequest: (type: TransactionType, quickData?: any) => void;
    onEditTransaction: (t: Transaction) => void;
    onDeleteTemplate: (id: string) => void;
    onAddTransaction?: (t: any) => void;
}

export const DashboardView: React.FC<DashboardProps> = ({ 
    data, 
    setView, 
    updateData, 
    formatMoney, 
    onAddTransactionRequest, 
    onEditTransaction, 
    onDeleteTemplate,
    onAddTransaction
}) => {
    const [refreshing, setRefreshing] = useState(false);
    const pullStart = useRef<number>(0);
    const pullRef = useRef<HTMLDivElement>(null);
    const thresholdTriggered = useRef<boolean>(false);

    // RabbAi Hero Command State
    const [commandText, setCommandText] = useState('');
    const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [aiFeedback, setAiFeedback] = useState<{
        text: string;
        extractedTx?: any;
        isLogged?: boolean;
        loggedId?: string;
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<any>(null);

    const currency = data.settings.currencySymbol;
    const userName = data.profile?.name ? data.profile.name.split(' ')[0] : 'Alif';

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
            }, 1200);
        } else {
            pullRef.current.style.transform = 'translateY(0px)';
            pullRef.current.style.opacity = '0';
        }
        pullStart.current = 0;
        thresholdTriggered.current = false;
    };

    // Handle Mobile Command Send
    const handleSendCommand = async () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        }

        const text = commandText.trim();
        const receipt = selectedReceipt;
        if (!text && !receipt) return;

        Haptics.light();
        setCommandText('');
        setSelectedReceipt(null);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        setIsAiLoading(true);

        try {
            let aiMsg: RabbAiMessage;
            if (receipt) {
                aiMsg = await sendRabbAiImageMessage(receipt, text, data);
            } else {
                aiMsg = await sendRabbAiTextMessage(text, [], data);
            }

            let newTxId: string | undefined;
            if (aiMsg.extractedTransaction && aiMsg.extractedTransaction.isLogged) {
                const ext = aiMsg.extractedTransaction;
                newTxId = `tx_${Date.now()}`;
                const newTx: Transaction = {
                    id: newTxId,
                    amount: ext.amount,
                    type: ext.type,
                    category: ext.category,
                    date: new Date().toISOString().split('T')[0],
                    note: ext.description,
                    walletId: data.currentWalletId || data.wallets?.[0]?.id || 'default'
                };
                if (onAddTransaction) {
                    onAddTransaction(newTx);
                } else {
                    updateData({ transactions: [newTx, ...data.transactions] });
                }
            }

            setAiFeedback({
                text: aiMsg.text,
                extractedTx: aiMsg.extractedTransaction,
                isLogged: aiMsg.extractedTransaction?.isLogged,
                loggedId: newTxId
            });
        } catch {
            setAiFeedback({
                text: 'Could not process command. Please try again.'
            });
        } finally {
            setIsAiLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4 lg:gap-5 mt-0 relative min-h-full pb-8" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
            <div ref={pullRef} className="absolute top-0 left-0 w-full flex justify-center -mt-10 pointer-events-none z-0 opacity-0">
                <div className={`p-2.5 rounded-full bg-[var(--bg-surface)] shadow-xl border border-[var(--border-default)] ${refreshing ? 'animate-spin' : ''}`}>
                    <RotateCw size={16} className="text-[var(--text-primary)]" />
                </div>
            </div>

            {/* Hidden File Input for Receipt Attachment */}
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    Haptics.light();
                    const reader = new FileReader();
                    reader.onload = () => setSelectedReceipt(reader.result as string);
                    reader.readAsDataURL(file);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="hidden"
            />

            {/* Cloudflare Hero Command Bar (Mobile) */}
            <div className="w-full space-y-2 pt-1">
                <h1 className="text-[20px] font-medium text-[var(--text-primary)] tracking-tight text-center">
                    Spent anything today, {userName}?
                </h1>

                {selectedReceipt && (
                    <div className="relative inline-block">
                        <img src={selectedReceipt} alt="Receipt preview" className="w-12 h-12 object-cover rounded-[6px] border border-[var(--border-default)] shadow-xs" />
                        <button
                            onClick={() => setSelectedReceipt(null)}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black/80 rounded-full text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                        >
                            <X size={10} />
                        </button>
                    </div>
                )}

                <div className="shining-beam-wrapper">
                    <div className="shining-beam-inner p-2.5 transition-colors">
                        <textarea
                            ref={textareaRef}
                            rows={1}
                            value={commandText}
                            onChange={(e) => setCommandText(e.target.value)}
                            placeholder="Ask RabbAi, log an expense, or search..."
                            className="input-reset w-full bg-transparent border-0 outline-none text-[13px] font-normal text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none leading-relaxed"
                            style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                        />
                    <div className="flex items-center justify-between pt-1.5">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-[26px] px-2 rounded-[6px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 text-[11.5px]"
                        >
                            <Paperclip size={13} strokeWidth={1.5} />
                            <span>Attach</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleSendCommand}
                            disabled={(!commandText.trim() && !selectedReceipt) || isAiLoading}
                            className="btn btn--primary h-[26px] px-2.5 text-[11.5px] rounded-[6px] flex items-center gap-1 disabled:opacity-40"
                        >
                            <span>Log</span>
                            <ArrowUp size={12} weight="bold" />
                        </button>
                    </div>
                  </div>
                </div>

                {isAiLoading && (
                    <div className="p-2.5 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center gap-2 text-[11.5px] text-[var(--text-secondary)]">
                        <Sparkle size={13} className="text-[var(--accent)] animate-spin" />
                        <span>RabbAi is analyzing...</span>
                    </div>
                )}

                {aiFeedback && !isAiLoading && (
                    <div className="p-2.5 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[12px] space-y-1.5">
                        <div className="flex justify-between items-start">
                            <span>{aiFeedback.text}</span>
                            <button onClick={() => setAiFeedback(null)} className="p-0.5"><X size={11} /></button>
                        </div>
                        {aiFeedback.extractedTx && (
                            <div className="flex justify-between items-center text-[11px] pt-1 border-t border-[var(--border-default)]">
                                <span className="font-mono font-medium">{formatMoney(aiFeedback.extractedTx.amount, currency)} • {aiFeedback.extractedTx.category}</span>
                                {aiFeedback.isLogged && <span className="text-emerald-400 font-medium">✓ Logged</span>}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Level 1: Primary Balance Hero */}
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
                refreshing={refreshing} 
            />

            {/* Level 2: Budget Alerts (if any breached) */}
            {budgetAlerts.length > 0 && (
                <BudgetAlerts budgetAlerts={budgetAlerts} data={data} formatMoney={formatMoney} />
            )}

            {/* Level 3: 2-Column Compact Bento Grid (4 Core KPIs) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
                {/* 1. Daily Budget */}
                <DailyBudget 
                    dailySpent={dailySpent} 
                    dailyLimit={dailyLimit} 
                    dailyProgress={dailyProgress} 
                    isOverBudget={isOverBudget} 
                    data={data} 
                    updateData={updateData} 
                    formatMoney={formatMoney} 
                />

                {/* 2. Stability Score */}
                <FinancialHealthScore data={data} />

                {/* 3. 30-Day Outlook */}
                <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-3.5 sm:p-5 flex flex-col justify-between transition-colors h-full">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)] truncate">
                                Outlook
                            </span>
                            <span className="text-[10px] font-medium text-[var(--text-muted)] font-mono">
                                {runwayDays}d runway
                            </span>
                        </div>

                        <div className="mb-2">
                            <div className="text-base sm:text-xl font-semibold text-[var(--text-primary)] tracking-tight font-mono">
                                {formatMoney(futureLiability, currency)}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                                30d scheduled bills
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden mb-2">
                            <div 
                                className="h-full bg-[var(--status-warning-fg)] rounded-full transition-all duration-700" 
                                style={{ width: `${Math.min(100, balance > 0 ? (futureLiability / balance) * 100 : 0)}%` }} 
                            />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                            <span>Impact</span>
                            <span className="font-mono text-[var(--text-primary)] font-medium">
                                {balance > 0 ? Math.round((futureLiability / balance) * 100) : 0}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Consistency Streaks */}
                <StreakDisplay data={data} />
            </div>

            {/* Level 4: 1-Tap Quick Action Entry Grid */}
            <QuickActions quickActions={quickActions} data={data} onAddTransactionRequest={onAddTransactionRequest} />

            {/* Level 5: Goal Summary (if user is on or has a goal wallet) */}
            {currentWallet?.type === 'GOAL' && (
                <GoalSummary goalWallets={goalWallets} currentWallet={currentWallet} data={data} updateData={updateData} />
            )}

            {/* Level 6: Recent Transactions Ledger */}
            <RecentLedger 
                walletTransactions={walletTransactions} 
                data={data} 
                updateData={updateData}
                setView={setView} 
                onEditTransaction={onEditTransaction} 
                formatMoney={formatMoney} 
            />
        </div>
    );
};
