import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import {
  DotsThree,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ArrowClockwise,
  Sliders,
  Download,
  Calendar as CalendarIcon,
  CaretRight
} from '@phosphor-icons/react';
import { AppData, Transaction, TransactionType } from '../types';
import { PredictiveEngine } from '../services/PredictiveEngine';
import { CloudflareDateRangePicker, DateRange } from './shared/CloudflareDateRangePicker';
import { CustomSelect } from './shared/CustomSelect';
import { SimulationModule } from './dashboard/SimulationModule';
import { NoDataWave } from './shared/NoDataWave';
import { Haptics } from '../services/haptics';

interface AnalyticsProps {
  data: AppData;
  updateData?: (d: Partial<AppData>) => void;
  formatMoney: (val: number, sym: string) => string;
}

export const AnalyticsView: React.FC<AnalyticsProps> = ({ data, updateData, formatMoney }) => {
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

  const [walletScope, setWalletScope] = useState<string>(data.currentWalletId || 'ALL');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isSimOpen, setIsSimOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currencySymbol = data.settings.currencySymbol || '$';
  const privacyMode = Boolean(data.settings.privacyMode);

  // Close context menus on click outside
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Format compact numbers (e.g. 1.1k, 25k)
  const formatCompactK = (val: number) => {
    if (privacyMode) return '••••';
    if (val === 0) return '0';
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return Math.round(val).toString();
  };

  // 1. Filter transactions by Wallet Scope
  const scopedTransactions = useMemo(() => {
    if (walletScope === 'ALL') {
      return data.transactions.filter((t) => {
        if (privacyMode && t.isPrivate) return false;
        return true;
      });
    }
    return data.transactions.filter((t) => {
      if (privacyMode && t.isPrivate) return false;
      return t.walletId === walletScope;
    });
  }, [data.transactions, walletScope, privacyMode]);

  // 2. Filter transactions by DateRange & Compute Time Series Points
  const { filteredTransactions, chartPoints, previousTotalExpense, previousTotalIncome } = useMemo(() => {
    const startDate = dateRange.startDate || new Date(Date.now() - 30 * 86400000);
    const endDate = dateRange.endDate ? new Date(new Date(dateRange.endDate).setHours(23, 59, 59, 999)) : new Date();

    const filtered = scopedTransactions.filter((t) => {
      const tDate = new Date(t.date);
      return tDate >= startDate && tDate <= endDate;
    });

    // Calculate duration in days
    const diffDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const pointsCount = Math.min(diffDays, 40);

    const points: Array<{ name: string; spent: number; income: number }> = [];

    for (let i = 0; i < pointsCount; i++) {
      const curDate = new Date(startDate.getTime() + (i / Math.max(1, pointsCount - 1)) * (endDate.getTime() - startDate.getTime()));
      const dateStr = curDate.toISOString().split('T')[0];
      const label = diffDays <= 2 
        ? curDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
        : curDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const daySpend = filtered
        .filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + t.amount, 0);

      const dayIncome = filtered
        .filter(t => t.type === TransactionType.INCOME && t.date.startsWith(dateStr))
        .reduce((sum, t) => sum + t.amount, 0);

      points.push({ name: label, spent: daySpend, income: dayIncome });
    }

    // Previous period for trend calculation
    const prevStartDate = new Date(startDate.getTime() - diffDays * 86400000);
    const prevEndDate = new Date(startDate.getTime());
    const prevFiltered = scopedTransactions.filter((t) => {
      const tDate = new Date(t.date);
      return tDate >= prevStartDate && tDate < prevEndDate;
    });

    const prevExp = prevFiltered
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((sum, t) => sum + t.amount, 0);

    const prevInc = prevFiltered
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      filteredTransactions: filtered,
      chartPoints: points,
      previousTotalExpense: prevExp,
      previousTotalIncome: prevInc
    };
  }, [scopedTransactions, dateRange]);

  // 3. Compute Card Metrics
  const metrics = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE);
    const incomes = filteredTransactions.filter(t => t.type === TransactionType.INCOME);

    const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
    const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);

    // Spend Trend
    let spendTrend: number | null = null;
    if (previousTotalExpense > 0) {
      spendTrend = Math.round(((totalExpense - previousTotalExpense) / previousTotalExpense) * 100);
    } else if (totalExpense > 0) {
      spendTrend = 100;
    }

    // Active Liabilities
    const totalLiabilities = (data.debts || [])
      .filter(d => !d.isSettled && d.type === 'I_OWE')
      .reduce((sum, d) => {
        const paid = (d.payments || []).reduce((s, p) => s + p.amount, 0);
        return sum + Math.max(0, d.amount - paid);
      }, 0);

    // Savings Rate
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, (netSavings / totalIncome) * 100) : 0;

    // Daily Burn
    const uniqueDays = new Set(expenses.map(t => t.date.split('T')[0]));
    const avgDailyBurn = uniqueDays.size > 0 ? (totalExpense / uniqueDays.size) : 0;

    // Runway
    const currentBalance = totalIncome - totalExpense;
    const runwayDays = PredictiveEngine.getRunwayDays(data, currentBalance);

    return {
      totalExpense,
      totalIncome,
      spendTrend,
      totalLiabilities,
      savingsRate,
      avgDailyBurn,
      runwayDays,
      hasExpenseData: totalExpense > 0 && chartPoints.some(p => p.spent > 0),
      hasIncomeData: totalIncome > 0 && chartPoints.some(p => p.income > 0),
      hasLiabilityData: totalLiabilities > 0,
      hasSavingsData: savingsRate > 0,
      hasBurnData: avgDailyBurn > 0,
      hasRunwayData: isFinite(runwayDays) && runwayDays > 0
    };
  }, [filteredTransactions, data, previousTotalExpense, chartPoints]);

  // Export CSV Handler
  const handleExportCSV = useCallback(() => {
    Haptics.light();
    const headers = ['Date', 'Type', 'Category', 'Amount', 'WalletId', 'Note'];
    const rows = filteredTransactions.map((t) => [
      t.date,
      t.type,
      `"${t.category || ''}"`,
      t.amount,
      t.walletId,
      `"${(t.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `trackxpense_analytics_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredTransactions]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div ref={menuRef} className="space-y-4 max-w-6xl mx-auto pb-16 animate-in fade-in duration-300 select-none">
      
      {/* ========================================================================= */}
      {/* HEADER: 'Analytics' on left, Cloudflare Controls on right                 */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <h1 className="text-[20px] font-semibold text-[var(--text-primary)] tracking-tight">
          Analytics
        </h1>

        <div className="flex items-center gap-2">
          {/* Cloudflare-Style Date Range Picker with [ 📅 Last 24h ] [ + ] [ 🔄 ] */}
          <CloudflareDateRangePicker
            value={dateRange}
            onChange={(r) => { Haptics.light(); setDateRange(r); }}
            onRefresh={handleRefresh}
          />

          {/* Wallet Scope Selector */}
          {data.wallets.length > 1 && (
            <CustomSelect
              value={walletScope}
              onChange={(val) => { Haptics.light(); setWalletScope(val); }}
              options={[
                { value: 'ALL', label: 'All Wallets' },
                ...data.wallets.map((w) => ({ value: w.id, label: w.name }))
              ]}
              size="sm"
            />
          )}

          {/* Export Report */}
          <button
            type="button"
            onClick={handleExportCSV}
            title="Export CSV"
            className="w-8 h-8 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-active)] hover:bg-[var(--bg-surface-hover)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <Download size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 1: 2 Columns (50% / 50%)                                              */}
      {/* Card 1: Total Spend with Blue Peak Chart (or No Data Wave)                 */}
      {/* Card 2: Total Income with Active Curve (or No Data Wave)                   */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-3.5">
        
        {/* 1. Total Requests / Total Spend */}
        <div className="rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 sm:p-5 flex flex-col justify-between transition-colors h-[230px]">
          <div>
            <div className="flex items-center justify-between text-[12.5px] text-[var(--text-secondary)] font-normal mb-1">
              <span>Total spend</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveMenu(activeMenu === 'spend' ? null : 'spend')}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[4px] transition-colors cursor-pointer"
                  title="Options"
                >
                  <DotsThree size={16} weight="bold" />
                </button>
                {activeMenu === 'spend' && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-[#16161A] border border-[var(--border-default)] rounded-[6px] shadow-2xl py-1 z-50 text-[12px]">
                    <button onClick={handleExportCSV} className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)]">
                      Export dataset
                    </button>
                    <button onClick={() => setIsSimOpen(true)} className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)]">
                      Simulate scenario
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Readout + Trend badge */}
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl sm:text-[28px] font-semibold text-[var(--text-primary)] font-mono tracking-tight">
                {formatCompactK(metrics.totalExpense)}
              </span>
              {metrics.spendTrend !== null && (
                <span className={`inline-flex items-center text-[12px] font-medium font-mono ${
                  metrics.spendTrend > 0 ? 'text-emerald-400' : 'text-sky-400'
                }`}>
                  <ArrowUpRight size={13} strokeWidth={2} className="mr-0.5" />
                  {metrics.spendTrend > 0 ? `${metrics.spendTrend}%` : '0%'}
                </span>
              )}
            </div>
          </div>

          {/* Chart Area */}
          <div className="h-[140px] w-full">
            {metrics.hasExpenseData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cfOrangeSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F6821F" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#F6821F" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
                  <XAxis dataKey="name" hide />
                  <YAxis 
                    orientation="right" 
                    tickLine={false} 
                    axisLine={false} 
                    tickCount={5}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--ds-font-mono)' }} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#121216', borderColor: '#24242C', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(val: any) => [formatMoney(val, currencySymbol), 'Spend']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="spent" 
                    stroke="#F6821F" 
                    strokeWidth={2} 
                    fill="url(#cfOrangeSpend)" 
                    activeDot={{ r: 4, fill: '#F6821F', stroke: 'var(--bg-surface)', strokeWidth: 2 }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <NoDataWave height={140} />
            )}
          </div>
        </div>

        {/* 2. Worker Invocations / Total Income */}
        <div className="rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 sm:p-5 flex flex-col justify-between transition-colors h-[230px]">
          <div>
            <div className="flex items-center justify-between text-[12.5px] text-[var(--text-secondary)] font-normal mb-1">
              <span>Total income</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActiveMenu(activeMenu === 'income' ? null : 'income')}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[4px] transition-colors cursor-pointer"
                  title="Options"
                >
                  <DotsThree size={16} weight="bold" />
                </button>
                {activeMenu === 'income' && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-[#16161A] border border-[var(--border-default)] rounded-[6px] shadow-2xl py-1 z-50 text-[12px]">
                    <button onClick={handleExportCSV} className="w-full text-left px-3 py-1.5 hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)]">
                      Export dataset
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Readout */}
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl sm:text-[28px] font-semibold text-[var(--text-primary)] font-mono tracking-tight">
                {formatCompactK(metrics.totalIncome)}
              </span>
            </div>
          </div>

          {/* Chart Area */}
          <div className="h-[140px] w-full">
            {metrics.hasIncomeData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints} margin={{ top: 8, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cfGreenIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
                  <XAxis dataKey="name" hide />
                  <YAxis 
                    orientation="right" 
                    tickLine={false} 
                    axisLine={false} 
                    tickCount={5}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--ds-font-mono)' }} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#121216', borderColor: '#24242C', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(val: any) => [formatMoney(val, currencySymbol), 'Income']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="income" 
                    stroke="#22c55e" 
                    strokeWidth={2} 
                    fill="url(#cfGreenIncome)" 
                    activeDot={{ r: 4, fill: '#22c55e', stroke: 'var(--bg-surface)', strokeWidth: 2 }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <NoDataWave height={140} />
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* ROW 2: 4 Columns (25% / 25% / 25% / 25%)                                  */}
      {/* Card 1: Workers Errors / Active Liabilities                                */}
      {/* Card 2: Cache Hit Rate / Savings Rate                                      */}
      {/* Card 3: CPU Time P90 / Daily Burn Rate                                     */}
      {/* Card 4: Build Minutes / Runway Trajectory                                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        
        {/* 1. Workers errors / Active liabilities */}
        <div className="rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 sm:p-5 flex flex-col justify-between transition-colors h-[200px]">
          <div>
            <div className="flex items-center justify-between text-[12.5px] text-[var(--text-secondary)] font-normal mb-1">
              <span>Active liabilities</span>
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'liab' ? null : 'liab')}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[4px] transition-colors cursor-pointer"
                title="Options"
              >
                <DotsThree size={16} weight="bold" />
              </button>
            </div>
            <div className="text-2xl sm:text-[28px] font-semibold text-[var(--text-primary)] font-mono tracking-tight mb-2">
              {formatCompactK(metrics.totalLiabilities)}
            </div>
          </div>

          <div className="h-[105px] w-full">
            {metrics.hasLiabilityData ? (
              <div className="h-full flex flex-col justify-end">
                <div className="text-[12px] text-[var(--status-warning-fg)] mb-2 font-mono">
                  {formatMoney(metrics.totalLiabilities, currencySymbol)} unsettled
                </div>
                <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--status-warning-fg)] rounded-full w-3/4" />
                </div>
              </div>
            ) : (
              <NoDataWave height={105} />
            )}
          </div>
        </div>

        {/* 2. Cache hit rate / Savings rate */}
        <div className="rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 sm:p-5 flex flex-col justify-between transition-colors h-[200px]">
          <div>
            <div className="flex items-center justify-between text-[12.5px] text-[var(--text-secondary)] font-normal mb-1">
              <span>Savings rate</span>
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'savings' ? null : 'savings')}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[4px] transition-colors cursor-pointer"
                title="Options"
              >
                <DotsThree size={16} weight="bold" />
              </button>
            </div>
            <div className="text-2xl sm:text-[28px] font-semibold text-[var(--text-primary)] font-mono tracking-tight mb-2">
              {metrics.savingsRate.toFixed(2)}%
            </div>
          </div>

          <div className="h-[105px] w-full">
            {metrics.hasSavingsData ? (
              <div className="h-full flex flex-col justify-end">
                <div className="text-[12px] text-[var(--status-success-fg)] mb-2 font-mono">
                  {metrics.savingsRate.toFixed(1)}% of income saved
                </div>
                <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--status-success-fg)] rounded-full" 
                    style={{ width: `${Math.min(100, metrics.savingsRate)}%` }} 
                  />
                </div>
              </div>
            ) : (
              <NoDataWave height={105} />
            )}
          </div>
        </div>

        {/* 3. CPU time P90 / Daily burn rate */}
        <div className="rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 sm:p-5 flex flex-col justify-between transition-colors h-[200px]">
          <div>
            <div className="flex items-center justify-between text-[12.5px] text-[var(--text-secondary)] font-normal mb-1">
              <span>Daily burn rate</span>
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'burn' ? null : 'burn')}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[4px] transition-colors cursor-pointer"
                title="Options"
              >
                <DotsThree size={16} weight="bold" />
              </button>
            </div>
            <div className="text-2xl sm:text-[28px] font-semibold text-[var(--text-primary)] font-mono tracking-tight mb-2">
              {metrics.avgDailyBurn > 0 ? formatCompactK(metrics.avgDailyBurn) : '0'}
            </div>
          </div>

          <div className="h-[105px] w-full">
            {metrics.hasBurnData ? (
              <div className="h-full flex flex-col justify-end">
                <div className="text-[12px] text-[var(--text-secondary)] mb-2 font-mono">
                  {formatMoney(metrics.avgDailyBurn, currencySymbol)} / day
                </div>
                <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                  <div className="h-full bg-sky-400 rounded-full w-2/3" />
                </div>
              </div>
            ) : (
              <NoDataWave height={105} />
            )}
          </div>
        </div>

        {/* 4. Build minutes / Runway trajectory */}
        <div className="rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 sm:p-5 flex flex-col justify-between transition-colors h-[200px]">
          <div>
            <div className="flex items-center justify-between text-[12.5px] text-[var(--text-secondary)] font-normal mb-1">
              <span>Runway trajectory</span>
              <button
                type="button"
                onClick={() => setActiveMenu(activeMenu === 'runway' ? null : 'runway')}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[4px] transition-colors cursor-pointer"
                title="Options"
              >
                <DotsThree size={16} weight="bold" />
              </button>
            </div>
            <div className="text-2xl sm:text-[28px] font-semibold text-[var(--text-primary)] font-mono tracking-tight mb-2">
              {metrics.hasRunwayData ? (metrics.runwayDays >= 365 ? '365+' : `${metrics.runwayDays}`) : '0'}
            </div>
          </div>

          <div className="h-[105px] w-full">
            {metrics.hasRunwayData ? (
              <div className="h-full flex flex-col justify-end">
                <div className="text-[12px] text-[var(--text-secondary)] mb-2 font-mono">
                  {metrics.runwayDays} days capital buffer
                </div>
                <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-400 rounded-full" 
                    style={{ width: `${Math.min(100, (metrics.runwayDays / 90) * 100)}%` }} 
                  />
                </div>
              </div>
            ) : (
              <NoDataWave height={105} />
            )}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* LOWER DETAILED DECK: Category Allocation & Transaction Activity           */}
      {/* ========================================================================= */}
      <div className="pt-2 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-3.5 items-start">
        
        {/* Category Breakdown (7 cols) */}
        <div className="lg:col-span-7 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12.5px] font-medium text-[var(--text-primary)]">
              Category Distribution
            </span>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              {data.categories.length} categories
            </span>
          </div>

          {filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).length > 0 ? (
            <div className="space-y-3">
              {data.categories.map(cat => {
                const amount = filteredTransactions
                  .filter(t => t.category === cat.name && t.type === TransactionType.EXPENSE)
                  .reduce((sum, t) => sum + t.amount, 0);
                if (amount <= 0) return null;
                const percent = metrics.totalExpense > 0 ? (amount / metrics.totalExpense) * 100 : 0;
                return (
                  <div key={cat.id || cat.name} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[12px]">
                      <span className="font-medium text-[var(--text-primary)] truncate">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[var(--text-secondary)]">{formatMoney(amount, currencySymbol)}</span>
                        <span className="text-[11px] font-mono text-[var(--text-muted)] w-8 text-right">{Math.round(percent)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-700 bg-[var(--accent-solid)]"
                        style={{ width: `${Math.min(100, percent)}%`, backgroundColor: cat.color || 'var(--accent-solid)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <NoDataWave height={100} />
          )}
        </div>

        {/* Ledger Activity (5 cols) */}
        <div className="lg:col-span-5 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12.5px] font-medium text-[var(--text-primary)]">
              Recent Transactions
            </span>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              {filteredTransactions.length} total
            </span>
          </div>

          {filteredTransactions.length > 0 ? (
            <div className="divide-y divide-[var(--border-default)] max-h-[220px] overflow-y-auto no-scrollbar">
              {filteredTransactions.slice(0, 5).map(tx => (
                <div key={tx.id} className="py-2.5 flex items-center justify-between text-[12.5px]">
                  <div className="min-w-0 pr-2">
                    <div className="font-medium text-[var(--text-primary)] truncate">
                      {tx.note || tx.category || 'Transaction'}
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] font-mono">
                      {tx.date.split('T')[0]} • {tx.category}
                    </div>
                  </div>
                  <span className={`font-mono font-medium shrink-0 ${
                    tx.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-[var(--text-primary)]'
                  }`}>
                    {tx.type === TransactionType.INCOME ? '+' : '-'}{formatMoney(tx.amount, currencySymbol)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <NoDataWave height={100} />
          )}
        </div>

      </div>

      {/* What-If Scenario Simulator Modal */}
      <SimulationModule isOpen={isSimOpen} onClose={() => setIsSimOpen(false)} data={data} />
    </div>
  );
};
