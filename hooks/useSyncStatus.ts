import { useEffect, useState } from 'react';
import { syncEngine } from '../services/SyncEngine';
import { SyncStatus } from '../types';

export const useSyncStatus = () => {
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
    isOnline: navigator.onLine
  });

  useEffect(() => {
    syncEngine.setStatusListener(setStatus);
  }, []);

  return status;
};
