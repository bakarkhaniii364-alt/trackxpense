import React from 'react';
import {
  Download,
  Lightning
} from '@phosphor-icons/react';
import { Wallet } from '../../types';
import { CustomSelect } from '../shared/CustomSelect';
import { CloudflareDateRangePicker, DateRange } from '../shared/CloudflareDateRangePicker';

interface AnalyticsHeaderProps {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  walletScope: string;
  setWalletScope: (scope: string) => void;
  wallets: Wallet[];
  totalFilteredCount: number;
  onExportReport: () => void;
  onOpenSimulator?: () => void;
  onRefresh?: () => void;
}

export const AnalyticsHeader: React.FC<AnalyticsHeaderProps> = ({
  dateRange,
  setDateRange,
  walletScope,
  setWalletScope,
  wallets,
  totalFilteredCount,
  onExportReport,
  onOpenSimulator,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-default)]">
      {/* Title and date range */}
      <div className="flex items-baseline gap-3">
        <h1 className="text-base font-medium text-[var(--text-primary)] tracking-tight">
          Analytics
        </h1>
        <span className="text-[11px] text-[var(--text-muted)] font-mono">
          {dateRange.label} • {totalFilteredCount} txs
        </span>
      </div>

      {/* Controls: Cloudflare Date Range, Wallet selector, Simulator, Export */}
      <div className="flex flex-wrap items-center gap-2">
        
        {/* Cloudflare Date Range Picker */}
        <CloudflareDateRangePicker
          value={dateRange}
          onChange={setDateRange}
          onRefresh={onRefresh}
        />

        {/* Wallet Scope Selector */}
        <CustomSelect
          value={walletScope}
          onChange={(val) => setWalletScope(val)}
          options={[
            { value: 'ALL', label: 'All Wallets' },
            ...wallets.map((w) => ({ value: w.id, label: w.name }))
          ]}
          size="sm"
          className="min-w-[120px]"
        />

        {/* What-If Scenario Simulator Button */}
        {onOpenSimulator && (
          <button
            type="button"
            onClick={onOpenSimulator}
            title="What-If Scenario Simulator"
            className="btn btn--outline btn--xs flex items-center gap-1 cursor-pointer"
          >
            <Lightning size={12} strokeWidth={1.5} className="text-[var(--accent)]" />
            <span>Simulate</span>
          </button>
        )}

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
