import React, { useState, useMemo, useRef } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CaretRight,
  Plus,
  Microphone,
  ArrowUp,
  Paperclip,
  X,
  Sparkle,
  Lightning,
  ClockCounterClockwise
} from '@phosphor-icons/react';
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
import { CloudflareDateRangePicker, DateRange } from '../shared/CloudflareDateRangePicker';
import { sendRabbAiTextMessage, sendRabbAiImageMessage, RabbAiMessage } from '../../services/rabbAiService';
import { Haptics } from '../../services/haptics';

interface DesktopDashboardProps {
  data: AppData;
  setView: (view: any) => void;
  updateData: (data: Partial<AppData>) => void;
  formatMoney: (val: number, sym: string) => string;
  onAddTransactionRequest: (type: TransactionType, quickData?: any) => void;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTemplate: (id: string) => void;
  onAddTransaction?: (t: any) => void;
}

type Timeframe = '7d' | '30d' | 'month';

export const DesktopDashboard: React.FC<DesktopDashboardProps> = ({ 
  data, 
  setView, 
  updateData, 
  formatMoney, 
  onAddTransactionRequest, 
  onEditTransaction, 
  onDeleteTemplate,
  onAddTransaction 
}) => {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return {
      startDate: start,
      endDate: end,
      label: 'Last 30 days',
      presetKey: '30d'
    };
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSimOpen, setIsSimOpen] = useState(false);

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
  const userName = data.profile?.name ? data.profile.name.split(' ')[0] : 'alif';

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

  // DateRange chart calculation
  const { chartData, timeframeExpense, deltaPercent, isDeltaLower } = useMemo(() => {
    const end = dateRange.endDate || new Date();
    const start = dateRange.startDate || new Date(Date.now() - 30 * 86400000);
    
    // Calculate total days count in the range
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysCount = Math.max(1, Math.min(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1, 90));

    const currentPeriodSpend: number[] = [];
    const prevPeriodSpend: number[] = [];

    const points = [...Array(daysCount)].map((_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const label = daysCount <= 7 
        ? d.toLocaleDateString('en-US', { weekday: 'short' }) 
        : d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      
      const spent = walletTransactions
        .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(dateStr))
        .reduce((s, t) => s + t.amount, 0);
      
      currentPeriodSpend.push(spent);
      return { name: label, spent };
    });

    for (let i = 0; i < daysCount; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() - (daysCount - i));
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
  }, [walletTransactions, dateRange]);

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

  // Handle Command Bar Text Change
  const handleCommandChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > 4000) return;
    setCommandText(val);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, 38), 200)}px`;
    }
  };

  // Image Upload for Receipt
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Haptics.light();
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedReceipt(reader.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Web Speech API Voice Recognition
  const toggleListening = () => {
    Haptics.light();
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setCommandText(prev => prev ? `${prev} ${transcript}` : transcript);
          if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
          }
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  // Execute Command or RabbAi Query
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
        text: 'Could not process command. Please try again or log manually.'
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleUndoLog = () => {
    Haptics.light();
    if (aiFeedback?.loggedId) {
      updateData({
        transactions: data.transactions.filter(t => t.id !== aiFeedback.loggedId)
      });
      setAiFeedback(prev => prev ? { ...prev, isLogged: false } : null);
    }
  };

  const recentFiveTransactions = useMemo(() => {
    return data.transactions.slice(0, 5);
  }, [data.transactions]);

  return (
    <div className="space-y-10 pb-16 animate-in fade-in duration-500 w-full max-w-5xl mx-auto">
      
      {/* Hidden File Input for Receipt Attachment */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleReceiptUpload}
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* CLOUDFLARE HERO SECTION: Title (NO pills) + Universal Centered Bar        */}
      {/* Orchestrated Entrance: Compose box pops first, title slides UP, rest DOWN */}
      {/* ========================================================================= */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center pt-8 md:pt-12 pb-1 space-y-5">
        
        {/* Clean, Direct Heading (Transitions UP on reload) */}
        <h1 className="animate-hero-text-up text-[26px] md:text-[30px] font-medium text-[var(--text-primary)] tracking-[-0.012em] text-center">
          Spent anything today, {userName}?
        </h1>

        {/* Universal RabbAi Search & Command Box (Wider & Thinner, Shows first) */}
        <div className="animate-hero-compose w-full space-y-2">
          
          {/* Selected Receipt Image Preview */}
          {selectedReceipt && (
            <div className="relative inline-block">
              <img src={selectedReceipt} alt="Receipt preview" className="w-14 h-14 object-cover rounded-[6px] border border-[var(--border-default)] shadow-xs" />
              <button
                onClick={() => setSelectedReceipt(null)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black/80 rounded-full text-white flex items-center justify-center hover:bg-red-500 transition-colors cursor-pointer"
              >
                <X size={10} />
              </button>
            </div>
          )}

          {/* Thinner & Wider Compose Box Container with Shining Trail of Light */}
          <div className="shining-beam-wrapper">
            <div className="shining-beam-inner py-2 px-3.5 transition-colors">
              {/* Textarea Input (input-reset, zero internal border) */}
              <textarea
                ref={textareaRef}
                rows={1}
                value={commandText}
                onChange={handleCommandChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendCommand();
                  }
                }}
                placeholder="Ask RabbAi, log an expense ('$15 for Lunch with Cash'), or search..."
                className="input-reset w-full bg-transparent border-0 outline-none text-[13px] font-normal text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none leading-relaxed overflow-y-auto max-h-[160px] py-0.5"
                style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
              />

              {/* Toolbar Controls inside Compose Box (compact, all 6px radius, no divider line) */}
              <div className="flex items-center justify-between pt-1">
                
                {/* Left: Attach Receipt Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-[24px] px-2 rounded-[6px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors flex items-center gap-1.5 text-[11.5px] cursor-pointer"
                  title="Attach receipt image"
                >
                  <Paperclip size={13} strokeWidth={1.5} />
                  <span>Attach receipt</span>
                </button>

                {/* Right: Functional Voice Mic & Send Button */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`h-[24px] w-[24px] rounded-[6px] flex items-center justify-center transition-all cursor-pointer ${
                      isListening
                        ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/40'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                    }`}
                    title={isListening ? 'Listening... click to stop' : 'Click to speak'}
                  >
                    <Microphone size={14} strokeWidth={1.5} />
                  </button>

                  <button
                    type="button"
                    onClick={handleSendCommand}
                    disabled={(!commandText.trim() && !selectedReceipt) || isAiLoading}
                    className="btn btn--primary h-[24px] px-2.5 text-[11.5px] rounded-[6px] flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    title="Submit command"
                  >
                    <span>Log</span>
                    <ArrowUp size={12} weight="bold" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Execution Feedback Card */}
          {isAiLoading && (
            <div className="p-2.5 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center gap-2 text-[12px] text-[var(--text-secondary)] animate-in fade-in">
              <Sparkle size={14} className="text-[var(--accent)] animate-spin" />
              <span>RabbAi is analyzing and updating your ledger...</span>
            </div>
          )}

          {aiFeedback && !isAiLoading && (
            <div className="p-3 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-2 animate-in fade-in">
              <div className="flex items-start justify-between">
                <div className="text-[12.5px] text-[var(--text-primary)] leading-relaxed">
                  {aiFeedback.text}
                </div>
                <button 
                  onClick={() => setAiFeedback(null)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </div>

              {aiFeedback.extractedTx && (
                <div className="pt-2 border-t border-[var(--border-default)] flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-[var(--text-primary)]">
                      {formatMoney(aiFeedback.extractedTx.amount, currency)}
                    </span>
                    <span className="text-[var(--text-secondary)]">•</span>
                    <span className="text-[var(--accent)] font-medium">{aiFeedback.extractedTx.category}</span>
                  </div>
                  {aiFeedback.isLogged && (
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                        ✓ Recorded
                      </span>
                      <button 
                        onClick={handleUndoLog}
                        className="text-[11px] text-[var(--text-muted)] hover:text-red-400 transition-colors cursor-pointer"
                      >
                        Undo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LOWER CONTENT: Transitions DOWN on reload                                 */}
      {/* ========================================================================= */}
      <div className="animate-hero-bottom-down space-y-10">
        
        {/* CLOUDFLARE 3-COLUMN LOOK: Wallets | Actions | Recents List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Column 1: Wallets (hairline rows + dotted ghost button under) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[13px] text-[var(--text-secondary)] font-normal px-0.5">
            <div 
              onClick={() => setView('control')}
              className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <span>Wallets</span>
              <CaretRight size={12} strokeWidth={1.5} />
            </div>
            <span className="text-[12px] text-[var(--text-muted)] cursor-default">•••</span>
          </div>

          <div className="divide-y divide-[var(--border-default)]">
            {data.wallets.map(w => {
              const isCurrent = w.id === data.currentWalletId;
              const wTxs = data.transactions.filter(t => t.walletId === w.id);
              const wBal = wTxs.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0)
                - wTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
              return (
                <div
                  key={w.id}
                  onClick={() => updateData({ currentWalletId: w.id })}
                  className={`flex items-center justify-between py-2.5 px-1 hover:bg-[var(--bg-surface-hover)]/60 text-[12.5px] cursor-pointer group transition-colors ${
                    isCurrent ? 'bg-[var(--bg-surface-hover)]/30 font-medium' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isCurrent ? 'bg-[var(--status-success-fg)]' : 'bg-[var(--text-muted)]'}`} />
                    <span className={`truncate ${isCurrent ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
                      {w.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[11.5px] text-[var(--text-primary)]">
                      {formatMoney(wBal, currency)}
                    </span>
                    <CaretRight size={11} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dotted stroke ghost button under wallet list */}
          <button
            onClick={() => setView('control')}
            className="w-full mt-2 py-2 px-3 rounded-[6px] border border-dashed border-[var(--border-default)] hover:border-[var(--border-active)] hover:bg-[var(--bg-surface-hover)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus size={13} strokeWidth={1.5} />
            <span>Add wallet</span>
          </button>
        </div>

        {/* Column 2: Actions (hairline rows one under another like recents) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[13px] text-[var(--text-secondary)] font-normal px-0.5">
            <div 
              onClick={() => onAddTransactionRequest(TransactionType.EXPENSE)}
              className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <span>Actions</span>
              <CaretRight size={12} strokeWidth={1.5} />
            </div>
            <span className="text-[12px] text-[var(--text-muted)] cursor-default">•••</span>
          </div>

          <div className="divide-y divide-[var(--border-default)]">
            <div
              onClick={() => onAddTransactionRequest(TransactionType.EXPENSE)}
              className="flex items-center justify-between py-2.5 px-1 hover:bg-[var(--bg-surface-hover)]/60 text-[12.5px] cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <Plus size={14} className="text-[var(--status-error-fg)] shrink-0" strokeWidth={1.5} />
                <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate">
                  Log an expense
                </span>
              </div>
              <CaretRight size={11} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0" />
            </div>

            <div
              onClick={() => onAddTransactionRequest(TransactionType.INCOME)}
              className="flex items-center justify-between py-2.5 px-1 hover:bg-[var(--bg-surface-hover)]/60 text-[12.5px] cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <ArrowUpRight size={14} className="text-[var(--status-success-fg)] shrink-0" strokeWidth={1.5} />
                <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate">
                  Log income
                </span>
              </div>
              <CaretRight size={11} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0" />
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-between py-2.5 px-1 hover:bg-[var(--bg-surface-hover)]/60 text-[12.5px] cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <Paperclip size={14} className="text-[var(--accent)] shrink-0" strokeWidth={1.5} />
                <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate">
                  Scan receipt
                </span>
              </div>
              <CaretRight size={11} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0" />
            </div>

            <div
              onClick={() => setIsSimOpen(true)}
              className="flex items-center justify-between py-2.5 px-1 hover:bg-[var(--bg-surface-hover)]/60 text-[12.5px] cursor-pointer group transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <Lightning size={14} className="text-[var(--status-warning-fg)] shrink-0" strokeWidth={1.5} />
                <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate">
                  Simulate scenario
                </span>
              </div>
              <CaretRight size={11} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0" />
            </div>
          </div>
        </div>

        {/* Column 3: Recents List (Cloudflare Hairline List) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[13px] text-[var(--text-secondary)] font-normal px-0.5">
            <span>Recents</span>
            <span className="text-[12px] text-[var(--text-muted)] cursor-default">•••</span>
          </div>

          <div className="divide-y divide-[var(--border-default)]">
            {recentFiveTransactions.length > 0 ? (
              recentFiveTransactions.map(tx => {
                const isExp = tx.type === TransactionType.EXPENSE;
                return (
                  <div
                    key={tx.id}
                    onClick={() => onEditTransaction(tx)}
                    className="flex items-center justify-between py-2.5 px-1 hover:bg-[var(--bg-surface-hover)]/60 text-[12.5px] cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <ClockCounterClockwise size={14} className="text-[var(--text-muted)] shrink-0" strokeWidth={1.5} />
                      <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate font-normal">
                        {tx.category} / <span className="text-[var(--text-primary)] font-medium">{tx.note || 'Expense'}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-mono text-[11.5px] font-medium ${isExp ? 'text-[var(--text-primary)]' : 'text-[var(--status-success-fg)]'}`}>
                        {isExp ? '-' : '+'}{formatMoney(tx.amount, currency)}
                      </span>
                      <CaretRight size={11} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-6 text-center text-[12px] text-[var(--text-muted)]">
                No recent activity.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* SECTION DIVIDER & HEADER: Analytics Overview with Cloudflare Range Picker */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 border-t border-[var(--border-default)]">
        <div className="flex items-baseline gap-3">
          <span className="text-[15px] font-medium text-[var(--text-primary)] tracking-tight">
            Analytics Overview
          </span>
          <span className="text-[11px] text-[var(--text-muted)] font-mono">
            {dateRange.label}
          </span>
        </div>

        {/* Cloudflare-Style Date Range Picker with Calendar Popover & Quick Presets */}
        <CloudflareDateRangePicker
          value={dateRange}
          onChange={(newRange) => {
            setDateRange(newRange);
          }}
          onRefresh={() => {
            setIsRefreshing(true);
            setTimeout(() => setIsRefreshing(false), 500);
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* BENTO TIER 1: Balance Hero + Spending Sparkline (2 Cards)                  */}
      {/* ========================================================================= */}
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
        <div className="w-full rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 lg:p-6 flex flex-col justify-between transition-colors h-full">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Total Spending
              </span>
              <span className="text-[11px] font-medium text-[var(--text-secondary)] font-mono">
                {dateRange.label}
              </span>
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

      {/* ========================================================================= */}
      {/* BENTO TIER 2: 4-Metric Grid                                               */}
      {/* ========================================================================= */}
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
        <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 lg:p-6 flex flex-col justify-between transition-colors h-full">
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

      {/* ========================================================================= */}
      {/* BENTO TIER 3: Category Allocation & Local Intelligence (2 Columns)        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        {/* Category Allocation */}
        <div className="w-full rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 lg:p-6 flex flex-col justify-between transition-colors">
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

      {/* ========================================================================= */}
      {/* BENTO TIER 4: Savings Goals & Quick Entry / Templates                     */}
      {/* ========================================================================= */}
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

      {/* ========================================================================= */}
      {/* BENTO TIER 5: Recent Transactions Ledger Table                             */}
      {/* ========================================================================= */}
      <RecentLedger 
        walletTransactions={walletTransactions} 
        data={data} 
        updateData={updateData}
        setView={setView} 
        onEditTransaction={onEditTransaction} 
        formatMoney={formatMoney} 
      />
      </div>

      {/* Simulator Module */}
      <SimulationModule isOpen={isSimOpen} onClose={() => setIsSimOpen(false)} data={data} />
    </div>
  );
};
