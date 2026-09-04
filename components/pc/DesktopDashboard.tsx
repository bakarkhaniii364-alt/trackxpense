import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  ClockCounterClockwise,
  DotsThree,
  SlidersHorizontal,
  ChartLineUp,
  MagnifyingGlass as Search,
  Wallet as WalletIcon,
  Check,
  SquaresFour as LayoutGrid,
  Pulse as Activity,
  TrendUp as TrendingUp,
  HandCoins,
  Sliders,
  Calendar,
  UserCircle,
  Prohibit as Ban
} from '@phosphor-icons/react';
import { SpotifyIcon } from '../shared/SpotifyIcon';
import { parseTransactionWithAI, AIParsedTransaction } from '../../services/aiService';
import { Transaction, TransactionType, AppData, Wallet, Category } from '../../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { PredictiveEngine } from '../../services/PredictiveEngine';
import { BalanceHero } from '../dashboard/BalanceHero';
import { DailyBudget } from '../dashboard/DailyBudget';
import { FinancialHealthScore } from '../dashboard/WorkstationWidgets';
import { StreakDisplay } from '../dashboard/StreakDisplay';
import { LocalAdvisor } from '../dashboard/LocalAdvisor';
import { BudgetAlerts } from '../dashboard/BudgetAlerts';
import { SimulationModule } from '../dashboard/SimulationModule';
import { CloudflareDateRangePicker, DateRange } from '../shared/CloudflareDateRangePicker';
import { AiStarIcon } from '../shared/AiStarIcon';
import { CoinFlipLoader } from '../shared/CoinFlipLoader';
import { NoDataWave } from '../shared/NoDataWave';
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
  onOpenRabbAi?: (query: { text: string; image?: string }) => void;
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
  onAddTransaction,
  onOpenRabbAi
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

  const [activeMenu, setActiveMenu] = useState<'status' | 'actions' | 'recents' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Smart Search Box State
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close search suggestions when clicking outside
  useEffect(() => {
    const handleSearchClickOutside = (e: MouseEvent | TouchEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleSearchClickOutside);
    document.addEventListener('touchstart', handleSearchClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleSearchClickOutside);
      document.removeEventListener('touchstart', handleSearchClickOutside);
    };
  }, []);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchFocused(true);
      }
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeMenu]);

  const fileInputRef = useRef<HTMLInputElement>(null);
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
    const defaults = [Category.TRANSPORT, Category.SHOPPING, Category.BILLS, Category.FOOD_DELIVERY];
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
  const handleCommandChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > 4000) return;
    setCommandText(val);
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

  // Execute Command or Query
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
    setIsSearchFocused(false);

    // Route to full RabbAi conversation window
    if (onOpenRabbAi) {
      onOpenRabbAi({ text, image: receipt || undefined });
      return;
    }

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
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center pt-4 md:pt-12 pb-1 space-y-4 md:space-y-5">
        
        {/* Clean, Direct Heading (Transitions UP on reload) */}
        <h1 className="animate-hero-text-up text-[22px] sm:text-[26px] md:text-[30px] font-medium text-[var(--text-primary)] tracking-[-0.012em] text-center">
          Spent anything today, {userName}?
        </h1>

        {/* Smart Search & Command Box with Suggestions */}
        <div ref={searchBoxRef} className="animate-hero-compose w-full space-y-2 relative">
          
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

          {/* Thinner & Sleek Smart Search Container with Shining Beam */}
          <div className="shining-beam-wrapper">
            <div className="shining-beam-inner py-1.5 px-3 transition-colors flex items-center gap-2">
              
              {/* Search Icon */}
              <Search size={16} strokeWidth={1.5} className="text-[var(--text-muted)] shrink-0" />

              {/* Single-Line Smart Search Input */}
              <input
                ref={searchInputRef}
                type="text"
                value={commandText}
                onChange={handleCommandChange}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (commandText.trim() || selectedReceipt) {
                      handleSendCommand();
                    }
                  } else if (e.key === 'Escape') {
                    setIsSearchFocused(false);
                    searchInputRef.current?.blur();
                  }
                }}
                placeholder="Search or jump to... (e.g. '$15 for lunch', or press Ctrl+K)"
                className="input-reset flex-1 bg-transparent border-0 outline-none text-[13px] font-normal text-[var(--text-primary)] placeholder:text-[var(--text-muted)] leading-normal py-1"
                style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
              />

              {/* Right Toolbar Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Attach Receipt Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-[26px] px-2 rounded-[6px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors flex items-center gap-1.5 text-[11.5px] cursor-pointer"
                  title="Attach receipt image"
                >
                  <Paperclip size={13} strokeWidth={1.5} />
                  <span className="hidden sm:inline">Receipt</span>
                </button>

                {/* Functional Voice Mic */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`h-[26px] w-[26px] rounded-[6px] flex items-center justify-center transition-all cursor-pointer ${
                    isListening
                      ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/40'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                  }`}
                  title={isListening ? 'Listening... click to stop' : 'Click to speak'}
                >
                  <Microphone size={14} strokeWidth={1.5} />
                </button>

                {/* Keyboard Shortcut Pill or Clear */}
                {commandText ? (
                  <button
                    type="button"
                    onClick={() => { setCommandText(''); setIsSearchFocused(false); }}
                    className="h-[22px] px-1.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded bg-[var(--bg-subtle)] border border-[var(--border-default)] cursor-pointer"
                  >
                    Esc
                  </button>
                ) : (
                  <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-muted)] select-none">
                    Ctrl K
                  </kbd>
                )}

                {/* Send / Log Button */}
                <button
                  type="button"
                  onClick={handleSendCommand}
                  disabled={(!commandText.trim() && !selectedReceipt) || isAiLoading}
                  className="btn btn--primary h-[26px] px-2.5 text-[11.5px] rounded-[6px] flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  title="Submit command"
                >
                  <span>Log</span>
                  <ArrowUp size={12} weight="bold" />
                </button>
              </div>
            </div>
          </div>

          {/* Anchored Suggestions Dropdown Menu */}
          {isSearchFocused && (
            <div 
              style={{ backgroundColor: '#121216' }}
              className="absolute left-0 right-0 top-full mt-1.5 bg-[#121216] border border-[var(--border-default)] rounded-[8px] shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 overflow-hidden text-[12.5px] animate-in fade-in zoom-in-95 duration-100 divide-y divide-[var(--border-default)]"
            >
              <div className="max-h-[340px] overflow-y-auto divide-y divide-[var(--border-default)]">
                
                {/* 1. Actions / Dynamic Query */}
                {commandText.trim() && (
                  <div className="p-1">
                    <div className="px-2.5 py-1 text-[10.5px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                      Actions
                    </div>
                    <div
                      onClick={handleSendCommand}
                      className="flex items-center justify-between px-2.5 py-2 rounded-[6px] hover:bg-[var(--bg-surface-hover)] cursor-pointer text-[var(--text-primary)] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ArrowUp size={14} className="text-[var(--accent)] shrink-0" weight="bold" />
                        <span className="truncate">
                          Execute command: <span className="text-[var(--text-primary)] font-medium">"{commandText.trim()}"</span>
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-muted)] font-mono shrink-0">↵ Enter</span>
                    </div>
                  </div>
                )}

                {/* 2. Navigation Suggestions */}
                <div className="p-1">
                  <div className="px-2.5 py-1 text-[10.5px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Navigation
                  </div>
                  <div className="space-y-0.5">
                    {[
                      { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutGrid, action: () => { setView('dashboard'); setIsSearchFocused(false); } },
                      { id: 'history', label: 'Transactions & Ledger', icon: Activity, action: () => { setView('history'); setIsSearchFocused(false); } },
                      { id: 'analytics', label: 'Financial Analytics', icon: TrendingUp, action: () => { setView('analytics'); setIsSearchFocused(false); } },
                      { id: 'debts', label: 'Debts & Loans', icon: HandCoins, action: () => { setView('debts'); setIsSearchFocused(false); } },
                      { id: 'control', label: 'Budgets & Categories', icon: Sliders, action: () => { setView('control'); setIsSearchFocused(false); } },
                      { id: 'bills', label: 'Upcoming Bills & Expenses', icon: Calendar, action: () => { setView('provisions'); setIsSearchFocused(false); } },
                      { id: 'subscriptions', label: 'Subscriptions & Recurring', icon: SpotifyIcon, action: () => { setView('subscriptions'); setIsSearchFocused(false); } },
                      { id: 'settings', label: 'Profile & Settings', icon: UserCircle, action: () => { setView('identity'); setIsSearchFocused(false); } },
                    ]
                      .filter(item => !commandText.trim() || item.label.toLowerCase().includes(commandText.toLowerCase()))
                      .slice(0, commandText.trim() ? 6 : 5)
                      .map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.id}
                            onClick={item.action}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-[6px] hover:bg-[var(--bg-surface-hover)] cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon size={15} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0 transition-colors" />
                              <span className="truncate">{item.label}</span>
                            </div>
                            <CaretRight size={11} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0" />
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 3. Wallets */}
                <div className="p-1">
                  <div className="px-2.5 py-1 text-[10.5px] font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    Wallets
                  </div>
                  <div className="space-y-0.5">
                    {data.wallets
                      .filter((w: Wallet) => !commandText.trim() || w.name.toLowerCase().includes(commandText.toLowerCase()))
                      .map((w: Wallet) => {
                        const isActive = w.id === data.currentWalletId;
                        const wBal = data.transactions
                          .filter(t => t.walletId === w.id)
                          .reduce((sum, t) => sum + (t.type === TransactionType.INCOME ? t.amount : -t.amount), 0);
                        return (
                          <div
                            key={w.id}
                            onClick={() => {
                              updateData({ currentWalletId: w.id });
                              setIsSearchFocused(false);
                            }}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-[6px] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors group ${
                              isActive ? 'bg-[var(--bg-surface-hover)]/70 text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <WalletIcon size={15} strokeWidth={1.5} className={isActive ? 'text-[var(--accent)] shrink-0' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0 transition-colors'} />
                              <span className="truncate">{w.name}</span>
                              {isActive && (
                                <span className="pill pill--accent text-[10px] py-0.5 px-2">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-[11.5px] text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">
                                {formatMoney(wBal, currency)}
                              </span>
                              {isActive && <Check size={12} weight="bold" className="text-[var(--accent)]" />}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Suggestions Footer Navigation Hints */}
              <div className="px-3 py-2 bg-[var(--bg-subtle)]/40 flex items-center justify-between text-[11px] text-[var(--text-muted)] select-none">
                <div className="flex items-center gap-3">
                  <span>
                    <kbd className="px-1 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] font-mono text-[9.5px]">↑</kbd>{' '}
                    <kbd className="px-1 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] font-mono text-[9.5px]">↓</kbd> navigate
                  </span>
                  <span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] font-mono text-[9.5px]">↵</kbd> select
                  </span>
                  <span>
                    <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] font-mono text-[9.5px]">Esc</kbd> close
                  </span>
                </div>
                <div className="font-mono text-[10.5px]">
                  {data.wallets.length} {data.wallets.length === 1 ? 'wallet' : 'wallets'}
                </div>
              </div>
            </div>
          )}

          {/* Feedback Card */}
          {isAiLoading && (
            <div 
              style={{ backgroundColor: '#121216' }}
              className="p-2.5 rounded-[8px] bg-[#121216] border border-[var(--border-default)] flex items-center gap-2.5 text-[12px] text-[var(--text-secondary)] animate-in fade-in"
            >
              <CoinFlipLoader size={18} />
              <span>RabbAi is thinking...</span>
            </div>
          )}

          {aiFeedback && !isAiLoading && (
            <div className="p-3 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-2 animate-in fade-in">
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
      <div className="animate-hero-bottom-down space-y-7">
        
        {/* CLOUDFLARE 3-COLUMN LOOK: Status | Actions | Recents List */}
        {/* Free-standing, no outside cards, with 3-dot context menus on each header */}
        <div ref={menuRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-start">
        
          {/* Column 1: Current Status */}
          <div className="space-y-2.5 relative">
            <div className="flex items-center justify-between text-[13px] text-[var(--text-secondary)] font-normal px-0.5">
              <div 
                onClick={() => setView('analytics')}
                className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <span>Status</span>
                <CaretRight size={12} strokeWidth={1.5} />
              </div>
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'status' ? null : 'status')}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-[4px] transition-colors cursor-pointer"
                title="Status options"
              >
                <DotsThree size={16} weight="bold" />
              </button>
            </div>

            {/* Status Context Menu */}
            {activeMenu === 'status' && (
              <div 
                style={{ backgroundColor: '#121216' }}
                className="absolute right-0 top-7 z-50 w-52 bg-[#121216] border border-[var(--border-default)] rounded-[6px] shadow-[0_12px_32px_rgba(0,0,0,0.8)] p-1 text-[12px] animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  type="button"
                  onClick={() => { setView('analytics'); setActiveMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] text-left cursor-pointer transition-colors"
                >
                  <ChartLineUp size={13} strokeWidth={1.5} />
                  <span>View full analytics</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setView('control'); setActiveMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] text-left cursor-pointer transition-colors"
                >
                  <SlidersHorizontal size={13} strokeWidth={1.5} />
                  <span>Manage budget caps</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setView('control'); setActiveMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] text-left cursor-pointer transition-colors"
                >
                  <WalletIcon size={13} strokeWidth={1.5} />
                  <span>Manage wallets</span>
                </button>
              </div>
            )}

            {/* Hairline Status Rows */}
            <div className="divide-y divide-[var(--border-default)]">
              {/* Row 1: Active Wallet Balance */}
              <div 
                onClick={() => setView('control')}
                className="flex items-center justify-between py-2.5 px-1 hover:bg-[var(--bg-surface-hover)]/60 text-[12.5px] cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <WalletIcon size={14} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" />
                  <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate font-normal">
                    {currentWallet?.name || 'Main Wallet'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[11.5px] text-[var(--text-primary)] font-medium">
                    {formatMoney(balance, currency)}
                  </span>
                  <CaretRight size={11} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
                </div>
              </div>

              {/* Row 2: Daily Budget Status */}
              <div 
                onClick={() => setView('control')}
                className="flex items-center justify-between py-2.5 px-1 hover:bg-[var(--bg-surface-hover)]/60 text-[12.5px] cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isOverBudget ? 'bg-[var(--status-error-fg)]' : 'bg-[var(--status-success-fg)]'}`} />
                  <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate font-normal">
                    Daily Budget
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-mono text-[11.5px] font-medium ${isOverBudget ? 'text-[var(--status-error-fg)]' : 'text-[var(--text-secondary)]'}`}>
                    {dailyLimit > 0 ? (isOverBudget ? 'Exceeded' : `${Math.round(dailyProgress)}% used`) : 'No limit'}
                  </span>
                  <CaretRight size={11} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
                </div>
              </div>

              {/* Row 3: 30-Day Runway */}
              <div 
                onClick={() => setView('analytics')}
                className="flex items-center justify-between py-2.5 px-1 hover:bg-[var(--bg-surface-hover)]/60 text-[12.5px] cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="w-2 h-2 rounded-full shrink-0 bg-sky-400" />
                  <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate font-normal">
                    Runway Outlook
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[11.5px] text-[var(--text-secondary)]">
                    {balance <= 0 ? '0d runway' : (!isFinite(runwayDays) || runwayDays >= 365) ? '365+d runway' : `${runwayDays}d runway`}
                  </span>
                  <CaretRight size={11} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
                </div>
              </div>

              {/* Row 4: Future Liabilities */}
              <div 
                onClick={() => setView('provisions')}
                className="flex items-center justify-between py-2.5 px-1 hover:bg-[var(--bg-surface-hover)]/60 text-[12.5px] cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="w-2 h-2 rounded-full shrink-0 bg-amber-400" />
                  <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate font-normal">
                    Upcoming 30d
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-[11.5px] text-[var(--text-secondary)]">
                    {formatMoney(futureLiability, currency)}
                  </span>
                  <CaretRight size={11} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
                </div>
              </div>
            </div>

            {/* Cloudflare-style ghost bordered button */}
            <button
              onClick={() => setView('control')}
              className="w-full mt-2 py-2 px-3 rounded-[6px] border border-[var(--border-default)] hover:border-[var(--border-active)] hover:bg-[var(--bg-surface-hover)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <SlidersHorizontal size={13} strokeWidth={1.5} />
              <span>Configure budget</span>
            </button>
          </div>

          {/* Column 2: Actions */}
          <div className="space-y-2.5 relative">
            <div className="flex items-center justify-between text-[13px] text-[var(--text-secondary)] font-normal px-0.5">
              <div 
                onClick={() => onAddTransactionRequest(TransactionType.EXPENSE)}
                className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <span>Actions</span>
                <CaretRight size={12} strokeWidth={1.5} />
              </div>
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'actions' ? null : 'actions')}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-[4px] transition-colors cursor-pointer"
                title="Action options"
              >
                <DotsThree size={16} weight="bold" />
              </button>
            </div>

            {/* Actions Context Menu */}
            {activeMenu === 'actions' && (
              <div 
                style={{ backgroundColor: '#121216' }}
                className="absolute right-0 top-7 z-50 w-52 bg-[#121216] border border-[var(--border-default)] rounded-[6px] shadow-[0_12px_32px_rgba(0,0,0,0.8)] p-1 text-[12px] animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  type="button"
                  onClick={() => { onAddTransactionRequest(TransactionType.EXPENSE); setActiveMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] text-left cursor-pointer transition-colors"
                >
                  <Plus size={13} strokeWidth={1.5} className="text-[var(--status-error-fg)]" />
                  <span>Log new expense</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onAddTransactionRequest(TransactionType.INCOME); setActiveMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] text-left cursor-pointer transition-colors"
                >
                  <ArrowUpRight size={13} strokeWidth={1.5} className="text-[var(--status-success-fg)]" />
                  <span>Log new income</span>
                </button>
                <button
                  type="button"
                  onClick={() => { fileInputRef.current?.click(); setActiveMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] text-left cursor-pointer transition-colors"
                >
                  <Paperclip size={13} strokeWidth={1.5} className="text-[var(--accent)]" />
                  <span>Attach receipt image</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSimOpen(true); setActiveMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] text-left cursor-pointer transition-colors"
                >
                  <Lightning size={13} strokeWidth={1.5} className="text-[var(--status-warning-fg)]" />
                  <span>Simulate scenario</span>
                </button>
              </div>
            )}

            {/* Hairline Action Rows */}
            <div className="divide-y divide-[var(--border-default)]">
              <div
                onClick={() => onAddTransactionRequest(TransactionType.EXPENSE)}
                className="flex items-center justify-between py-2.5 px-1 hover:bg-[var(--bg-surface-hover)]/60 text-[12.5px] cursor-pointer group transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Plus size={14} className="text-[var(--status-error-fg)] shrink-0" strokeWidth={1.5} />
                  <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate font-normal">
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
                  <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate font-normal">
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
                  <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate font-normal">
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
                  <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] truncate font-normal">
                    Simulate scenario
                  </span>
                </div>
                <CaretRight size={11} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0" />
              </div>
            </div>

            {/* Cloudflare-style ghost bordered button */}
            <button
              onClick={() => onAddTransactionRequest(TransactionType.EXPENSE)}
              className="w-full mt-2 py-2 px-3 rounded-[6px] border border-[var(--border-default)] hover:border-[var(--border-active)] hover:bg-[var(--bg-surface-hover)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={13} strokeWidth={1.5} />
              <span>Record transaction</span>
            </button>
          </div>

          {/* Column 3: Recents (Income & Expense) */}
          <div className="space-y-2.5 relative">
            <div className="flex items-center justify-between text-[13px] text-[var(--text-secondary)] font-normal px-0.5">
              <div 
                onClick={() => setView('history')}
                className="flex items-center gap-1 hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <span>Recents</span>
                <CaretRight size={12} strokeWidth={1.5} />
              </div>
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'recents' ? null : 'recents')}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-[4px] transition-colors cursor-pointer"
                title="Recents options"
              >
                <DotsThree size={16} weight="bold" />
              </button>
            </div>

            {/* Recents Context Menu */}
            {activeMenu === 'recents' && (
              <div 
                style={{ backgroundColor: '#121216' }}
                className="absolute right-0 top-7 z-50 w-52 bg-[#121216] border border-[var(--border-default)] rounded-[6px] shadow-[0_12px_32px_rgba(0,0,0,0.8)] p-1 text-[12px] animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  type="button"
                  onClick={() => { setView('history'); setActiveMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] text-left cursor-pointer transition-colors"
                >
                  <ClockCounterClockwise size={13} strokeWidth={1.5} />
                  <span>View full history</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onAddTransactionRequest(TransactionType.EXPENSE); setActiveMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] text-left cursor-pointer transition-colors"
                >
                  <Plus size={13} strokeWidth={1.5} />
                  <span>Log expense</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onAddTransactionRequest(TransactionType.INCOME); setActiveMenu(null); }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] text-left cursor-pointer transition-colors"
                >
                  <ArrowUpRight size={13} strokeWidth={1.5} />
                  <span>Log income</span>
                </button>
              </div>
            )}

            {/* Hairline Recent Transactions (Income and Expense) */}
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
                          {tx.category} / <span className="text-[var(--text-primary)] font-medium">{tx.note || (isExp ? 'Expense' : 'Income')}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-mono text-[11.5px] font-medium ${isExp ? 'text-[var(--text-primary)]' : 'text-[var(--status-success-fg)]'}`}>
                          {isExp ? '-' : '+'}{formatMoney(tx.amount, currency)}
                        </span>
                        <CaretRight size={11} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0" />
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

            {/* Cloudflare-style ghost bordered button */}
            <button
              onClick={() => setView('history')}
              className="w-full mt-2 py-2 px-3 rounded-[6px] border border-[var(--border-default)] hover:border-[var(--border-active)] hover:bg-[var(--bg-surface-hover)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ClockCounterClockwise size={13} strokeWidth={1.5} />
              <span>View all transactions</span>
            </button>
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
      {/* COMPACT BENTO CARD DECK: Tight, disciplined Cloudflare 12-14px spacing     */}
      {/* ========================================================================= */}
      <div className="space-y-3 sm:space-y-3.5">

        {/* BENTO TIER 1: Balance Hero + Spending Sparkline (2 Cards) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5">
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
        <div className="w-full rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 sm:p-5 flex flex-col justify-between transition-colors h-full">
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

          {/* Clean Recharts Area/Sparkline or Cloudflare No Data Wave */}
          <div className="h-[145px] w-full mt-2">
            {timeframeExpense > 0 && chartData.some(d => (d.spent || 0) > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cfTopSpendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F6821F" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#F6821F" stopOpacity={0.0} />
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
                    stroke="#F6821F"
                    strokeWidth={1.5}
                    fill="url(#cfTopSpendGrad)"
                    activeDot={{ r: 4, fill: '#F6821F', stroke: 'var(--bg-surface)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <NoDataWave height={145} />
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BENTO TIER 2: 4-Metric Grid                                               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
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
        <div className="rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 sm:p-5 flex flex-col justify-between transition-colors h-full">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)] truncate">
                30-Day Outlook
              </span>
              <span className="text-[11px] font-medium text-[var(--text-secondary)] font-mono shrink-0">
                {balance <= 0 ? '0d runway' : (!isFinite(runwayDays) || runwayDays >= 365) ? '365+d runway' : `${runwayDays}d runway`}
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
                style={{ width: `${Math.min(100, balance > 0 ? (futureLiability / balance) * 100 : (futureLiability > 0 ? 100 : 0))}%` }} 
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
              <span>Balance impact</span>
              <span className="font-mono text-[var(--text-primary)] font-medium">
                {balance > 0 ? Math.round((futureLiability / balance) * 100) : (futureLiability > 0 ? 100 : 0)}%
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5">
        {/* Category Allocation */}
        <div className="w-full rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 sm:p-5 flex flex-col justify-between transition-colors">
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
              <NoDataWave height={120} />
            )}
          </div>
        </div>

        {/* Local Advisor / Smart Insights */}
        <div className="w-full">
          <LocalAdvisor data={data} formatMoney={formatMoney} />
        </div>
      </div>

      </div>

      {/* Budget Alerts if any */}
      {budgetAlerts.length > 0 && (
        <BudgetAlerts budgetAlerts={budgetAlerts} data={data} formatMoney={formatMoney} />
      )}
      </div>

      {/* Simulator Module */}
      <SimulationModule isOpen={isSimOpen} onClose={() => setIsSimOpen(false)} data={data} />
    </div>
  );
};
