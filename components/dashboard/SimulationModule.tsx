import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AppData, TransactionType } from '../../types';
import {
  X,
  Lightning,
  Warning as AlertTriangle,
  CheckCircle,
  TrendDown,
  TrendUp,
  Sliders,
  Calendar,
  CurrencyDollar,
  ArrowRight
} from '@phosphor-icons/react';
import { formatMoney } from '../../utils/formatters';
import { PredictiveEngine } from '../../services/PredictiveEngine';
import { Haptics } from '../../services/haptics';

interface SimulationModuleProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
}

type ScenarioType = 'EXPENSE' | 'INCOME' | 'RECURRING' | 'CUSTOM';

export const SimulationModule: React.FC<SimulationModuleProps> = ({
  isOpen,
  onClose,
  data
}) => {
  const [scenarioType, setScenarioType] = useState<ScenarioType>('EXPENSE');
  const [amount, setAmount] = useState<string>('500');
  const [note, setNote] = useState<string>('');
  const [timeHorizonMonths, setTimeHorizonMonths] = useState<number>(3);

  if (!isOpen) return null;

  const currency = data.settings.currencySymbol || '$';

  // Base metrics calculation
  const currentTotalIncome = data.transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);
  const currentTotalExpense = data.transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);
  const currentBalance = currentTotalIncome - currentTotalExpense;
  const currentRunway = PredictiveEngine.getRunwayDays(data, currentBalance);

  // Daily burn rate
  const past30DaysTxs = data.transactions.filter(t => {
    const diff = (Date.now() - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30 && t.type === TransactionType.EXPENSE;
  });
  const past30DaysSpend = past30DaysTxs.reduce((sum, t) => sum + t.amount, 0);
  const avgDailyBurn = past30DaysSpend > 0 ? past30DaysSpend / 30 : 50;

  // Simulation calculations
  const parsedAmount = Math.max(0, parseFloat(amount) || 0);

  let simBalance = currentBalance;
  let simulatedDailyBurn = avgDailyBurn;

  if (scenarioType === 'EXPENSE') {
    simBalance = currentBalance - parsedAmount;
  } else if (scenarioType === 'INCOME') {
    simBalance = currentBalance + parsedAmount;
  } else if (scenarioType === 'RECURRING') {
    // Recurring monthly bill
    simBalance = currentBalance - (parsedAmount * timeHorizonMonths);
    simulatedDailyBurn = avgDailyBurn + (parsedAmount / 30);
  } else {
    simBalance = currentBalance - parsedAmount;
  }

  const simRunway = Math.max(0, Math.round(simBalance / (simulatedDailyBurn || 1)));
  const runwayDelta = simRunway - currentRunway;
  const balanceDelta = simBalance - currentBalance;

  const isCritical = simRunway < 30;
  const isWarning = simRunway >= 30 && simRunway < 60;
  const isHealthy = simRunway >= 60;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal,600)] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Container: 8px outer radius, crisp 1px border, solid opaque surface */}
      <div className="relative w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col z-10 text-[var(--text-primary)]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <Lightning size={16} strokeWidth={1.5} className="text-[var(--accent)]" />
            <h2 className="text-[14px] font-medium text-[var(--text-primary)] tracking-tight">
              What-If Scenario Simulator
            </h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[6px] transition-colors cursor-pointer"
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh] no-scrollbar">
          
          {/* Scenario Type Selector Tabs */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)]">
              Scenario Type
            </label>
            <div className="grid grid-cols-3 gap-1.5 bg-[var(--bg-subtle)] p-1 rounded-[8px]">
              <button
                type="button"
                onClick={() => { Haptics.light(); setScenarioType('EXPENSE'); }}
                className={`py-1.5 px-2 text-[12px] font-medium rounded-[6px] transition-all cursor-pointer ${
                  scenarioType === 'EXPENSE'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                One-Off Expense
              </button>
              <button
                type="button"
                onClick={() => { Haptics.light(); setScenarioType('RECURRING'); }}
                className={`py-1.5 px-2 text-[12px] font-medium rounded-[6px] transition-all cursor-pointer ${
                  scenarioType === 'RECURRING'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Monthly Bill
              </button>
              <button
                type="button"
                onClick={() => { Haptics.light(); setScenarioType('INCOME'); }}
                className={`py-1.5 px-2 text-[12px] font-medium rounded-[6px] transition-all cursor-pointer ${
                  scenarioType === 'INCOME'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Added Income
              </button>
            </div>
          </div>

          {/* Amount Input & Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)]">
                Simulated Amount ({currency})
              </label>
              <span className="font-mono text-[12px] font-semibold text-[var(--text-primary)]">
                {formatMoney(parsedAmount, currency)}
              </span>
            </div>

            <div className="relative flex items-center">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[var(--field-bg)] border border-[var(--field-border)] focus:border-[var(--field-border-focus)] rounded-[6px] px-3.5 py-2 text-[15px] font-mono text-[var(--text-primary)] outline-none transition-colors"
              />
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-1.5 pt-1">
              {['100', '250', '500', '1000', '2500'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => { Haptics.light(); setAmount(val); }}
                  className={`px-2 py-1 text-[11px] font-mono rounded-[6px] border transition-colors cursor-pointer ${
                    amount === val
                      ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] border-[var(--accent-solid)] font-medium'
                      : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                  }`}
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Description / Note */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)]">
              Description / Hypothetical Purpose
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. New M4 Mac, car repair, vacation trip..."
              className="w-full bg-[var(--field-bg)] border border-[var(--field-border)] focus:border-[var(--field-border-focus)] rounded-[6px] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)]"
            />
          </div>

          {/* Projected Impact Cards (2-Grid) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Projected Balance */}
            <div className="p-3.5 rounded-[8px] bg-[var(--bg-subtle)]/50 border border-[var(--border-default)] space-y-1">
              <span className="text-[10px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)]">
                Projected Balance
              </span>
              <div className="text-[18px] font-semibold text-[var(--text-primary)] font-mono">
                {formatMoney(simBalance, currency)}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono">
                {balanceDelta >= 0 ? (
                  <span className="text-[var(--status-success-fg)]">+{formatMoney(balanceDelta, currency)}</span>
                ) : (
                  <span className="text-[var(--status-error-fg)]">{formatMoney(balanceDelta, currency)}</span>
                )}
              </div>
            </div>

            {/* Projected Runway */}
            <div className="p-3.5 rounded-[8px] bg-[var(--bg-subtle)]/50 border border-[var(--border-default)] space-y-1">
              <span className="text-[10px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)]">
                Projected Runway
              </span>
              <div className="text-[18px] font-semibold text-[var(--text-primary)] font-mono">
                {simRunway} Days
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono">
                {runwayDelta >= 0 ? (
                  <span className="text-[var(--status-success-fg)]">+{runwayDelta} days</span>
                ) : (
                  <span className="text-[var(--status-error-fg)]">{runwayDelta} days</span>
                )}
              </div>
            </div>
          </div>

          {/* Safety Verdict Card */}
          <div className={`p-3.5 rounded-[8px] border flex items-start gap-3 transition-all ${
            isCritical 
              ? 'bg-[var(--status-error-bg)] border-[var(--status-error-fg)]/30' 
              : isWarning
                ? 'bg-[var(--status-warning-bg)] border-[var(--status-warning-fg)]/30'
                : 'bg-[var(--status-success-bg)] border-[var(--status-success-fg)]/30'
          }`}>
            <div className="mt-0.5 shrink-0">
              {isCritical ? (
                <AlertTriangle size={16} className="text-[var(--status-error-fg)] stroke-[1.5px]" />
              ) : isWarning ? (
                <AlertTriangle size={16} className="text-[var(--status-warning-fg)] stroke-[1.5px]" />
              ) : (
                <CheckCircle size={16} className="text-[var(--status-success-fg)] stroke-[1.5px]" />
              )}
            </div>

            <div className="space-y-0.5">
              <div className="text-[12px] font-medium text-[var(--text-primary)]">
                {isCritical 
                  ? 'Critical Safety Warning' 
                  : isWarning 
                    ? 'Caution: Low Runway Reserve' 
                    : 'Safe Transaction Capacity'}
              </div>
              <p className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed">
                {isCritical 
                  ? `Executing this scenario reduces your runway to ${simRunway} days, breaching your 30-day emergency safety threshold.` 
                  : isWarning
                    ? `This scenario leaves you with ${simRunway} days of runway. Proceed only with planned provisions.`
                    : `Your balance maintains a comfortable ${simRunway}-day financial runway. No immediate risk detected.`}
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-[var(--border-default)] bg-[var(--bg-surface)]">
          <span className="text-[11px] text-[var(--text-muted)] italic">
            Simulations are real-time & non-destructive.
          </span>
          <button
            onClick={onClose}
            className="btn btn--secondary h-[30px] px-4 text-[12px] rounded-[6px] font-medium cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
