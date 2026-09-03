import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  WarningCircle as AlertCircle,
  TrendUp as TrendingUp,
  Calendar,
  Repeat,
  Sliders,
  ShieldWarning as ShieldAlert,
  Sparkle as Sparkles,
  CheckCircle as CheckCircle2
} from '@phosphor-icons/react';
import { AppData, Transaction, TransactionType } from '../../types';
import { PredictiveEngine } from '../../services/PredictiveEngine';

interface PredictiveTabProps {
  data: AppData;
  formatMoney: (val: number, sym: string) => string;
  currencySymbol: string;
  privacyMode: boolean;
  currentBalance: number;
}

export const PredictiveTab: React.FC<PredictiveTabProps> = ({
  data,
  formatMoney,
  currencySymbol,
  privacyMode,
  currentBalance,
}) => {
  const [inflationRate, setInflationRate] = useState<number>(6); // 6% default

  // 1. Anomalies detection
  const anomalies = useMemo(() => PredictiveEngine.detectAnomalies(data), [data]);

  // 2. Payday and subscription cycles
  const paydayCycle = useMemo(() => PredictiveEngine.detectPaydayCycles(data), [data]);
  const detectedBills = useMemo(() => PredictiveEngine.detectBillCycles(data), [data]);

  // 3. 30-Day Net Worth / Balance Trajectory
  const trajectoryData = useMemo(() => {
    const expenses = data.transactions.filter((t) => t.type === TransactionType.EXPENSE);
    const uniqueDays = new Set(expenses.map((t) => t.date.split('T')[0]));
    const totalSpent = expenses.reduce((s, t) => s + t.amount, 0);
    const avgDailyBurn = totalSpent / Math.max(uniqueDays.size, 1);

    return [...Array(30)].map((_, i) => {
      const projected = Math.max(0, currentBalance - avgDailyBurn * (i + 1));
      return {
        day: `Day ${i + 1}`,
        balance: projected,
        burn: avgDailyBurn * (i + 1),
      };
    });
  }, [data.transactions, currentBalance]);

  // 4. Annualized spending & inflation calculation
  const totalYearlySpending = useMemo(() => {
    const expenses = data.transactions.filter((t) => t.type === TransactionType.EXPENSE);
    if (expenses.length === 0) return 0;
    const days = new Set(expenses.map((t) => t.date.split('T')[0]));
    const total = expenses.reduce((s, t) => s + t.amount, 0);
    const dailyAvg = total / Math.max(days.size, 1);
    return dailyAvg * 365;
  }, [data.transactions]);

  const annualInflationCost = (totalYearlySpending * inflationRate) / 100;
  const monthlyInflationCost = annualInflationCost / 12;

  const displayMoney = (val: number) => {
    if (privacyMode) return '••••';
    return formatMoney(val, currencySymbol);
  };

  return (
    <div className="space-y-6">
      {/* 1. Anomaly Radar Alert Banner (if any) */}
      {anomalies.length > 0 && (
        <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--status-error-fg)]/40 p-4 lg:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert size={16} strokeWidth={1.5} className="text-[var(--status-error-fg)]" />
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                Unusual Spending Anomalies Detected
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[var(--status-error-fg)] bg-[var(--status-error-bg)] px-2 py-0.5 rounded-[4px]">
              {anomalies.length} Flagged
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {anomalies.map((tx) => (
              <div
                key={tx.id}
                className="p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">{tx.category}</span>
                    <span className="text-[10px] text-[var(--status-error-fg)] font-mono font-medium">1.5x+ avg</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    {tx.note || 'Single high-ticket outflow'} • {new Date(tx.date).toLocaleDateString()}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold text-[var(--status-error-fg)]">
                  {displayMoney(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. 30-Day Balance & Runway Forecast Chart */}
      <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Predictive Forecasting
              </span>
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">Moving Average Burn</span>
            </div>
            <h3 className="text-base font-medium text-[var(--text-primary)] mt-0.5">
              30-Day Balance Depletion Trajectory
            </h3>
          </div>
          <div className="text-right text-[12px]">
            <span className="text-[var(--text-muted)]">Current Liquidity: </span>
            <span className="font-mono font-medium text-[var(--text-primary)]">{displayMoney(currentBalance)}</span>
          </div>
        </div>

        <div className="h-[220px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trajectoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="trajGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 2" vertical={false} />
              <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} interval={4} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} orientation="right" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-strong)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  padding: '6px 10px',
                }}
                formatter={(val: any) => [displayMoney(Number(val) || 0), 'Projected Balance']}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#3b82f6"
                strokeWidth={1.5}
                fill="url(#trajGrad)"
                activeDot={{ r: 4, fill: '#3b82f6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] text-[var(--text-secondary)] pt-3 mt-3 border-t border-[var(--border-default)]">
          <span>Simulation assumes zero future income and constant historical daily burn.</span>
          <span className="font-mono text-[var(--text-primary)]">
            Day 30 Projected: {displayMoney(trajectoryData[29]?.balance || 0)}
          </span>
        </div>
      </div>

      {/* 3. Recurring Pattern Recognition & Inflation Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
        {/* Recurring Pattern Recognition */}
        <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Cycle Intelligence
              </span>
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">Pattern Heuristics</span>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
              Automated Financial Cycles
            </h3>

            <div className="space-y-3">
              {/* Payday Cycle */}
              <div className="p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-start gap-3">
                <Calendar size={16} strokeWidth={1.5} className="text-[#22c55e] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-[var(--text-primary)]">Payday Cadence</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[4px] bg-[var(--status-success-bg)] text-[var(--status-success-fg)]">
                      {paydayCycle ? `${paydayCycle.confidence} Confidence` : 'Pending Data'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                    {paydayCycle
                      ? `Detected recurring income inflow clustering around day ${paydayCycle.day} of every month.`
                      : 'Requires at least 3 historical income credits to detect regular paydays.'}
                  </p>
                </div>
              </div>

              {/* Detected Recurring Bills / Subscriptions */}
              <div className="p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-start gap-3">
                <Repeat size={16} strokeWidth={1.5} className="text-[#3b82f6] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="font-medium text-[var(--text-primary)]">Subscription Candidates</span>
                    <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                      {detectedBills.length} found
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                    {detectedBills.length > 0
                      ? `Detected recurring outflow patterns in ${detectedBills.join(', ')}. Convert to automated subscriptions.`
                      : 'No fixed identical periodic bills detected yet.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[var(--text-muted)] pt-3 mt-3 border-t border-[var(--border-default)]">
            Algorithmic pattern engine runs locally in-browser without sending private data to servers.
          </div>
        </div>

        {/* Inflation & Lifestyle Creep Simulator */}
        <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                Stress Testing
              </span>
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">Purchasing Power</span>
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
              Inflation & Cost-of-Living Stress Test
            </h3>

            {/* Slider Control */}
            <div className="space-y-2 p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--text-secondary)]">Simulated Annual Inflation Rate:</span>
                <span className="font-mono font-medium text-[var(--text-primary)]">{inflationRate}%</span>
              </div>
              <input
                type="range"
                min={1}
                max={15}
                step={0.5}
                value={inflationRate}
                onChange={(e) => setInflationRate(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-[var(--border-default)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-solid)]"
              />
              <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)]">
                <span>1% (Low)</span>
                <span>6% (Standard)</span>
                <span>15% (High)</span>
              </div>
            </div>

            {/* Impact Calculation */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
                <span className="text-[10px] font-medium uppercase text-[var(--text-muted)] block">Monthly Drag</span>
                <span className="text-base font-mono font-medium text-[var(--status-warning-fg)] block mt-1">
                  +{displayMoney(monthlyInflationCost)}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">extra required / mo</span>
              </div>

              <div className="p-3 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
                <span className="text-[10px] font-medium uppercase text-[var(--text-muted)] block">Annual Surcharge</span>
                <span className="text-base font-mono font-medium text-[var(--status-warning-fg)] block mt-1">
                  +{displayMoney(annualInflationCost)}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">lifestyle maintenance</span>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[var(--text-secondary)] pt-3 mt-3 border-t border-[var(--border-default)]">
            To maintain current lifestyle under {inflationRate}% inflation, target increasing savings velocity by {inflationRate}%.
          </div>
        </div>
      </div>
    </div>
  );
};
