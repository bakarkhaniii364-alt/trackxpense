import React from 'react';
import { Download, ChevronDown } from 'lucide-react';
import { Wallet } from '../../types';

export type AnalyticsTimeframe = '7D' | '30D' | 'MTD' | '90D' | 'YTD' | 'ALL';

interface AnalyticsHeaderProps {
  timeframe: AnalyticsTimeframe;
  setTimeframe: (tf: AnalyticsTimeframe) => void;
  walletScope: string;
  setWalletScope: (scope: string) => void;
  wallets: Wallet[];
  dateRangeText: string;
  totalFilteredCount: number;
  onExportReport: () => void;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  timeframe,
  setTimeframe,
  walletScope,
  setWalletScope,
  wallets,
  dateRangeText,
  totalFilteredCount,
  onExportReport,
}) => {
  const timeframeOptions: { id: AnalyticsTimeframe; label: string }[] = [
    { id: '7D', label: '7D' },
    { id: '30D', label: '30D' },
    { id: 'MTD', label: 'Month' },
    { id: '90D', label: '90D' },
    { id: 'YTD', label: 'YTD' },
    { id: 'ALL', label: 'All' },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-default)]">
      {/* Title and date range */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-base font-medium text-[var(--text-primary)] tracking-tight">
          Analytics
        </h1>
        <span className="text-[11px] text-[var(--text-muted)] font-mono">
          {dateRangeText} • {totalFilteredCount} txs
        </span>
      </div>

      {/* Controls: Timeframe segmented buttons, Wallet selector, Export button */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Timeframe switch */}
        <div className="tabs">
          {timeframeOptions.map((tf) => {
            const isActive = timeframe === tf.id;
            return (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeframe(tf.id)}
                className={`tab text-[11px] py-1 px-2.5 ${isActive ? 'is-active' : ''}`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>

        {/* Wallet Scope Selector */}
        <div className="relative flex items-center">
          <select
            value={walletScope}
            onChange={(e) => setWalletScope(e.target.value)}
            className="h-[28px] pl-2.5 pr-6 rounded-[6px] text-[11px] font-medium bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-active)] transition-colors appearance-none cursor-pointer focus:outline-none"
          >
            <option value="ALL">All Wallets</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <ChevronDown size={12} strokeWidth={1.5} className="absolute right-1.5 text-[var(--text-muted)] pointer-events-none" />
        </div>

        {/* Export CSV Button */}
        <button
          type="button"
          onClick={onExportReport}
          title="Export CSV"
          className="btn btn--outline btn--xs"
        >
          <Download size={12} strokeWidth={1.5} />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
};
