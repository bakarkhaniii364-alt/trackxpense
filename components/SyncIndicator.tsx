import React from 'react';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

export const SyncIndicator: React.FC = () => {
  const { isSyncing, lastSyncedAt, pendingCount, isOnline } = useSyncStatus();

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
        <CloudOff size={12} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Offline</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-all duration-500 ${
      isSyncing ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
    }`}>
      {isSyncing ? (
        <RefreshCw size={12} className="animate-spin" />
      ) : (
        <Cloud size={12} />
      )}
      <div className="flex flex-col items-start leading-none">
        <span className="text-[10px] font-bold uppercase tracking-wider">
          {isSyncing ? 'Syncing...' : 'Cloud Synced'}
        </span>
        {pendingCount > 0 && (
          <span className="text-[8px] opacity-60 font-medium">{pendingCount} pending</span>
        )}
      </div>
    </div>
  );
};
