import React, { useState, useMemo, useCallback } from 'react';
import { AppData, Transaction, TransactionType } from '../types';
import { PredictiveEngine } from '../services/PredictiveEngine';
import { EmptyStateSeeder } from './shared/EmptyStateSeeder';
import { AnalyticsHeader } from './analytics/AnalyticsHeader';
import { BentoCashFlow } from './analytics/BentoCashFlow';
import { BentoMetrics } from './analytics/BentoMetrics';
import { BentoCategories } from './analytics/BentoCategories';
import { BentoRunwayTrajectory } from './analytics/BentoRunwayTrajectory';
import { BentoHeatmap } from './analytics/BentoHeatmap';
import { BentoCategoryTable } from './analytics/BentoCategoryTable';
import { BentoHealthAudit } from './analytics/BentoHealthAudit';
import { SimulationModule } from './dashboard/SimulationModule';
import { DateRange } from './shared/CloudflareDateRangePicker';
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
  const [isSimOpen, setIsSimOpen] = useState(false);

  const currencySymbol = data.settings.currencySymbol || '$';
  const privacyMode = Boolean(data.settings.privacyMode);

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

  // 2. Filter transactions by DateRange
  const { filteredTransactions, dateRangeText } = useMemo(() => {
    const startDate = dateRange.startDate;
    const endDate = dateRange.endDate ? new Date(new Date(dateRange.endDate).setHours(23, 59, 59, 999)) : new Date();

    const filtered = scopedTransactions.filter((t) => {
      if (!startDate) return true;
      const tDate = new Date(t.date);
      return tDate >= startDate && tDate <= endDate;
    });

    return {
      filteredTransactions: filtered,
      dateRangeText: dateRange.label,
    };
  }, [scopedTransactions, dateRange]);

  // 3. Compute Summary KPI Values
  const kpiData = useMemo(() => {
    const incomeTxs = filteredTransactions.filter((t) => t.type === TransactionType.INCOME);
    const expenseTxs = filteredTransactions.filter((t) => t.type === TransactionType.EXPENSE);

    const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenseTxs.reduce((sum, t) => sum + t.amount, 0);
    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    const uniqueDays = new Set(expenseTxs.map((t) => t.date.split('T')[0]));
    const dayCount = Math.max(uniqueDays.size, 1);
    const avgDailySpend = totalExpense / dayCount;

    const totalIOwe = data.debts
      .filter((d) => !d.isSettled && d.type === 'I_OWE')
      .reduce((sum, d) => sum + d.amount, 0);
    const totalOwesMe = data.debts
      .filter((d) => !d.isSettled && d.type === 'OWES_ME')
      .reduce((sum, d) => sum + d.amount, 0);

    const currentBalance = totalIncome - totalExpense > 0 ? totalIncome - totalExpense : 1000;
    const runwayDays = PredictiveEngine.getRunwayDays(data, currentBalance);

    return {
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      avgDailySpend,
      runwayDays,
      totalIOwe,
      totalOwesMe,
      currentBalance,
    };
  }, [filteredTransactions, data]);

  // 4. Export CSV Handler
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
    link.setAttribute('download', `trackxpense_analytics_${dateRange.presetKey || 'range'}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredTransactions, dateRange]);

  return (
    <div className="space-y-3.5 max-w-6xl mx-auto animate-in pb-16">
      {/* Header Toolbar */}
      <AnalyticsHeader
        dateRange={dateRange}
        setDateRange={(r) => { Haptics.light(); setDateRange(r); }}
        walletScope={walletScope}
        setWalletScope={(s) => { Haptics.light(); setWalletScope(s); }}
        wallets={data.wallets}
        totalFilteredCount={filteredTransactions.length}
        onExportReport={handleExportCSV}
        onOpenSimulator={() => setIsSimOpen(true)}
      />

      {/* Empty State Check */}
      {data.transactions.length === 0 ? (
        <EmptyStateSeeder
          data={data}
          updateData={updateData || (() => {})}
          title="No Analytics Data Available"
          description="Your transaction ledger is empty. Seed sample ledger entries to populate cash flow curves, category allocations, predictive runway trajectory, and health audits."
        />
      ) : (
        /* Bento Grid Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 lg:gap-3.5 items-stretch">
          {/* Row 1: Cash Flow Sparkline (8 cols) & Executive KPIs (4 cols) */}
          <div className="lg:col-span-8">
            <BentoCashFlow
              transactions={filteredTransactions}
              formatMoney={formatMoney}
              currencySymbol={currencySymbol}
              privacyMode={privacyMode}
            />
          </div>
          <div className="lg:col-span-4">
            <BentoMetrics
              totalIncome={kpiData.totalIncome}
              totalExpense={kpiData.totalExpense}
              netSavings={kpiData.netSavings}
              savingsRate={kpiData.savingsRate}
              avgDailySpend={kpiData.avgDailySpend}
              runwayDays={kpiData.runwayDays}
              totalIOwe={kpiData.totalIOwe}
              totalOwesMe={kpiData.totalOwesMe}
              formatMoney={formatMoney}
              currencySymbol={currencySymbol}
              privacyMode={privacyMode}
            />
          </div>

          {/* Row 2: Category Allocation (4 cols) + Runway Trajectory (4 cols) + Heatmap (4 cols) */}
          <div className="lg:col-span-4">
            <BentoCategories
              transactions={filteredTransactions}
              data={data}
              formatMoney={formatMoney}
              currencySymbol={currencySymbol}
              privacyMode={privacyMode}
            />
          </div>
          <div className="lg:col-span-4">
            <BentoRunwayTrajectory
              data={data}
              formatMoney={formatMoney}
              currencySymbol={currencySymbol}
              privacyMode={privacyMode}
              currentBalance={kpiData.currentBalance}
            />
          </div>
          <div className="lg:col-span-4">
            <BentoHeatmap transactions={filteredTransactions} />
          </div>

          {/* Row 3: Category Table & Unit Economics (7 cols) + Financial Health & Audit (5 cols) */}
          <div className="lg:col-span-7">
            <BentoCategoryTable
              transactions={filteredTransactions}
              data={data}
              formatMoney={formatMoney}
              currencySymbol={currencySymbol}
              privacyMode={privacyMode}
            />
          </div>
          <div className="lg:col-span-5">
            <BentoHealthAudit
              data={data}
              filteredTransactions={filteredTransactions}
              formatMoney={formatMoney}
              currencySymbol={currencySymbol}
              privacyMode={privacyMode}
            />
          </div>
        </div>
      )}

      {/* What-If Scenario Simulator Modal */}
      <SimulationModule isOpen={isSimOpen} onClose={() => setIsSimOpen(false)} data={data} />
    </div>
  );
};
