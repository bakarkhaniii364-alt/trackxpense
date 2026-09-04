import React, { useState, useMemo } from 'react';
import { CaretLeft, CaretRight, ArrowUpRight, ArrowDownRight } from '@phosphor-icons/react';
import { Transaction, TransactionType } from '../../types';

interface CalendarViewProps {
  transactions: Transaction[];
  onSelectDate?: (date: string) => void;
  currencySymbol?: string;
  formatMoney?: (val: number, sym: string) => string;
}

interface DayStats {
  dateStr: string;
  day: number;
  isCurrentMonth: boolean;
  income: number;
  expense: number;
  net: number;
  count: number;
  isBigIncome: boolean;
  isBigExpense: boolean;
  intensityLevel: number; // -4 to +4 (negative = expense, positive = income, 0 = none)
}

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  transactions = [], 
  onSelectDate,
  currencySymbol = '$',
  formatMoney = (val, sym) => `${sym}${val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [hoveredDay, setHoveredDay] = useState<DayStats | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const jumpToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(todayStr);
    onSelectDate?.(todayStr);
  };

  // Group transactions by day
  const txByDay = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      if (!t.date) continue;
      const dayKey = t.date.split('T')[0];
      const arr = map.get(dayKey) || [];
      arr.push(t);
      map.set(dayKey, arr);
    }
    return map;
  }, [transactions]);

  // Compute month days and find max thresholds for heatmap normalization
  const { calendarGrid, monthTotals, maxDayIncome, maxDayExpense } = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const prevMonthDaysCount = new Date(year, month, 0).getDate();

    let maxInc = 0;
    let maxExp = 0;
    let totalInc = 0;
    let totalExp = 0;

    // First pass: find maximums
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const txs = txByDay.get(dateKey) || [];
      let inc = 0;
      let exp = 0;
      for (const t of txs) {
        if (t.type === TransactionType.INCOME) inc += t.amount;
        else exp += t.amount;
      }
      if (inc > maxInc) maxInc = inc;
      if (exp > maxExp) maxExp = exp;
      totalInc += inc;
      totalExp += exp;
    }

    // Significant outlier / "Big" threshold (e.g., top 65% of max or over $500)
    const bigIncThreshold = Math.max(maxInc * 0.6, 500);
    const bigExpThreshold = Math.max(maxExp * 0.6, 300);

    const grid: DayStats[] = [];

    // Leading days from prev month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDaysCount - i;
      const prevDate = new Date(year, month - 1, d);
      const dateKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      grid.push({
        dateStr: dateKey,
        day: d,
        isCurrentMonth: false,
        income: 0,
        expense: 0,
        net: 0,
        count: 0,
        isBigIncome: false,
        isBigExpense: false,
        intensityLevel: 0
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const txs = txByDay.get(dateKey) || [];
      let inc = 0;
      let exp = 0;
      for (const t of txs) {
        if (t.type === TransactionType.INCOME) inc += t.amount;
        else exp += t.amount;
      }

      const net = inc - exp;
      let level = 0;

      if (inc > 0 && inc >= exp) {
        const ratio = maxInc > 0 ? inc / maxInc : 0;
        if (ratio > 0.75) level = 4;
        else if (ratio > 0.45) level = 3;
        else if (ratio > 0.2) level = 2;
        else level = 1;
      } else if (exp > 0) {
        const ratio = maxExp > 0 ? exp / maxExp : 0;
        if (ratio > 0.75) level = -4;
        else if (ratio > 0.45) level = -3;
        else if (ratio > 0.2) level = -2;
        else level = -1;
      }

      grid.push({
        dateStr: dateKey,
        day: d,
        isCurrentMonth: true,
        income: inc,
        expense: exp,
        net,
        count: txs.length,
        isBigIncome: inc >= bigIncThreshold && inc > 0,
        isBigExpense: exp >= bigExpThreshold && exp > 0,
        intensityLevel: level
      });
    }

    return {
      calendarGrid: grid,
      monthTotals: { income: totalInc, expense: totalExp, net: totalInc - totalExp },
      maxDayIncome: maxInc,
      maxDayExpense: maxExp
    };
  }, [year, month, txByDay]);

  // Format compact amount: 57000 -> "+57k" or "-420"
  const formatCompact = (val: number, isInc: boolean) => {
    const sign = isInc ? '+' : '-';
    if (val >= 1000000) return `${sign}${(val / 1000000).toFixed(1)}m`;
    if (val >= 1000) return `${sign}${(val / 1000).toFixed(0)}k`;
    return `${sign}${Math.round(val)}`;
  };

  const activeStats = hoveredDay || calendarGrid.find(g => g.dateStr === selectedDate) || null;

  return (
    <div className="select-none bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] animate-in fade-in duration-150">
      
      {/* Calendar Header Toolbar: Month Navigation & Live Heatmap Readout */}
      <div className="px-3.5 py-2.5 border-b border-[var(--border-default)] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Previous month"
            className="w-6 h-6 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] inline-flex items-center justify-center transition-colors cursor-pointer"
          >
            <CaretLeft size={14} strokeWidth={1.5} />
          </button>
          <span className="text-[13px] font-medium text-[var(--text-primary)] font-mono">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next month"
            className="w-6 h-6 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] inline-flex items-center justify-center transition-colors cursor-pointer"
          >
            <CaretRight size={14} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={jumpToday}
            className="text-[10.5px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1.5 py-0.5 rounded-[4px] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer ml-1"
          >
            Today
          </button>
        </div>

        {/* Live Day / Month Cashflow Readout */}
        <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
          {activeStats && activeStats.count > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-secondary)] font-medium">
                {new Date(activeStats.dateStr + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}:
              </span>
              {activeStats.income > 0 && (
                <span className="text-[var(--status-success-fg)] font-semibold">
                  +{currencySymbol}{activeStats.income.toLocaleString()}
                </span>
              )}
              {activeStats.expense > 0 && (
                <span className="text-rose-400 font-semibold">
                  -{currencySymbol}{activeStats.expense.toLocaleString()}
                </span>
              )}
              <span className="text-[var(--text-muted)] text-[10px]">
                ({activeStats.count} {activeStats.count === 1 ? 'tx' : 'txs'})
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[var(--text-muted)]">
              <span>Month Net:</span>
              <span className={`font-semibold ${
                monthTotals.net >= 0 ? 'text-[var(--status-success-fg)]' : 'text-rose-400'
              }`}>
                {monthTotals.net >= 0 ? '+' : '-'}{currencySymbol}{Math.abs(monthTotals.net).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-[var(--border-default)] bg-[var(--bg-surface)] text-center py-1.5 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] font-mono">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Heatmap Grid */}
      <div className="p-2 sm:p-2.5">
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarGrid.map((stat, idx) => {
            if (!stat.isCurrentMonth) {
              return (
                <div 
                  key={`empty-${idx}`} 
                  className="h-10 sm:h-12 rounded-[4px] flex items-center justify-center text-[11px] font-mono text-[var(--text-muted)] opacity-20"
                >
                  {stat.day}
                </div>
              );
            }

            const isSelected = selectedDate === stat.dateStr;
            const isToday = todayStr === stat.dateStr;
            const level = stat.intensityLevel;

            // Heatmap styling based on income/expense levels
            let heatClasses = 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] border border-transparent';

            if (level === 4) {
              // Big / High Income
              heatClasses = 'bg-emerald-500/25 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/35';
            } else if (level === 3) {
              heatClasses = 'bg-emerald-500/18 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25';
            } else if (level === 2) {
              heatClasses = 'bg-emerald-500/12 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20';
            } else if (level === 1) {
              heatClasses = 'bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15';
            } else if (level === -4) {
              // Big / High Expense
              heatClasses = 'bg-rose-500/25 border border-rose-500/50 text-rose-300 hover:bg-rose-500/35';
            } else if (level === -3) {
              heatClasses = 'bg-rose-500/18 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25';
            } else if (level === -2) {
              heatClasses = 'bg-rose-500/12 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20';
            } else if (level === -1) {
              heatClasses = 'bg-rose-500/8 border border-rose-500/15 text-rose-400 hover:bg-rose-500/15';
            }

            return (
              <button
                key={`day-${stat.day}`}
                type="button"
                onClick={() => {
                  setSelectedDate(stat.dateStr);
                  onSelectDate?.(stat.dateStr);
                }}
                onMouseEnter={() => setHoveredDay(stat)}
                onMouseLeave={() => setHoveredDay(null)}
                className={`h-10 sm:h-12 w-full rounded-[4px] flex flex-col items-center justify-between p-1 relative transition-all cursor-pointer ${heatClasses} ${
                  isSelected ? 'ring-1 ring-[var(--accent-solid)] shadow-xs' : ''
                } ${isToday && !isSelected ? 'border-[var(--border-active)] font-semibold' : ''}`}
              >
                {/* Top Row: Date Number & Spike Badges */}
                <div className="w-full flex items-center justify-between px-0.5 leading-none">
                  <span className={`text-[11px] font-mono ${isSelected ? 'text-[var(--text-primary)] font-bold' : ''}`}>
                    {stat.day}
                  </span>

                  {/* Big Income Marker */}
                  {stat.isBigIncome && (
                    <span 
                      className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                      title="Large Inflow"
                    />
                  )}

                  {/* Big Expense Marker */}
                  {stat.isBigExpense && (
                    <span 
                      className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]"
                      title="Large Outflow"
                    />
                  )}
                </div>

                {/* Bottom Row: Micro Amount Preview (Self-Explanatory Heatmap Readout) */}
                <div className="w-full text-center leading-none overflow-hidden pb-0.5">
                  {stat.income > 0 && stat.income >= stat.expense ? (
                    <span className="text-[9.5px] font-mono font-medium text-emerald-400 tracking-tighter truncate block">
                      {formatCompact(stat.income, true)}
                    </span>
                  ) : stat.expense > 0 ? (
                    <span className="text-[9.5px] font-mono font-medium text-rose-400 tracking-tighter truncate block">
                      {formatCompact(stat.expense, false)}
                    </span>
                  ) : (
                    <span className="text-[9px] text-transparent select-none block">·</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Heatmap Legend Bar (Minimal Footer) */}
      <div className="px-3.5 py-2 border-t border-[var(--border-default)] flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-[var(--text-muted)] font-mono">
        <div className="flex items-center gap-1.5">
          <span>Outflow</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-rose-500/10 border border-rose-500/20" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-rose-500/20 border border-rose-500/30" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-rose-500/35 border border-rose-500/50" />
          </div>
          <span className="text-[9.5px] text-rose-400">● Major</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[9.5px] text-emerald-400">● Major</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/35 border border-emerald-500/50" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/20 border border-emerald-500/30" />
            <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/10 border border-emerald-500/20" />
          </div>
          <span>Inflow</span>
        </div>
      </div>

    </div>
  );
};
