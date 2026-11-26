import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  CaretRight,
  ClockCounterClockwise,
  Lightning,
  Microphone,
  Paperclip,
  Plus,
  X
} from '@phosphor-icons/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { AppData, Transaction, TransactionType, Wallet } from '../../types';
import { PredictiveEngine } from '../../services/PredictiveEngine';
import { sendRabbAiImageMessage, sendRabbAiTextMessage, RabbAiMessage } from '../../services/rabbAiService';
import { getDashboardGreeting } from '../../utils/greetings';
import { resolveTransactionTimestamp } from '../../utils/formatters';
import { ExchangeRateService } from '../../services/ExchangeRateService';
import { Haptics } from '../../services/haptics';
import { LayerCard } from '../shared/LayerCard';
import { HorizontalScrollArea } from '../shared/HorizontalScrollArea';
import { NoDataWave } from '../shared/NoDataWave';
import { CoinFlipLoader } from '../shared/CoinFlipLoader';
import { CloudflareDateRangePicker, DateRange } from '../shared/CloudflareDateRangePicker';
import { BalanceHero } from '../dashboard/BalanceHero';
import { DailyBudget } from '../dashboard/DailyBudget';
import { FinancialHealthScore } from '../dashboard/WorkstationWidgets';
import { StreakDisplay } from '../dashboard/StreakDisplay';
import { LocalAdvisor } from '../dashboard/LocalAdvisor';
import { BudgetAlerts } from '../dashboard/BudgetAlerts';
import { SimulationModule } from '../dashboard/SimulationModule';

