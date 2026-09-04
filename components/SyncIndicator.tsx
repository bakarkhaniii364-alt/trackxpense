import React from 'react';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { ArrowClockwise } from '@phosphor-icons/react';

export const SyncIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isSyncing, pendingCount, isOnline } = useSyncStatus();

  if (!isOnline) {
    return (
      <div 
        title="Offline: Changes are safely queued locally in IndexedDB"
        className={`flex items-center gap-1.5 h-[28px] px-2.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-muted)] text-[11px] font-mono select-none ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-error-fg)]" />
        <span>Offline</span>
        {pendingCount > 0 && (
          <span className="text-[10px] text-[var(--status-warning-fg)]">({pendingCount} queued)</span>
        )}
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div 
        title="Syncing changes with Supabase cloud"
        className={`flex items-center gap-1.5 h-[28px] px-2.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--status-warning-fg)] text-[11px] font-mono select-none ${className}`}
      >
        <ArrowClockwise size={12} className="animate-spin" strokeWidth={2} />
        <span>Syncing</span>
        {pendingCount > 0 && <span>({pendingCount})</span>}
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div 
        title={`${pendingCount} change(s) queued for sync`}
        className={`flex items-center gap-1.5 h-[28px] px-2.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--status-warning-fg)] text-[11px] font-mono select-none ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-warning-fg)]" />
        <span>{pendingCount} Queued</span>
      </div>
    );
  }

  return (
    <div 
      title="All changes synced with cloud storage"
      className={`flex items-center gap-1.5 h-[28px] px-2.5 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] text-[11px] font-mono select-none ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success-fg)]" />
      <span>Synced</span>
    </div>
  );
};
