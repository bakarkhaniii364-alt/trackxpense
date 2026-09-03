/**
 * TrackXpense Enterprise Audit Log Service
 * Maintains an immutable client-side audit trail for all financial operations.
 * Supports compliance reviews, dispute resolution, and forensic data export.
 */

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

      const existingRaw = localStorage.getItem(AUDIT_STORAGE_KEY);
      const existing: AuditEvent[] = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [event, ...existing].slice(0, MAX_LOGS);
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to record audit event:', e);
    }
  },

  getLogs: (): AuditEvent[] => {
    try {
      const existingRaw = localStorage.getItem(AUDIT_STORAGE_KEY);
      return existingRaw ? JSON.parse(existingRaw) : [];
    } catch (e) {
      return [];
    }
  },

  exportAsCsv: (): string => {
    const logs = AuditLogger.getLogs();
    if (logs.length === 0) return 'timestamp,action,entityId,userId,summary\n';
    
    const headers = 'timestamp,action,entityId,userId,summary\n';
    const rows = logs.map(l => 
      `"${l.timestamp}","${l.action}","${l.entityId}","${l.userId}","${l.summary.replace(/"/g, '""')}"`
    ).join('\n');
    return headers + rows;
  },

  clearLogs: (): void => {
    try {
      localStorage.removeItem(AUDIT_STORAGE_KEY);
    } catch (e) {}
  }
};