interface MobileDashboardProps {
  data: AppData;
  setView: (view: any) => void;
  updateData: (data: Partial<AppData>) => void;
  formatMoney: (val: number, sym: string) => string;
  onAddTransactionRequest: (type: TransactionType, quickData?: any) => void;
  onEditTransaction: (t: Transaction) => void;
  onDeleteTemplate?: (id: string) => void;
  onAddTransaction?: (t: any) => void;
  onOpenRabbAi?: (query: { text: string; image?: string }) => void;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  data,
  setView,
  updateData,
  formatMoney,
  onAddTransactionRequest,
  onEditTransaction,
  onAddTransaction,
  onOpenRabbAi
}) => {
  const [commandText, setCommandText] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSimOpen, setIsSimOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return { startDate: start, endDate: end, label: 'Last 30 days' };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const currentWallet = data.wallets.find((w: Wallet) => w.id === data.currentWalletId);
  const currency = ExchangeRateService.normalizeSymbol(currentWallet?.currency || data.settings.currencySymbol);
  const userName = data.profile?.name ? data.profile.name.split(' ')[0] : 'alif';
  const greeting = useMemo(() => getDashboardGreeting(userName), [userName]);

  // Strict active-wallet isolation
  const walletTransactions = useMemo(
    () =>
      data.transactions.filter((t: Transaction) => {
        if (t.walletId !== data.currentWalletId) return false;
        if (data.settings.privacyMode && t.isPrivate) return false;
        return true;
      }),
    [data.transactions, data.currentWalletId, data.settings.privacyMode]
  );

  const totalIncome = walletTransactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = walletTransactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const adjustedBalance = PredictiveEngine.getAdjustedBalance(data, balance);
  const runwayDays = PredictiveEngine.getRunwayDays(data, balance);
  const futureLiability = PredictiveEngine.getFutureLiabilities(data, 30);
  const goalProgress =
    currentWallet?.type === 'GOAL' ? Math.min((balance / (currentWallet.targetAmount || 1)) * 100, 100) : 0;

  const today = new Date().toISOString().split('T')[0];
  const dailySpent = walletTransactions
    .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(today))
    .reduce((sum, t) => sum + t.amount, 0);
  const dailyLimit = data.profile.dailyGoal || 0;
  const dailyProgress = dailyLimit > 0 ? Math.min((dailySpent / dailyLimit) * 100, 100) : 0;
  const isOverBudget = dailyLimit > 0 && dailySpent > dailyLimit;

  const recentTransactions = useMemo(() => walletTransactions.slice(0, 5), [walletTransactions]);

  const { chartData, timeframeExpense, deltaPercent, isDeltaLower } = useMemo(() => {
    const end = dateRange.endDate || new Date();
    const start = dateRange.startDate || new Date(Date.now() - 30 * 86400000);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const daysCount = Math.max(1, Math.min(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1, 90));

    const currentPeriodSpend: number[] = [];
    const prevPeriodSpend: number[] = [];

    const points = [...Array(daysCount)].map((_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const label =
        daysCount <= 7
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
    const delta = prevTotal > 0 ? Math.round(((currentTotal - prevTotal) / prevTotal) * 100) : 0;

    return {
      chartData: points,
      timeframeExpense: currentTotal,
      deltaPercent: Math.abs(delta),
      isDeltaLower: delta < 0
    };
  }, [walletTransactions, dateRange]);

  const categoryTotals = useMemo(() => {
    return (data.categories || [])
      .filter(c => c.type === TransactionType.EXPENSE && c.name !== 'Transfer')
      .map(cat => {
        const amount = walletTransactions
          .filter(t => t.type === TransactionType.EXPENSE && t.category === cat.name)
          .reduce((sum, t) => sum + t.amount, 0);
        return { ...cat, amount, percent: totalExpense > 0 ? (amount / totalExpense) * 100 : 0 };
      })
      .filter(c => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [data.categories, walletTransactions, totalExpense]);

  const budgetAlerts = useMemo(() => {
    const spentMonthByCategory: Record<string, number> = {};
    const currentMonthStr = today.slice(0, 7);
    walletTransactions
      .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(currentMonthStr))
      .forEach(t => {
        spentMonthByCategory[t.category] = (spentMonthByCategory[t.category] || 0) + t.amount;
      });

    return Object.entries(data.settings.budgetLimits || {})
      .map(([cat, config]: [string, any]) => {
        const limit = typeof config === 'number' ? config : config?.limit || 0;
        const spent = spentMonthByCategory[cat] || 0;
        const percent = limit > 0 ? (spent / limit) * 100 : 0;
        return { category: cat, limit, spent, percent };
      })
      .filter(b => b.percent >= 80 && b.limit > 0)
      .sort((a, b) => b.percent - a.percent);
  }, [walletTransactions, data.settings.budgetLimits, today]);

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    Haptics.light();
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('');
      setCommandText(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setSelectedReceipt(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleQuickSubmit = async () => {
    const text = commandText.trim();
    const receipt = selectedReceipt;
    if (!text && !receipt) return;
    Haptics.light();

    if (!data.settings?.enableAiParsing) {
      onAddTransactionRequest(TransactionType.EXPENSE, text ? { note: text } : undefined);
      setCommandText('');
      return;
    }

    if (onOpenRabbAi) {
      onOpenRabbAi({ text, image: receipt || undefined });
      setCommandText('');
      setSelectedReceipt(null);
      return;
    }

    setIsAiLoading(true);
    try {
      const aiMsg: RabbAiMessage = receipt
        ? await sendRabbAiImageMessage(receipt, text, data)
        : await sendRabbAiTextMessage(text, [], data);

      if (aiMsg.extractedTransaction && aiMsg.extractedTransaction.isLogged) {
        const ext = aiMsg.extractedTransaction;
        const newTx: Transaction = {
          id: crypto.randomUUID(),
          amount: ext.amount,
          type: ext.type,
          category: ext.category,
          date: resolveTransactionTimestamp(ext.date),
          note: ext.description,
          walletId: data.currentWalletId || data.wallets?.[0]?.id || 'default'
        };
        if (onAddTransaction) onAddTransaction(newTx);
        else updateData({ transactions: [newTx, ...data.transactions] });
      }
      setCommandText('');
      setSelectedReceipt(null);
    } finally {
      setIsAiLoading(false);
    }
  };

  const formatTxTime = (iso: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4 pb-4 animate-in fade-in duration-300">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleReceiptUpload}
        className="hidden"
      />

      {/* 1. Calm Greeting + Compact Single-Line Quick Bar */}
      <div className="space-y-3 pt-1.5">
        <h1 className="text-[22px] sm:text-[26px] leading-[28px] font-medium text-[var(--text-primary)] text-center px-0.5">
          {greeting}
        </h1>

        {selectedReceipt && (
          <div className="relative inline-block">
            <img
              src={selectedReceipt}
              alt="Receipt preview"
              className="w-12 h-12 object-cover rounded-[6px] border border-[var(--border-default)]"
            />
            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black/90 rounded-full text-white flex items-center justify-center cursor-pointer"
            >
              <X size={10} />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 h-[44px] pl-3 pr-1.5 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] focus-within:border-[var(--border-active)] transition-colors">
          <input
            type="text"
            value={commandText}
            onChange={e => setCommandText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickSubmit();
              }
            }}
            placeholder={
              data.settings?.enableAiParsing
                ? 'Log "120 coffee" or ask RabbAi...'
                : 'Type a quick note to log...'
            }
            className="input-reset flex-1 min-w-0 bg-transparent text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer shrink-0"
            title="Attach receipt"
          >
            <Paperclip size={16} strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={handleVoiceInput}
            className={`w-8 h-8 rounded-[6px] flex items-center justify-center cursor-pointer shrink-0 ${
              isListening ? 'text-[var(--status-error-fg)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="Voice input"
          >
            <Microphone size={16} strokeWidth={1.5} />
          </button>

          <button
            type="button"
            onClick={handleQuickSubmit}
            disabled={isAiLoading || (!commandText.trim() && !selectedReceipt)}
            style={{ padding: 0 }}
            className="btn btn--primary btn--icon !w-[32px] !h-[32px] rounded-[6px] flex items-center justify-center shrink-0 disabled:opacity-35"
            title="Send"
          >
            {isAiLoading ? <CoinFlipLoader size={14} /> : <ArrowUp size={15} weight="bold" className="shrink-0" />}
          </button>
        </div>
      </div>

      {/* 2. Hero Balance Card */}
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

      {/* 3. Quick Action Pills */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => {
            Haptics.light();
            onAddTransactionRequest(TransactionType.EXPENSE);
          }}
          className="h-[38px] px-2.5 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] flex items-center justify-center gap-1.5 text-[13px] font-medium text-[var(--text-primary)] cursor-pointer active:scale-[0.98]"
        >
          <Plus size={14} className="text-[var(--status-error-fg)] shrink-0" />
          <span>Expense</span>
        </button>

        <button
          type="button"
          onClick={() => {
            Haptics.light();
            onAddTransactionRequest(TransactionType.INCOME);
          }}
          className="h-[38px] px-2.5 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] flex items-center justify-center gap-1.5 text-[13px] font-medium text-[var(--text-primary)] cursor-pointer active:scale-[0.98]"
        >
          <ArrowUpRight size={14} className="text-[var(--status-success-fg)] shrink-0" />
          <span>Income</span>
        </button>

        <button
          type="button"
          onClick={() => {
            Haptics.light();
            setIsSimOpen(true);
          }}
          className="h-[38px] px-2.5 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] flex items-center justify-center gap-1.5 text-[13px] font-medium text-[var(--text-primary)] cursor-pointer active:scale-[0.98]"
        >
          <Lightning size={14} className="text-[var(--status-warning-fg)] shrink-0" />
          <span>Simulate</span>
        </button>
      </div>

      {/* 4. Horizontal Snap Carousel for Key Metrics */}
      <HorizontalScrollArea
        wrapperClassName="-mx-3.5"
        className="px-3.5 scroll-pl-3.5 flex gap-2.5 snap-x snap-mandatory"
        fadeWidth={32}
      >
        <div className="w-[74%] shrink-0 snap-start">
          <DailyBudget
            dailySpent={dailySpent}
            dailyLimit={dailyLimit}
            dailyProgress={dailyProgress}
            isOverBudget={isOverBudget}
            data={data}
            updateData={updateData}
            formatMoney={formatMoney}
          />
        </div>

        <div className="w-[74%] shrink-0 snap-start">
          <FinancialHealthScore data={data} />
        </div>

        <div className="w-[74%] shrink-0 snap-start">
          <LayerCard className="px-4 py-3.5 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[12px] font-medium text-[var(--text-muted)]">
                  30-day outlook
                </span>
                <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                  {balance <= 0 ? '0d runway' : !isFinite(runwayDays) || runwayDays >= 365 ? '365+d runway' : `${runwayDays}d runway`}
                </span>
              </div>
              <div className="text-xl font-semibold text-[var(--text-primary)] font-mono">
                {formatMoney(futureLiability, currency)}
              </div>
              <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                Scheduled liabilities
              </div>
            </div>
            <div className="pt-3">
              <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-[var(--status-warning-fg)] rounded-full"
                  style={{
                    width: `${Math.min(100, balance > 0 ? (futureLiability / balance) * 100 : futureLiability > 0 ? 100 : 0)}%`
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
                <span>Balance impact</span>
                <span className="font-mono text-[var(--text-primary)] font-medium">
                  {balance > 0 ? Math.round((futureLiability / balance) * 100) : futureLiability > 0 ? 100 : 0}%
                </span>
              </div>
            </div>
          </LayerCard>
        </div>

        <div className="w-[74%] shrink-0 snap-start">
          <StreakDisplay data={data} />
        </div>
      </HorizontalScrollArea>

      {/* 5. Recent Activity Feed */}
      <LayerCard className="px-4 py-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-medium text-[var(--text-primary)]">
            Recent activity
          </span>
          <button
            type="button"
            onClick={() => setView('history')}
            className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1 cursor-pointer"
          >
            <span>View all</span>
            <CaretRight size={12} />
          </button>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="divide-y divide-[var(--border-default)]">
            {recentTransactions.map(tx => (
              <button
                key={tx.id}
                type="button"
                onClick={() => onEditTransaction(tx)}
                className="w-full py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer active:opacity-75"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] text-[var(--text-primary)] truncate">
                    {tx.note || tx.category}
                  </div>
                  <div className="text-[12px] text-[var(--text-muted)] flex items-center gap-1.5">
                    <span className="truncate">{tx.category}</span>
                    {tx.date && (
                      <>
                        <span>·</span>
                        <span className="font-mono shrink-0">{formatTxTime(tx.date)}</span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`text-[14px] font-mono tabular-nums font-medium shrink-0 ${
                    tx.type === TransactionType.INCOME
                      ? 'text-[var(--status-success-fg)]'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  {tx.type === TransactionType.INCOME ? '+' : '-'}
                  {formatMoney(tx.amount, currency)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-5 text-center text-[13px] text-[var(--text-muted)] flex flex-col items-center gap-2">
            <ClockCounterClockwise size={18} strokeWidth={1.5} />
            <span>No transactions in this wallet yet.</span>
          </div>
        )}
      </LayerCard>

      {/* 6. Spending Trend */}
      <LayerCard className="px-4 py-3.5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[12px] font-medium text-[var(--text-muted)] block">
              Total spending
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold text-[var(--text-primary)] font-mono">
                {formatMoney(timeframeExpense, currency)}
              </span>
              {deltaPercent > 0 && (
                <span
                  className={`inline-flex items-center text-[12px] font-mono ${
                    isDeltaLower ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'
                  }`}
                >
                  {isDeltaLower ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
                  {deltaPercent}%
                </span>
              )}
            </div>
          </div>

          <CloudflareDateRangePicker
            value={dateRange}
            onChange={setDateRange}
            onRefresh={() => {
              setIsRefreshing(true);
              setTimeout(() => setIsRefreshing(false), 500);
            }}
          />
        </div>

        <div className="h-[120px] w-full">
          {timeframeExpense > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="mobileSpendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F6821F" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#F6821F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-strong)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: 'var(--text-primary)'
                  }}
                  formatter={(val: any) => [formatMoney(Number(val) || 0, currency), 'Spent']}
                />
                <Area
                  type="monotone"
                  dataKey="spent"
                  stroke="#F6821F"
                  strokeWidth={1.5}
                  fill="url(#mobileSpendGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <NoDataWave height={115} />
          )}
        </div>
      </LayerCard>

      {/* 7. Top Categories */}
      {categoryTotals.length > 0 && (
        <LayerCard className="px-4 py-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium text-[var(--text-primary)]">
              Category allocation
            </span>
            <span className="text-[12px] font-mono text-[var(--text-muted)]">
              {categoryTotals.length} active
            </span>
          </div>
          <div className="space-y-2.5">
            {categoryTotals.slice(0, 4).map(cat => (
              <div key={cat.id || cat.name} className="space-y-1">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[var(--text-primary)] truncate">{cat.name}</span>
                  <span className="font-mono text-[var(--text-secondary)]">
                    {formatMoney(cat.amount, currency)} · {Math.round(cat.percent)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, cat.percent)}%`,
                      backgroundColor: cat.color || 'var(--accent-solid)'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </LayerCard>
      )}

      {/* 8. Local Insights & Budget Alerts */}
      <LocalAdvisor data={data} formatMoney={formatMoney} />

      {budgetAlerts.length > 0 && (
        <BudgetAlerts budgetAlerts={budgetAlerts} data={data} formatMoney={formatMoney} />
      )}

      <SimulationModule isOpen={isSimOpen} onClose={() => setIsSimOpen(false)} data={data} />
    </div>
  );
};
