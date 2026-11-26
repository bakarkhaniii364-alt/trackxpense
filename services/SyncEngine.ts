import { supabase } from './supabase';
import * as StorageService from './storage';
import { AppData, SyncStatus, TransactionType, CategoryItem } from '../types';
import { ExchangeRateService } from './ExchangeRateService';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Deterministically converts any legacy non-UUID string (e.g. 'main', 'tx_123',
 * 'init_balance_123') into a valid RFC-4122 UUID so PostgreSQL UUID columns accept it.
 */
export const toValidUuid = (rawId: string | undefined | null, namespace: string = 'default'): string => {
  const trimmed = (rawId || '').trim();
  if (UUID_REGEX.test(trimmed)) return trimmed.toLowerCase();

  const seed = `${namespace}:${trimmed || 'root'}`;
  const hashChunk = (input: string, init: number): string => {
    let h = init >>> 0;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  };

  const p1 = hashChunk(seed + ':a', 0x811c9dc5);
  const p2 = hashChunk(seed + ':b', 0x9e3779b1);
  const p3 = hashChunk(seed + ':c', 0x85ebca6b);
  const p4 = hashChunk(seed + ':d', 0xc2b2ae35);

  const hex = `${p1}${p2}${p3}${p4}`;
  const versionNib = '4';
  const variantNibs = ['8', '9', 'a', 'b'];
  const variantNib = variantNibs[parseInt(hex[16], 16) % 4];
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${versionNib}${hex.slice(13, 16)}-${variantNib}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const PERMANENT_PG_ERRORS = new Set([
  '22P02', // invalid_text_representation (e.g. malformed UUID)
  '23502', // not_null_violation
  '23503', // foreign_key_violation
  '42703'  // undefined_column
]);

class SyncEngine {
  private isSyncing = false;
  private activeFlush: Promise<void> | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private queueOpChain: Promise<void> = Promise.resolve();
  private lastLocalWriteAt = 0;
  private lastSyncedAt: string | null = null;
  private realtimeChannel: any = null;
  private onStatusChange: (status: SyncStatus) => void = () => {};

  public setStatusListener(listener: (status: SyncStatus) => void) {
    this.onStatusChange = listener;
    this.emitStatus();
  }

  private async emitStatus() {
    const queue = await StorageService.getSyncQueue();
    this.onStatusChange({
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      pendingCount: queue.length,
      isOnline: navigator.onLine
    });
  }

  public shouldIgnoreRealtimeEcho(): boolean {
    return this.isSyncing || Date.now() - this.lastLocalWriteAt < 4500;
  }

  public async hasPendingChanges(): Promise<boolean> {
    const queue = await StorageService.getSyncQueue();
    return queue.length > 0;
  }

  private mapLocalToDb(table: string, payload: any, userId: string): any {
    switch (table) {
      case 'categories':
        return {
          id: payload.id,
          name: payload.name,
          type: payload.type || 'EXPENSE',
          color: payload.color || '#5b9a7d',
          icon: payload.icon || null,
          is_system: payload.isSystem || false,
          updated_at: payload.updated_at || new Date().toISOString()
        };
      case 'transactions':
        return {
          id: toValidUuid(payload.id, userId),
          wallet_id: toValidUuid(payload.walletId || 'main', userId),
          amount: payload.amount,
          type: payload.type,
          category: payload.category,
          note: payload.note || null,
          date: payload.date,
          is_private: payload.isPrivate || false,
          splits: payload.splits || null,
          updated_at: payload.updated_at || new Date().toISOString()
        };
      case 'wallets':
        return {
          id: toValidUuid(payload.id || 'main', userId),
          name: payload.name,
          type: payload.type || 'STANDARD',
          target_amount: payload.targetAmount || 0,
          currency: payload.currency || '৳',
          updated_at: payload.updated_at || new Date().toISOString()
        };
      case 'debts':
        return {
          id: toValidUuid(payload.id, userId),
          person: payload.person,
          amount: payload.amount,
          type: payload.type,
          note: payload.note || null,
          due_date: payload.dueDate || null,
          is_settled: payload.isSettled || false,
          payments: payload.payments || [],
          updated_at: payload.updated_at || new Date().toISOString()
        };
      case 'subscriptions':
        return {
          id: toValidUuid(payload.id, userId),
          wallet_id: toValidUuid(payload.walletId || 'main', userId),
          name: payload.name,
          amount: payload.amount,
          category: payload.category,
          frequency: payload.frequency,
          next_due: payload.nextDueDate,
          is_active: payload.isActive || false,
          auto_log: true,
          updated_at: payload.updated_at || new Date().toISOString()
        };
      case 'provisions':
        return {
          id: toValidUuid(payload.id, userId),
          name: payload.name,
          amount: payload.amount,
          date: payload.date,
          updated_at: payload.updated_at || new Date().toISOString()
        };
      case 'templates':
        return {
          id: toValidUuid(payload.id, userId),
          name: payload.name,
          amount: payload.amount || null,
          category: payload.category || null,
          type: payload.type || 'EXPENSE',
          note: payload.note || null,
          wallet_id: payload.walletId ? toValidUuid(payload.walletId, userId) : null
        };
      case 'balance_snapshots':
        return {
          id: toValidUuid(payload.id || `snap_${payload.walletId || 'main'}_${payload.date}`, userId),
          wallet_id: toValidUuid(payload.walletId || 'main', userId),
          balance: payload.amount,
          date: payload.date
        };
      case 'settings':
        return {
          user_id: userId,
          theme: payload.theme,
          dark_mode: payload.darkMode,
          currency_symbol: ExchangeRateService.normalizeSymbol(payload.currencySymbol),
          privacy_mode: payload.privacyMode,
          // Zero-Knowledge Security: vault passcode & salt are strictly device-local and never synced to cloud
          vault_passcode: null,
          vault_salt: null,
          stealth_mode_enabled: payload.stealthModeEnabled || false,
          stealth_hotkey: payload.stealthHotkey || 'Escape',
          haptics_enabled: payload.hapticsEnabled !== false,
          budget_limits: payload.budgetLimits || {},
          updated_at: new Date().toISOString()
        };
      case 'users':
        return {
          id: userId,
          name: payload.name,
          daily_goal: payload.dailyGoal || 0,
          monthly_goal: payload.monthlyGoal || 0,
          created_at: payload.created_at || new Date().toISOString()
        };
      default:
        return payload;
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flush();
    }, 80);
  }

  public push(table: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', payload: any): Promise<void> {
    this.lastLocalWriteAt = Date.now();
    this.queueOpChain = this.queueOpChain
      .then(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return; // Only sync if authenticated

        await StorageService.addToSyncQueue({ table, operation, payload });
        await this.emitStatus();
        this.scheduleFlush();
      })
      .catch((err) => {
        console.warn('Sync queue enqueue warning:', err);
      });
    return this.queueOpChain;
  }

  public async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    // Ensure any queued adds finish before reading the queue
    await this.queueOpChain;

    if (this.activeFlush) {
      return this.activeFlush;
    }

    this.activeFlush = this.runFlushLoop();
    try {
      await this.activeFlush;
    } finally {
      this.activeFlush = null;
    }
  }

  private async runFlushLoop(): Promise<void> {
    if (!navigator.onLine) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    this.isSyncing = true;
    await this.emitStatus();

    try {
      let consecutiveTransientErrors = 0;

      // Drain until queue is empty or network/transient failures halt progress
      while (true) {
        const queue = await StorageService.getSyncQueue();
        if (queue.length === 0) break;

        let madeProgress = false;
        for (const item of queue) {
          const { table, operation, payload, id } = item;
          let error: any = null;
          this.lastLocalWriteAt = Date.now();

          if (operation === 'INSERT' || operation === 'UPDATE') {
            const dbPayload = this.mapLocalToDb(table, payload, session.user.id);

            if (dbPayload && typeof dbPayload === 'object') {
              if (table !== 'settings' && table !== 'users') {
                dbPayload.user_id = session.user.id;
              }
            }

            const upsertOptions =
              table === 'settings'
                ? { onConflict: 'user_id' }
                : table === 'users' || table === 'categories'
                  ? { onConflict: 'id' }
                  : undefined;

            const { error: upsertError } = await supabase
              .from(table)
              .upsert(dbPayload, upsertOptions);
            error = upsertError;
          } else if (operation === 'DELETE') {
            const targetId =
              table === 'categories'
                ? payload.id
                : toValidUuid(payload.id, session.user.id);
            const { error: deleteError } = await supabase
              .from(table)
              .delete()
              .eq('id', targetId);
            error = deleteError;
          }

          if (!error) {
            await StorageService.removeFromSyncQueue(id);
            consecutiveTransientErrors = 0;
            madeProgress = true;
          } else if (PERMANENT_PG_ERRORS.has(error.code)) {
            console.warn(`Dropping permanently invalid sync item for ${table} (${error.code}):`, error.message);
            await StorageService.removeFromSyncQueue(id);
            madeProgress = true;
          } else {
            consecutiveTransientErrors++;
            console.warn(`Sync queue item failed for ${table} (attempt ${consecutiveTransientErrors}):`, error.message);
            if (consecutiveTransientErrors >= 3) {
              setTimeout(() => this.flush(), 5000);
              return;
            }
          }
        }

        if (!madeProgress) break;
      }

      this.lastSyncedAt = new Date().toISOString();
    } finally {
      this.isSyncing = false;
      this.lastLocalWriteAt = Date.now();
      await this.emitStatus();
    }
  }

  public async pull(userId: string): Promise<AppData | null> {
    this.isSyncing = true;
    await this.emitStatus();
    try {
      const [
        { data: dbUser, error: userErr },
        { data: dbSettings },
        { data: dbWallets },
        { data: dbTransactions },
        { data: dbDebts },
        { data: dbSubs },
        { data: dbProvisions },
        { data: dbTemplates },
        { data: dbSnapshots },
        { data: dbCategories }
      ] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).maybeSingle(),
        supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('wallets').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('debts').select('*').eq('user_id', userId),
        supabase.from('subscriptions').select('*').eq('user_id', userId),
        supabase.from('provisions').select('*').eq('user_id', userId),
        supabase.from('templates').select('*').eq('user_id', userId),
        supabase.from('balance_snapshots').select('*').eq('user_id', userId),
        supabase.from('categories').select('*').eq('user_id', userId)
      ]);

      if (userErr || !dbUser) {
        console.warn('User record not found or error loading user profile on Supabase.', userErr);
        return null;
      }

      const localData = await StorageService.getAppData();

      const wallets = (dbWallets || []).map(w => ({
        id: w.id,
        name: w.name,
        type: w.type || 'STANDARD',
        targetAmount: w.target_amount ? Number(w.target_amount) : undefined,
        currency: w.currency ? ExchangeRateService.normalizeSymbol(w.currency) : undefined,
        updated_at: w.updated_at
      }));

      const transactions = (dbTransactions || []).map(t => ({
        id: t.id,
        amount: Number(t.amount),
        type: t.type,
        category: t.category,
        date: t.date,
        note: t.note || undefined,
        walletId: t.wallet_id,
        isPrivate: t.is_private || false,
        splits: t.splits || undefined,
        updated_at: t.updated_at
      })).sort((a, b) => b.date.localeCompare(a.date));

      const debts = (dbDebts || []).map(d => ({
        id: d.id,
        person: d.person,
        amount: Number(d.amount),
        type: d.type,
        note: d.note || undefined,
        dueDate: d.due_date || undefined,
        isSettled: d.is_settled || false,
        payments: d.payments || [],
        updated_at: d.updated_at
      }));

      const recurringRules = (dbSubs || []).map(s => ({
        id: s.id,
        name: s.name,
        amount: Number(s.amount),
        type: TransactionType.EXPENSE,
        category: s.category,
        frequency: s.frequency,
        nextDueDate: s.next_due,
        walletId: s.wallet_id,
        isActive: s.is_active || false,
        updated_at: s.updated_at
      }));

      const provisions = (dbProvisions || []).map(p => ({
        id: p.id,
        name: p.name,
        amount: Number(p.amount),
        date: p.date,
        updated_at: p.updated_at
      }));

      const templates = (dbTemplates || []).map(t => ({
        id: t.id,
        name: t.name,
        amount: t.amount ? Number(t.amount) : undefined,
        type: t.type || 'EXPENSE',
        category: t.category,
        note: t.note || undefined
      }));

      const balanceHistory = (dbSnapshots || [])
        .map(s => ({
          date: s.date,
          amount: Number(s.balance)
        }))
        .sort((a, b) => b.date.localeCompare(a.date));

      const categories: CategoryItem[] = (dbCategories && dbCategories.length > 0)
        ? dbCategories.map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type as TransactionType,
            color: c.color,
            icon: c.icon,
            isSystem: c.is_system || false
          }))
        : localData.categories;

      const resolvedCurrency = dbSettings?.currency_symbol
        ? ExchangeRateService.normalizeSymbol(dbSettings.currency_symbol)
        : ExchangeRateService.normalizeSymbol(localData.settings?.currencySymbol || '৳');

      const settings = dbSettings ? {
        ...localData.settings,
        theme: (dbSettings.theme === 'indigo' || !dbSettings.theme ? 'amber' : dbSettings.theme) as any,
        darkMode: dbSettings.dark_mode !== false,
        notificationsEnabled: dbSettings.notificationsEnabled ?? localData.settings?.notificationsEnabled ?? false,
        expenseReminders: dbSettings.expenseReminders ?? localData.settings?.expenseReminders ?? false,
        debtReminders: dbSettings.debtReminders ?? localData.settings?.debtReminders ?? false,
        privacyMode: dbSettings.privacy_mode || false,
        lastOpened: dbSettings.updated_at || new Date().toISOString(),
        currencySymbol: resolvedCurrency,
        budgetLimits: dbSettings.budget_limits || {},
        hasOnboarded: true,
        vaultPasscode: localData.settings?.vaultPasscode || '',
        vaultSalt: localData.settings?.vaultSalt || undefined,
        isVaultLocked: localData.settings?.isVaultLocked || false,
        stealthModeEnabled: dbSettings.stealth_mode_enabled || false,
        stealthHotkey: dbSettings.stealth_hotkey || 'Escape',
        hapticsEnabled: dbSettings.haptics_enabled !== false
      } : {
        ...localData.settings,
        theme: 'amber' as const,
        darkMode: true,
        notificationsEnabled: localData.settings?.notificationsEnabled ?? false,
        expenseReminders: localData.settings?.expenseReminders ?? false,
        debtReminders: localData.settings?.debtReminders ?? false,
        privacyMode: false,
        lastOpened: new Date().toISOString(),
        currencySymbol: resolvedCurrency,
        budgetLimits: {},
        hasOnboarded: true,
        vaultPasscode: localData.settings?.vaultPasscode || '',
        vaultSalt: localData.settings?.vaultSalt || undefined,
        isVaultLocked: localData.settings?.isVaultLocked || false,
        stealthModeEnabled: false,
        stealthHotkey: 'Escape',
        hapticsEnabled: true
      };

      const profile = {
        name: dbUser.name || 'User',
        monthlyGoal: Number(dbUser.monthly_goal ?? localData.profile?.monthlyGoal ?? 5000),
        dailyGoal: Number(dbUser.daily_goal ?? localData.profile?.dailyGoal ?? 0)
      };

      const resolvedWallets = wallets.length > 0
        ? wallets
        : (localData.wallets?.length > 0
            ? localData.wallets
            : [{ id: toValidUuid('main', userId), name: 'Main Wallet', type: 'STANDARD' as const, currency: resolvedCurrency }]);

      const resolvedCurrentWalletId = resolvedWallets.some(w => w.id === localData.currentWalletId)
        ? localData.currentWalletId
        : resolvedWallets[0].id;

      const appData: AppData = {
        wallets: resolvedWallets,
        transactions,
        debts,
        categories: categories && categories.length > 0 ? categories : localData.categories,
        currentWalletId: resolvedCurrentWalletId,
        settings,
        profile,
        provisions,
        lastUsedCategoryMap: localData.lastUsedCategoryMap || {},
        balanceHistory,
        templates,
        streaks: localData.streaks || {},
        recurringRules
      };

      return appData;
    } catch (err) {
      console.error('Error pulling cloud data:', err);
      return null;
    } finally {
      this.isSyncing = false;
      await this.emitStatus();
    }
  }

  public async initializeRealtime(userId: string, onRemoteChange: () => void) {
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }

    this.realtimeChannel = supabase
      .channel(`user-data-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', filter: `user_id=eq.${userId}` }, async () => {
        if (this.shouldIgnoreRealtimeEcho()) return;
        if (await this.hasPendingChanges()) return;
        onRemoteChange();
      })
      .subscribe();

    this.flush();
    window.addEventListener('online', () => this.flush());
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }
}

export const syncEngine = new SyncEngine();
