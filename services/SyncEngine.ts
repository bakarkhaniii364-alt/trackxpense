import { supabase } from './supabase';
import * as StorageService from './storage';
import { AppData, SyncStatus, TransactionType } from '../types';

class SyncEngine {
  private isSyncing = false;
  private lastSyncedAt: string | null = null;
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

  private mapLocalToDb(table: string, payload: any, userId: string): any {
    switch (table) {
      case 'transactions':
        return {
          id: payload.id,
          wallet_id: payload.walletId,
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
          id: payload.id,
          name: payload.name,
          type: payload.type || 'STANDARD',
          target_amount: payload.targetAmount || 0,
          currency: payload.currency || 'BDT',
          updated_at: payload.updated_at || new Date().toISOString()
        };
      case 'debts':
        return {
          id: payload.id,
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
          id: payload.id,
          wallet_id: payload.walletId || 'main',
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
          id: payload.id,
          name: payload.name,
          amount: payload.amount,
          date: payload.date,
          updated_at: payload.updated_at || new Date().toISOString()
        };
      case 'templates':
        return {
          id: payload.id,
          name: payload.name,
          amount: payload.amount || null,
          category: payload.category || null,
          type: payload.type || 'EXPENSE',
          note: payload.note || null,
          wallet_id: payload.walletId || null
        };
      case 'balance_snapshots':
        return {
          id: payload.id || undefined,
          wallet_id: payload.walletId || 'main',
          balance: payload.amount,
          date: payload.date
        };
      case 'settings':
        return {
          user_id: userId,
          theme: payload.theme,
          dark_mode: payload.darkMode,
          currency_symbol: payload.currencySymbol,
          privacy_mode: payload.privacyMode,
          vault_passcode: payload.vaultPasscode || null,
          vault_salt: payload.vaultSalt || null,
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

  public async push(table: string, operation: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return; // Only sync if authenticated

    await StorageService.addToSyncQueue({ table, operation, payload });
    this.emitStatus();
    this.flush();
  }

  public async flush() {
    if (this.isSyncing || !navigator.onLine) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const queue = await StorageService.getSyncQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    this.emitStatus();

    try {
      for (const item of queue) {
        const { table, operation, payload, id } = item;
        let error;

        if (operation === 'INSERT' || operation === 'UPDATE') {
          const dbPayload = this.mapLocalToDb(table, payload, session.user.id);
          
          if (dbPayload && typeof dbPayload === 'object') {
            if (table !== 'settings' && table !== 'users') {
              dbPayload.user_id = session.user.id;
            }
          }

          const { error: upsertError } = await supabase
            .from(table)
            .upsert(dbPayload);
          error = upsertError;
        } else if (operation === 'DELETE') {
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq('id', payload.id);
          error = deleteError;
        }

        if (!error) {
          await StorageService.removeFromSyncQueue(id);
        } else {
          console.error(`Sync error for ${table}:`, error);
          break;
        }
      }
      this.lastSyncedAt = new Date().toISOString();
    } finally {
      this.isSyncing = false;
      this.emitStatus();
    }
  }

  public async pull(userId: string): Promise<AppData | null> {
    this.isSyncing = true;
    this.emitStatus();
    try {
      const [
        { data: dbUser, error: userErr },
        { data: dbSettings, error: settingsErr },
        { data: dbWallets, error: walletsErr },
        { data: dbTransactions, error: txsErr },
        { data: dbDebts, error: debtsErr },
        { data: dbSubs, error: subsErr },
        { data: dbProvisions, error: provsErr },
        { data: dbTemplates, error: tplsErr },
        { data: dbSnapshots, error: snapsErr }
      ] = await Promise.all([
        supabase.from('users').select('*').eq('id', userId).maybeSingle(),
        supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('wallets').select('*').eq('user_id', userId),
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('debts').select('*').eq('user_id', userId),
        supabase.from('subscriptions').select('*').eq('user_id', userId),
        supabase.from('provisions').select('*').eq('user_id', userId),
        supabase.from('templates').select('*').eq('user_id', userId),
        supabase.from('balance_snapshots').select('*').eq('user_id', userId)
      ]);

      if (userErr || !dbUser) {
        console.warn("User record not found or error loading user profile on Supabase.", userErr);
        return null;
      }

      const wallets = (dbWallets || []).map(w => ({
        id: w.id,
        name: w.name,
        type: w.type || 'STANDARD',
        targetAmount: w.target_amount ? Number(w.target_amount) : undefined,
        currency: w.currency || undefined,
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

      const settings = dbSettings ? {
        theme: (dbSettings.theme || 'indigo') as any,
        darkMode: dbSettings.dark_mode !== false,
        notificationsEnabled: dbSettings.notificationsEnabled || false,
        expenseReminders: dbSettings.expenseReminders || false,
        debtReminders: dbSettings.debtReminders || false,
        privacyMode: dbSettings.privacy_mode || false,
        lastOpened: dbSettings.updated_at || new Date().toISOString(),
        currencySymbol: dbSettings.currency_symbol || '৳',
        budgetLimits: dbSettings.budget_limits || {},
        hasOnboarded: true,
        vaultPasscode: dbSettings.vault_passcode || '',
        vaultSalt: dbSettings.vault_salt || undefined,
        isVaultLocked: false,
        stealthModeEnabled: dbSettings.stealth_mode_enabled || false,
        stealthHotkey: dbSettings.stealth_hotkey || 'Escape',
        hapticsEnabled: dbSettings.haptics_enabled !== false
      } : {
        theme: 'indigo' as const,
        darkMode: true,
        notificationsEnabled: false,
        expenseReminders: false,
        debtReminders: false,
        privacyMode: false,
        lastOpened: new Date().toISOString(),
        currencySymbol: '৳',
        budgetLimits: {},
        hasOnboarded: true,
        vaultPasscode: '',
        isVaultLocked: false,
        stealthModeEnabled: false,
        stealthHotkey: 'Escape',
        hapticsEnabled: true
      };

      const profile = {
        name: dbUser.name || 'User',
        monthlyGoal: Number(dbUser.monthly_goal || 5000),
        dailyGoal: Number(dbUser.daily_goal || 0)
      };

      const localData = await StorageService.getAppData();

      const appData: AppData = {
        wallets: wallets.length > 0 ? wallets : [{ id: 'main', name: 'Main Wallet', type: 'STANDARD' }],
        transactions,
        debts,
        categories: localData.categories,
        currentWalletId: wallets.length > 0 ? wallets[0].id : 'main',
        settings,
        profile,
        provisions,
        lastUsedCategoryMap: localData.lastUsedCategoryMap || {},
        balanceHistory,
        templates,
        streaks: localData.streaks || {},
        recurringRules
      };

      return StorageService.sanitizeJargon(appData);
    } catch (err) {
      console.error('Error pulling cloud data:', err);
      return null;
    } finally {
      this.isSyncing = false;
      this.emitStatus();
    }
  }

  public async initializeRealtime(userId: string, onRemoteChange: () => void) {
    supabase
      .channel('user-data')
      .on('postgres_changes', { event: '*', schema: 'public', filter: `user_id=eq.${userId}` }, async () => {
        onRemoteChange();
      })
      .subscribe();
    
    this.flush();
    window.addEventListener('online', () => this.flush());
  }
}

export const syncEngine = new SyncEngine();
