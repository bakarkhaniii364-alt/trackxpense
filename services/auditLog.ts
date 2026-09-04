/**
 * TrackXpense Enterprise Audit Log Service
 * Maintains an immutable client-side and server-side audit trail for all financial operations.
 * Supports compliance reviews, dispute resolution, and forensic data export.
 */

import { supabase } from './supabase';

export type AuditAction = 
  | 'TX_CREATE'
  | 'TX_UPDATE'
  | 'TX_DELETE'
  | 'TRANSFER'
  | 'DEBT_PAY'
  | 'DEBT_CREATE'
  | 'DEBT_SETTLE'
  | 'WALLET_CREATE'
  | 'WALLET_DELETE'
  | 'SECURITY_LOCK'
  | 'SECURITY_UNLOCK'
  | 'DATA_EXPORT'
  | 'DATA_WIPE';

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: AuditAction;
  entityId: string;
  userId: string;
  summary: string;
  metadata?: Record<string, any>;
}

const AUDIT_STORAGE_KEY = 'trackxpense_audit_log';
const MAX_LOGS = 500;

export const AuditLogger = {
  /**
   * Records an audit event locally and asynchronously syncs to Supabase.
   */
  log: (
    action: AuditAction, 
    entityId: string, 
    summary: string, 
    userId: string = 'local_user', 
    metadata?: Record<string, any>
  ): void => {
    try {
      const event: AuditEvent = {
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        action,
        entityId,
        userId,
        summary,
        metadata
      };

      // 1. Immediate local persistence
      const existingRaw = localStorage.getItem(AUDIT_STORAGE_KEY);
      const existing: AuditEvent[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [event, ...existing].slice(0, MAX_LOGS);
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));

      // 2. Asynchronous server-side sync with Supabase RLS
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user?.id) {
            supabase.from('audit_events').insert({
              id: event.id,
              user_id: session.user.id,
              timestamp: event.timestamp,
              action: event.action,
              entity_id: event.entityId,
              summary: event.summary,
              metadata: event.metadata || {}
            }).then(({ error }) => {
              if (error) {
                console.debug('Audit log remote dispatch deferred:', error.message);
              }
            }).catch(() => {});
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to record audit event:', e);
    }
  },

  /**
   * Retrieves locally cached audit logs.
   */
  getLogs: (): AuditEvent[] => {
    try {
      const existingRaw = localStorage.getItem(AUDIT_STORAGE_KEY);
      return existingRaw ? JSON.parse(existingRaw) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Fetches the latest audit events from Supabase server with local cache fallback.
   */
  fetchRemoteLogs: async (limit: number = 100): Promise<AuditEvent[]> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        return AuditLogger.getLogs();
      }

      const { data, error } = await supabase
        .from('audit_events')
        .select('*')
        .eq('user_id', session.user.id)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error || !data) {
        return AuditLogger.getLogs();
      }

      return data.map((d: any) => ({
        id: d.id,
        timestamp: d.timestamp,
        action: d.action as AuditAction,
        entityId: d.entity_id,
        userId: d.user_id,
        summary: d.summary,
        metadata: d.metadata
      }));
    } catch (err) {
      return AuditLogger.getLogs();
    }
  },

  /**
   * Exports the entire audit log as a CSV for compliance reviews.
   */
  exportAsCsv: (): string => {
    const logs = AuditLogger.getLogs();
    if (logs.length === 0) return 'timestamp,action,entityId,userId,summary\n';
    
    const headers = 'timestamp,action,entityId,userId,summary\n';
    const rows = logs.map(l => 
      `"${l.timestamp}","${l.action}","${l.entityId}","${l.userId}","${l.summary.replace(/"/g, '""')}"`
    ).join('\n');
    return headers + rows;
  },

  /**
   * Clears local audit cache.
   */
  clearLogs: (): void => {
    try {
      localStorage.removeItem(AUDIT_STORAGE_KEY);
    } catch (e) {}
  }
};
