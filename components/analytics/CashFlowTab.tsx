import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import {
  Calendar,
  Clock,
  ChartBar as BarChart3,
  Pulse as Activity,
  ArrowUpRight,
  ArrowDownRight
} from '@phosphor-icons/react';
import { Transaction, TransactionType } from '../../types';

interface CashFlowTabProps {
  transactions: Transaction[];
  formatMoney: (val: number, sym: string) => string;
  currencySymbol: string;
  privacyMode: boolean;
  timeframe: string;
}

export const CashFlowTab: React.FC<CashFlowTabProps> = ({
  transactions,
  formatMoney,
  currencySymbol,
  privacyMode,
  timeframe,
}) => {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Group transactions by date for time-series charts
  const { chartData, cumulativeData, peakDay, peakExpenseDay, heatmapMatrix } = useMemo(() => {
    const dateMap: Record<string, { date: string; income: number; expense: number; net: number }> = {};
    
    // Sort transactions chronologically
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sorted.forEach((t) => {
      const d = t.date.split('T')[0];
      if (!dateMap[d]) {
        dateMap[d] = { date: d, income: 0, expense: 0, net: 0 };
      }
      if (t.type === TransactionType.INCOME) {
        dateMap[d].income += t.amount;
      } else if (t.type === TransactionType.EXPENSE) {
        dateMap[d].expense += t.amount;
      }
      dateMap[d].net = dateMap[d].income - dateMap[d].expense;
    });

    const entries = Object.values(dateMap);
    
    // If few entries, fill missing dates if needed, or format dates
    const formattedChartData = entries.map((item) => {
      const dateObj = new Date(item.date);
      const label = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return {
        ...item,
        label,
      };
    });

    // Cumulative net flow
    let runningNet = 0;
    const cumData = formattedChartData.map((d) => {
      runningNet += d.net;
      return {
        date: d.date,
        label: d.label,
        cumulativeNet: runningNet,
        income: d.income,
        expense: d.expense,
      };
    });

    // Peak stats
    let maxInc = 0;
    let maxIncDate = '—';
    let maxExp = 0;
    let maxExpDate = '—';
    formattedChartData.forEach((d) => {
      if (d.income > maxInc) {
        maxInc = d.income;
        maxIncDate = d.label;
      }
      if (d.expense > maxExp) {
        maxExp = d.expense;
        maxExpDate = d.label;
      }
    });

    // Heatmap: 7 days x 8 time blocks (every 3 hours)
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const timeBlocks = [0, 3, 6, 9, 12, 15, 18, 21];
    const map: Record<string, number> = {};
    const amountMap: Record<string, number> = {};

    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      const dayIndex = d.getDay();
      const hour = d.getHours();
      const block = Math.floor(hour / 3) * 3;
      const key = `${days[dayIndex]}-${block}`;
      map[key] = (map[key] || 0) + 1;
      if (tx.type === TransactionType.EXPENSE) {
        amountMap[key] = (amountMap[key] || 0) + tx.amount;
      }
    });

    const maxCount = Math.max(...Object.values(map), 1);
    
    return {
      chartData: formattedChartData,
      cumulativeData: cumData,
      peakDay: { date: maxIncDate, amount: maxInc },
      peakExpenseDay: { date: maxExpDate, amount: maxExp },
      heatmapMatrix: { days, timeBlocks, map, amountMap, maxCount },
    };
  }, [transactions]);

  const displayMoney = (val: number) => {
    if (privacyMode) return '••••';
    return formatMoney(val, currencySymbol);
  };

  return (
    <div className="space-y-6">
      {/* 1. Main Inflow vs Outflow Visualizer */}
      <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Cash Flow Trajectory
              </span>
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                {chartData.length} active data points
              </span>
            </div>
            <h2 className="text-base font-medium text-[var(--text-primary)] mt-0.5">
              Inflow vs. Outflow Spread
            </h2>
          </div>

          {/* Chart View Toggle: Area vs Bar */}
          <div className="flex items-center gap-1 p-1 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 rounded-[4px] text-[11px] font-medium transition-colors ${
                chartType === 'area'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
              }`}
            >
              Smooth Area
            </button>
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 rounded-[4px] text-[11px] font-medium transition-colors ${
                chartType === 'bar'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
              }`}
            >
              Grouped Bars
            </button>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="h-[240px] lg:h-[280px] w-full mt-2">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[12px] text-[var(--text-muted)]">
              No transactions recorded for this timeframe.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 2" vertical={false} />
                  <XAxis 
                    dataKey="label" 
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
                    orientation="right"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-strong)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px'
                    }}
                    formatter={(val: any, name: any) => [
                      displayMoney(Number(val) || 0),
                      name === 'income' ? 'Inflow (Income)' : 'Outflow (Expense)',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    name="income"
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    fill="url(#incomeGrad)"
                    activeDot={{ r: 4, fill: '#22c55e' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="expense"
                    stroke="#ef4444"
                    strokeWidth={1.5}
                    fill="url(#expenseGrad)"
                    activeDot={{ r: 4, fill: '#ef4444' }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 2" vertical={false} />
                  <XAxis 
                    dataKey="label" 
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
                    orientation="right"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-strong)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      padding: '8px 12px'
                    }}
                    formatter={(val: any, name: any) => [
                      displayMoney(Number(val) || 0),
                      name === 'income' ? 'Inflow' : 'Outflow',
                    ]}
                  />
                  <Bar dataKey="income" name="income" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expense" name="expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* Peak Flow Highlights Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 mt-3 border-t border-[var(--border-default)]">
          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-2">
              <ArrowUpRight size={14} strokeWidth={1.5} className="text-[var(--status-success-fg)]" />
              <span className="text-[var(--text-secondary)]">Peak Inflow Day:</span>
            </div>
            <span className="font-mono text-[var(--text-primary)] font-medium">
              {peakDay.date} ({displayMoney(peakDay.amount)})
            </span>
          </div>

          <div className="flex items-center justify-between text-[12px]">
            <div className="flex items-center gap-2">
              <ArrowDownRight size={14} strokeWidth={1.5} className="text-[var(--status-error-fg)]" />
              <span className="text-[var(--text-secondary)]">Peak Outflow Day:</span>
            </div>
            <span className="font-mono text-[var(--text-primary)] font-medium">
              {peakExpenseDay.date} ({displayMoney(peakExpenseDay.amount)})
            </span>
          </div>
        </div>
      </div>

      {/* 2. Cumulative Net Cash Flow Velocity & 7x8 Spending Rhythm Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        {/* Cumulative Velocity Curve */}
        <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Net Velocity
              </span>
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">Cumulative</span>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              Cumulative Net Balance Accumulation
            </h3>
          </div>

          <div className="h-[180px] w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cumulativeData} margin={{ top: 10, right: 0, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="cumNetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 2" vertical={false} />
                <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} orientation="right" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-strong)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: 'var(--text-primary)',
                    padding: '6px 10px'
                  }}
                  formatter={(val: any) => [displayMoney(Number(val) || 0), 'Cumulative Net']}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeNet"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  fill="url(#cumNetGrad)"
                  activeDot={{ r: 4, fill: '#3b82f6' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border-default)]">
            Shows cumulative surplus or deficit accumulated through this timeframe.
          </div>
        </div>

        {/* 7x8 Spending Rhythm Heatmap */}
        <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Temporal Distribution
              </span>
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">7 Days × 24 Hours</span>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)]">
              Activity & Spending Rhythm Matrix
            </h3>
          </div>

          {/* Matrix Grid */}
          <div className="mt-3 space-y-1">
            {/* Header time block ticks */}
            <div className="grid grid-cols-9 gap-1 text-[9px] font-mono text-[var(--text-muted)] text-center">
              <div />
              {heatmapMatrix.timeBlocks.map((h) => (
                <div key={h}>{h.toString().padStart(2, '0')}h</div>
              ))}
            </div>

            {/* Days rows */}
            {heatmapMatrix.days.map((day) => (
              <div key={day} className="grid grid-cols-9 gap-1 items-center">
                <span className="text-[10px] font-medium text-[var(--text-muted)]">{day}</span>
                {heatmapMatrix.timeBlocks.map((h) => {
                  const key = `${day}-${h}`;
                  const count = heatmapMatrix.map[key] || 0;
                  const intensity = count / heatmapMatrix.maxCount;
                  
                  let cellBg = 'var(--bg-subtle)';
                  if (intensity > 0.66) {
                    cellBg = '#3b82f6';
                  } else if (intensity > 0.33) {
                    cellBg = 'rgba(59, 130, 246, 0.6)';
                  } else if (intensity > 0) {
                    cellBg = 'rgba(59, 130, 246, 0.25)';
                  }

                  return (
                    <div
                      key={key}
                      title={`${day} around ${h}:00 — ${count} transaction(s)`}
                      className="h-5 rounded-[4px] border border-[var(--border-default)]/40 transition-colors"
                      style={{ backgroundColor: cellBg }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mt-3 pt-2 border-t border-[var(--border-default)]">
            <span>Low frequency</span>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[var(--bg-subtle)] border border-[var(--border-default)]" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[rgba(59,130,246,0.25)]" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[rgba(59,130,246,0.6)]" />
              <span className="w-2.5 h-2.5 rounded-[2px] bg-[#3b82f6]" />
            </div>
            <span>High frequency</span>
          </div>
        </div>
      </div>
    </div>
  );
};
