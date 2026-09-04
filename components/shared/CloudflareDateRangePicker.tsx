import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  CaretLeft,
  CaretRight,
  ArrowClockwise,
  Plus,
  CaretDown,
  X
} from '@phosphor-icons/react';
import { Haptics } from '../../services/haptics';

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  label: string;
  presetKey?: string;
}

interface CloudflareDateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  onRefresh?: () => void;
  className?: string;
}

interface PresetOption {
  key: string;
  label: string;
  getRange: () => { start: Date; end: Date };
}

export const CloudflareDateRangePicker: React.FC<CloudflareDateRangePickerProps> = ({
  value,
  onChange,
  onRefresh,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useState<Date>(() => value.startDate || new Date());
  const [tempStart, setTempStart] = useState<Date | null>(value.startDate);
  const [tempEnd, setTempEnd] = useState<Date | null>(value.endDate);
  const [selectedPreset, setSelectedPreset] = useState<string>(value.presetKey || '30d');
  const [customSearch, setCustomSearch] = useState<string>('');

  // Auto-detect User's Timezone
  const userTimezone = useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const offset = -new Date().getTimezoneOffset() / 60;
      const sign = offset >= 0 ? '+' : '';
      return `${tz.replace(/_/g, ' ')} (GMT${sign}${offset})`;
    } catch {
      return 'Local Time (GMT+6)';
    }
  }, []);

  // Standard Presets list matching Cloudflare
  const presets: PresetOption[] = useMemo(() => [
    {
      key: '24h',
      label: 'Last 24 hours',
      getRange: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 1);
        return { start, end };
      }
    },
    {
      key: '7d',
      label: 'Last 7 days',
      getRange: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 7);
        return { start, end };
      }
    },
    {
      key: '30d',
      label: 'Last 30 days',
      getRange: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 30);
        return { start, end };
      }
    },
    {
      key: 'month',
      label: 'This Month (MTD)',
      getRange: () => {
        const end = new Date();
        const start = new Date(end.getFullYear(), end.getMonth(), 1);
        return { start, end };
      }
    },
    {
      key: '90d',
      label: 'Last 90 days',
      getRange: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 90);
        return { start, end };
      }
    },
    {
      key: 'ytd',
      label: 'This Year (YTD)',
      getRange: () => {
        const end = new Date();
        const start = new Date(end.getFullYear(), 0, 1);
        return { start, end };
      }
    },
    {
      key: 'all',
      label: 'All Time',
      getRange: () => {
        const end = new Date();
        const start = new Date(2020, 0, 1);
        return { start, end };
      }
    }
  ], []);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setTempStart(value.startDate);
      setTempEnd(value.endDate);
      setSelectedPreset(value.presetKey || '30d');
      if (value.startDate) setCurrentMonth(new Date(value.startDate));
    }
  }, [isOpen, value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Calendar Day Generation
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDaysCount = new Date(year, month, 0).getDate();

    const days: { date: Date; isCurrentMonth: boolean; dayNum: number }[] = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDaysCount - i),
        isCurrentMonth: false,
        dayNum: prevMonthDaysCount - i
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
        dayNum: i
      });
    }

    // Next month filler days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
        dayNum: i
      });
    }

    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    Haptics.light();
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    Haptics.light();
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleDayClick = (date: Date) => {
    Haptics.light();
    setSelectedPreset('custom');
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(date);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      if (date < tempStart) {
        setTempEnd(tempStart);
        setTempStart(date);
      } else {
        setTempEnd(date);
      }
    }
  };

  const handleSelectPreset = (preset: PresetOption) => {
    Haptics.light();
    const { start, end } = preset.getRange();
    setTempStart(start);
    setTempEnd(end);
    setSelectedPreset(preset.key);
    setCurrentMonth(new Date(start));
  };

  const handleApply = () => {
    Haptics.light();
    if (!tempStart) {
      setIsOpen(false);
      return;
    }

    const matchedPreset = presets.find(p => p.key === selectedPreset);
    let label = matchedPreset ? matchedPreset.label : 'Custom Range';
    if (!matchedPreset && tempStart) {
      const sStr = tempStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const eStr = (tempEnd || tempStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      label = `${sStr} – ${eStr}`;
    }

    onChange({
      startDate: tempStart,
      endDate: tempEnd || tempStart,
      label,
      presetKey: selectedPreset
    });
    setIsOpen(false);
  };

  const formatDateForInput = (d: Date | null) => {
    if (!d) return '';
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${day}`;
  };

  // Helper check if day is in range
  const isDateInRange = (d: Date) => {
    if (!tempStart || !tempEnd) return false;
    const time = d.setHours(0, 0, 0, 0);
    const start = new Date(tempStart).setHours(0, 0, 0, 0);
    const end = new Date(tempEnd).setHours(0, 0, 0, 0);
    return time >= start && time <= end;
  };

  const isStartOrEndDate = (d: Date) => {
    const time = d.setHours(0, 0, 0, 0);
    const start = tempStart ? new Date(tempStart).setHours(0, 0, 0, 0) : null;
    const end = tempEnd ? new Date(tempEnd).setHours(0, 0, 0, 0) : null;
    return time === start || time === end;
  };

  return (
    <div ref={containerRef} className={`relative inline-flex items-center gap-1.5 ${className}`}>
      
      {/* Cloudflare-Style Trigger Button Group */}
      <div className="inline-flex items-center rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-active)] transition-colors text-[12px] overflow-hidden">
        <button
          type="button"
          onClick={() => {
            Haptics.light();
            setIsOpen(!isOpen);
          }}
          className="flex items-center gap-2 px-2.5 py-1 text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer font-medium"
        >
          <CalendarIcon size={14} strokeWidth={1.5} className="text-[var(--text-secondary)]" />
          <span>{value.label || 'Last 30 days'}</span>
        </button>

        <div className="w-[1px] h-4 bg-[var(--border-default)]" />

        <button
          type="button"
          onClick={() => {
            Haptics.light();
            setIsOpen(!isOpen);
          }}
          className="px-2 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
          title="Custom time range"
        >
          <Plus size={13} strokeWidth={1.5} />
        </button>

        {onRefresh && (
          <>
            <div className="w-[1px] h-4 bg-[var(--border-default)]" />
            <button
              type="button"
              onClick={() => {
                Haptics.light();
                onRefresh();
              }}
              className="px-2 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              title="Refresh dataset"
            >
              <ArrowClockwise size={13} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>

      {/* Cloudflare Custom Date Range Popover */}
      {isOpen && (
        <>
          {/* Mobile backdrop to easily dismiss */}
          <div 
            className="fixed inset-0 bg-black/60 z-[9998] sm:hidden" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-full mt-2 w-auto sm:w-[490px] max-w-[calc(100vw-24px)] max-h-[85vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[10px] shadow-2xl p-3.5 sm:p-4 z-[9999] animate-in fade-in zoom-in-95 duration-150 text-[12px]">
            
            {/* Header for mobile with close button */}
            <div className="flex items-center justify-between pb-2 mb-2 sm:hidden border-b border-[var(--border-default)]">
              <span className="font-medium text-[13px] text-[var(--text-primary)]">Select Time Range</span>
              <button 
                type="button" 
                onClick={() => setIsOpen(false)} 
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            {/* Top Custom Range Natural Language Input */}
            <div className="mb-3">
              <input
                type="text"
                value={customSearch}
                onChange={(e) => setCustomSearch(e.target.value)}
                placeholder="Custom range: 3h, 3 hours, 3 months, 30d..."
                className="w-full bg-[var(--field-bg)] border border-[var(--field-border)] focus:border-[var(--field-border-focus)] rounded-[6px] px-3 py-1.5 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors"
              />
            </div>

            {/* Middle 2-Column: Calendar Grid (Left) + Quick Presets List (Right) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4 pb-3 border-b border-[var(--border-default)]">
              
              {/* Left: Interactive Calendar */}
              <div className="sm:col-span-7 space-y-2 sm:border-r border-[var(--border-default)] sm:pr-3">
                {/* Month Navigation */}
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[13px] text-[var(--text-primary)]">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-[4px] cursor-pointer"
                    >
                      <CaretLeft size={13} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-[4px] cursor-pointer"
                    >
                      <CaretRight size={13} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Day of Week Headers */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-[var(--text-muted)] font-medium">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} className="py-0.5">{d}</div>
                  ))}
                </div>

                {/* Day Cells Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {calendarDays.map((item, idx) => {
                    const inRange = isDateInRange(item.date);
                    const isBoundary = isStartOrEndDate(item.date);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleDayClick(item.date)}
                        className={`h-7 w-7 text-[11.5px] rounded-[4px] font-medium flex items-center justify-center transition-colors cursor-pointer ${
                          !item.isCurrentMonth ? 'text-[var(--text-muted)] opacity-40' : 'text-[var(--text-primary)]'
                        } ${
                          isBoundary
                            ? 'bg-[var(--text-primary)] text-[var(--accent-text)] font-semibold'
                            : inRange
                              ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)]'
                              : 'hover:bg-[var(--bg-surface-hover)]'
                        }`}
                      >
                        {item.dayNum}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right: Cloudflare Quick Presets */}
              <div className="sm:col-span-5 grid grid-cols-2 sm:grid-cols-1 gap-1 sm:space-y-0.5 sm:gap-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-default)]">
                {presets.map(p => {
                  const isActive = selectedPreset === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-[12px] transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[var(--bg-surface-hover)] font-medium text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]/60'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

          {/* Start and End Inputs */}
          <div className="grid grid-cols-2 gap-3 py-3 border-b border-[var(--border-default)]">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-wider">Start</label>
              <div className="relative flex items-center">
                <CalendarIcon size={13} className="absolute left-2.5 text-[var(--text-muted)]" />
                <input
                  type="date"
                  value={formatDateForInput(tempStart)}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) setTempStart(d);
                  }}
                  className="w-full bg-[var(--field-bg)] border border-[var(--field-border)] focus:border-[var(--field-border-focus)] rounded-[6px] pl-8 pr-2.5 py-1.5 text-[11.5px] font-mono text-[var(--text-primary)] outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-wider">End</label>
              <div className="relative flex items-center">
                <CalendarIcon size={13} className="absolute left-2.5 text-[var(--text-muted)]" />
                <input
                  type="date"
                  value={formatDateForInput(tempEnd || tempStart)}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (!isNaN(d.getTime())) setTempEnd(d);
                  }}
                  className="w-full bg-[var(--field-bg)] border border-[var(--field-border)] focus:border-[var(--field-border-focus)] rounded-[6px] pl-8 pr-2.5 py-1.5 text-[11.5px] font-mono text-[var(--text-primary)] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Bottom Bar: Timezone + Apply Button */}
          <div className="flex items-center justify-between pt-3">
            <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
              <span>{userTimezone}</span>
              <CaretDown size={11} />
            </div>

            <button
              type="button"
              onClick={handleApply}
              className="btn btn--primary h-[28px] px-4 text-[12px] rounded-[6px] font-medium cursor-pointer"
            >
              Apply
            </button>
          </div>

        </div>
      </>
    )}

    </div>
  );
};
