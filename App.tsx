import React, { useState, useEffect } from 'react';
import { NavBar } from './components/NavBar';
import { MobileMenuView } from './components/MobileMenuView';
import { Transaction, ViewState, TransactionType, AppData, Wallet, WalletType, Debt, TransactionTemplate, DebtPayment, Category, ThemeOption } from './types';
import { PredictiveEngine } from './services/PredictiveEngine';
import * as StorageService from './services/storage';
import { DashboardView } from './components/DashboardView';
import { HistoryView } from './components/HistoryView';
import { DebtView } from './components/DebtView';
import { AnalyticsView } from './components/AnalyticsView';
import { AddTransactionModal } from './components/AddTransactionModal';
import { DesktopDashboard } from './components/pc/DesktopDashboard';
import { DesktopHistory } from './components/pc/DesktopHistory';
import { DesktopAnalytics } from './components/pc/DesktopAnalytics';
import { DesktopDebt } from './components/pc/DesktopDebt';
import { DesktopIdentity, DesktopControl } from './components/pc/DesktopManagement';
import { ProvisioningCenter } from './components/ProvisioningCenter';
import { SubscriptionManager } from './components/SubscriptionManager';
import { OnboardingModal } from './components/OnboardingModal';
import { StealthOverlay } from './components/StealthOverlay';
import { CommandPalette } from './components/CommandPalette';
import { PrivacyShield } from './services/crypto';
import { Haptics } from './services/haptics';
import { Sidebar } from './components/Sidebar';
import { 
  Trash2, 
  ChevronDown, 
  X, PlusCircle, Check,
  Plus, Activity, AlertCircle,
  ChevronLeft, ChevronRight,
  LayoutGrid, TrendingUp, ArrowDownRight, Calendar, Ghost, UserCircle, Search, Info
} from 'lucide-react';
import { CategoryIcon } from './components/shared/CategoryIcon';
import { getDateTime, formatMoney } from './utils/formatters';
import { AppSkeleton } from './components/ui/Skeletons';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/AuthScreen';
import { syncEngine } from './services/SyncEngine';
import { SyncIndicator } from './components/SyncIndicator';
import { RabbAiChatWidget } from './components/shared/RabbAiChatWidget';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: () => void }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={onClose} />
            <div className="relative bg-[var(--bg-surface)] w-full max-w-xs rounded-[10px] p-6 border border-[var(--border-default)] animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-[6px] bg-[var(--status-error-bg)] text-[var(--status-error-fg)] flex items-center justify-center mb-4">
                        <Trash2 size={20} className="stroke-[1.5px]" />
                    </div>
                    <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-1">Delete Item?</h3>
                    <p className="text-[13px] text-[var(--text-secondary)] mb-6">This action cannot be undone.</p>
                    <div className="flex gap-2 w-full">
                        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                        <button onClick={onConfirm} className="btn-destructive flex-1">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const UnsavedChangesModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: () => void }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[6100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={onClose} />
            <div className="relative bg-[var(--bg-surface)] w-full max-w-xs rounded-[10px] p-6 border border-[var(--border-default)] animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-[6px] bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)] flex items-center justify-center mb-4">
                        <AlertCircle size={20} className="stroke-[1.5px]" />
                    </div>
                    <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-1">Unsaved Changes</h3>
                    <p className="text-[13px] text-[var(--text-secondary)] mb-6">You have unsaved modifications. Do you want to discard them and proceed?</p>
                    <div className="flex flex-col gap-2 w-full">
                        <button onClick={onConfirm} className="btn-primary w-full">Discard & Continue</button>
                        <button onClick={onClose} className="btn-secondary w-full">Stay & Save</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VaultLock = ({ correctPasscode, onUnlock }: { correctPasscode: string, onUnlock: () => void }) => {
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState(false);

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
            <div className={`w-full max-w-xs text-center space-y-8 animate-in zoom-in-95 duration-300 ${error ? 'animate-shake' : ''}`}>
                <div className="flex flex-col items-center">
                    <div className="w-16 h-16 rounded-md bg-primary/20 flex items-center justify-center text-primary mb-4 border border-primary/20 shadow-lg shadow-primary/10">
                        <PlusCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase">App Locked</h2>
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mt-2">Enter Passcode</p>
                </div>

                <div className="flex justify-center gap-4">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${passcode.length > i ? 'bg-primary border-primary shadow-[0_0_10px_rgb(var(--color-primary)/0.5)]' : 'border-white/10'}`} />
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-4 px-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((num, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                if (num === 'del') setPasscode(prev => prev.slice(0, -1));
                                else if (num !== '') {
                                    if (passcode.length < 4) {
                                        const newPass = passcode + num;
                                        setPasscode(newPass);
                                        if (newPass.length === 4) {
                                            setTimeout(() => {
                                                if (newPass === correctPasscode) onUnlock();
                                                else { setError(true); setPasscode(''); setTimeout(() => setError(false), 500); }
                                            }, 200);
                                        }
                                    }
                                }
                            }}
                            className={`h-16 w-16 rounded-md flex items-center justify-center text-xl font-bold transition-all active:scale-90 ${num === '' ? 'opacity-0' : 'bg-white/5 hover:bg-white/10 border border-white/5 text-white'}`}
                        >
                            {num === 'del' ? '←' : num}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default function App() {
  const { user, loading: authLoading, continueAsGuest, isAuthenticated, signOut } = useAuth();
  const mainRef = React.useRef<HTMLElement>(null);
  const [view, setView] = useState<ViewState>(() => {
    const hash = window.location.hash.replace('#', '');
    const validViews: ViewState[] = ['dashboard', 'history', 'analytics', 'debts', 'identity', 'control', 'provisions', 'subscriptions', 'menu'];
    return (validViews.includes(hash as ViewState) ? hash : 'dashboard') as ViewState;
  });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addModalData, setAddModalData] = useState<{ type: TransactionType, category?: string, amount?: number, note?: string }>({ type: TransactionType.EXPENSE });
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  
  const [data, setData] = useState<AppData | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [selectedWalletColor, setSelectedWalletColor] = useState<ThemeOption>('indigo');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{isOpen: boolean, id: string | null}>({isOpen: false, id: null});
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  const [isDirty, setIsDirty] = useState(false);
  const [pendingView, setPendingView] = useState<ViewState | null>(null);
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);

  const [isLocked, setIsLocked] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [walletSearchQuery, setWalletSearchQuery] = useState('');
  const [isCreateWalletModalOpen, setIsCreateWalletModalOpen] = useState(false);
  const [createWalletStep, setCreateWalletStep] = useState<1 | 2>(1);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletCurrency, setNewWalletCurrency] = useState('$');
  const [newWalletIsGoal, setNewWalletIsGoal] = useState(false);
  const [newWalletTarget, setNewWalletTarget] = useState<number>(0);
  const [newWalletColor, setNewWalletColor] = useState<ThemeOption>('indigo');
  const [privacyMasterKey, setPrivacyMasterKey] = useState<string>('');
  const [isStealthActive, setIsStealthActive] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      const validViews: ViewState[] = ['dashboard', 'history', 'analytics', 'debts', 'identity', 'control', 'provisions', 'subscriptions', 'menu'];
      if (validViews.includes(hash as ViewState)) {
        setView(hash as ViewState);
      } else if (!hash) {
        setView('dashboard');
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      if (!user) {
        // If not logged in, just load whatever is in IndexedDB
        const localData = await StorageService.getAppData();
        setData(localData);
        if (localData.settings.vaultPasscode && localData.settings.isVaultLocked) {
          setIsLocked(true);
        }
        return;
      }

      // If user is logged in:
      const needsMigration = localStorage.getItem('tx_needs_migration') === 'true';
      const localData = await StorageService.getAppData();

      if (needsMigration) {
        console.log('Migrating guest data to Supabase for user:', user.id);
        
        // 1. Add all wallets to sync queue
        for (const wallet of localData.wallets) {
          await syncEngine.push('wallets', 'INSERT', wallet);
        }
        // 2. Add all transactions to sync queue
        for (const tx of localData.transactions) {
          await syncEngine.push('transactions', 'INSERT', tx);
        }
        // 3. Add all debts to sync queue
        for (const debt of localData.debts) {
          await syncEngine.push('debts', 'INSERT', debt);
        }
        // 4. Add all provisions to sync queue
        for (const prov of localData.provisions) {
          await syncEngine.push('provisions', 'INSERT', prov);
        }
        // 5. Add all templates to sync queue
        for (const tpl of localData.templates) {
          await syncEngine.push('templates', 'INSERT', tpl);
        }
        // 6. Add all recurring rules to sync queue
        for (const rule of (localData.recurringRules || [])) {
          await syncEngine.push('subscriptions', 'INSERT', rule);
        }
        // 7. Update profile and settings
        await syncEngine.push('users', 'UPDATE', { ...localData.profile, id: user.id });
        await syncEngine.push('settings', 'UPDATE', { ...localData.settings, user_id: user.id });

        localStorage.removeItem('tx_needs_migration');
        await syncEngine.flush();
      }

      // Now, pull fresh consolidated data from the cloud
      const cloudData = await syncEngine.pull(user.id);

      if (cloudData) {
        // Save cloud data to local IndexedDB and update state
        await StorageService.saveAppData(cloudData);
        setData(cloudData);
        if (cloudData.settings.vaultPasscode && cloudData.settings.isVaultLocked) {
          setIsLocked(true);
        }
      } else {
        // If there's no data on the server (e.g. new user sign up), 
        // save the local data (which has default onboarding or migrated data) to server
        await syncEngine.push('users', 'UPDATE', { ...localData.profile, id: user.id });
        await syncEngine.push('settings', 'UPDATE', { ...localData.settings, user_id: user.id });
        await syncEngine.flush();
        setData(localData);
      }
    };

    initializeData();
  }, [user]);

  useEffect(() => {
    if (user) {
        syncEngine.initializeRealtime(user.id, async () => {
            const cloudData = await syncEngine.pull(user.id);
            if (cloudData) {
                await StorageService.saveAppData(cloudData);
                setData(cloudData);
            }
        });
    }
  }, [user]);

  useEffect(() => {
    if (mainRef.current) {
        mainRef.current.scrollTop = 0;
    }
    // Update browser title
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      history: 'History',
      analytics: 'Analytics',
      debts: 'Debts',
      identity: 'Profile Settings',
      control: 'Budgets & Categories',
      provisions: 'Upcoming Expenses',
      subscriptions: 'Subscriptions',
      menu: 'Menu'
    };
    document.title = `TrackXpense | ${titles[view] || 'Finance'}`;
    
    // Sync hash with view
    if (window.location.hash !== `#${view}`) {
        window.location.hash = view;
    }
  }, [view]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      
      if ((e.metaKey || e.ctrlKey) && key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }
      
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if (isInput || !isDesktop) return;
      
      if (key === 'n') { e.preventDefault(); setIsAddOpen(true); }
      if (key === 'd') { e.preventDefault(); setView('dashboard'); }
      if (key === 'h') { e.preventDefault(); setView('history'); }
      if (key === 'a') { e.preventDefault(); setView('analytics'); }
      if (key === 'l') { e.preventDefault(); setView('debts'); }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [isDesktop]);

  // Global Stealth & Panic Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (data?.settings.stealthModeEnabled && e.key === (data.settings.stealthHotkey || 'Escape')) {
            setIsStealthActive(prev => !prev);
            if (!isStealthActive) Haptics.warning();
        }
    };

    let touchPoints: Touch[] = [];
    const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 4) {
            setIsStealthActive(prev => !prev);
            if (!isStealthActive) Haptics.warning();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [data, isStealthActive]);

  useEffect(() => {
    if (data) {
      StorageService.saveAppData(data);
      const activeWallet = data.wallets.find(w => w.id === data.currentWalletId);
      const activeTheme = activeWallet?.color || 'indigo';
      const classes = [
        `theme-${activeTheme}`,
        data.settings.darkMode ? '' : 'light-mode',
        isDesktop ? 'desktop-ui' : ''
      ].filter(Boolean).join(' ');
      document.body.className = classes;
    }
  }, [data, isDesktop]);

  // Net Worth Snapshot Logic
  useEffect(() => {
    if (!data || !data.settings.hasOnboarded) return;
    
    const today = new Date().toISOString().split('T')[0];
    const lastSnapshot = data.balanceHistory[0];
    
    if (!lastSnapshot || lastSnapshot.date !== today) {
        // Calculate total balance across all wallets
        const totalIncome = data.transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = data.transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
        const netWorth = totalIncome - totalExpense;
        
        const newSnapshot = { date: today, amount: netWorth };
        updateData({ balanceHistory: [newSnapshot, ...data.balanceHistory].slice(0, 30) });
    }
  }, [data?.settings.hasOnboarded, data?.transactions.length]);

  // Recurring Transaction Engine
  useEffect(() => {
    if (!data || !data.settings.hasOnboarded) return;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let newTransactions = [...data.transactions];
    let updatedRules = [...(data.recurringRules || [])];
    let hasChanges = false;

    updatedRules = updatedRules.map(rule => {
        if (!rule.isActive) return rule;
        
        let nextDue = new Date(rule.nextDueDate);
        let currentRule = { ...rule };
        
        while (nextDue <= now) {
            const newTx: Transaction = {
                id: `recurring_${rule.id}_${nextDue.getTime()}`,
                amount: rule.amount,
                type: rule.type,
                category: rule.category,
                date: nextDue.toISOString(),
                note: `[Recurring] ${rule.note || rule.name}`,
                walletId: rule.walletId,
                isSubscription: true
            };
            
            newTransactions = [newTx, ...newTransactions];
            
            // Advance nextDueDate
            if (rule.frequency === 'DAILY') nextDue.setDate(nextDue.getDate() + 1);
            else if (rule.frequency === 'WEEKLY') nextDue.setDate(nextDue.getDate() + 7);
            else if (rule.frequency === 'MONTHLY') nextDue.setMonth(nextDue.getMonth() + 1);
            else if (rule.frequency === 'YEARLY') nextDue.setFullYear(nextDue.getFullYear() + 1);
            
            currentRule.nextDueDate = nextDue.toISOString().split('T')[0];
            currentRule.updated_at = new Date().toISOString();
            hasChanges = true;

        }
        return currentRule;
    });

    if (hasChanges) {
        updateData({ 
            transactions: newTransactions,
            recurringRules: updatedRules
        });
        Haptics.success();
    }
  }, [data?.settings.hasOnboarded]);

  // Spending Streaks Logic
  useEffect(() => {
    if (!data || !data.settings.hasOnboarded) return;
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const limits = data.settings.budgetLimits || {};
    const currentStreaks = { ...(data.streaks || {}) };
    let hasChanges = false;

    Object.keys(limits).forEach(category => {
        const limitData = limits[category];
        const limit = typeof limitData === 'number' ? limitData : limitData.limit;
        if (limit <= 0) return;

        const streak = currentStreaks[category] || { current: 0, max: 0, lastUpdate: '' };
        
        // If we haven't checked today yet
        if (streak.lastUpdate !== todayStr) {
            // Check yesterday's performance to see if we continue or break
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yStr = yesterday.toISOString().split('T')[0];
            
            const yesterdaySpend = data.transactions
                .filter(t => t.type === TransactionType.EXPENSE && t.category === category && t.date.startsWith(yStr))
                .reduce((sum, t) => sum + t.amount, 0);

            if (yesterdaySpend <= limit) {
                // Good behavior! Increment or maintain
                // If it's the first time, start at 1
                streak.current = (streak.current || 0) + 1;
                if (streak.current > streak.max) streak.max = streak.current;
            } else {
                // Breach! Reset
                streak.current = 0;
            }
            
            streak.lastUpdate = todayStr;
            currentStreaks[category] = streak;
            hasChanges = true;
        }
    });

    if (hasChanges) {
        updateData({ streaks: currentStreaks });
    }
  }, [data?.settings.hasOnboarded, data?.transactions.length]);

  useEffect(() => {
     if (!isAuthenticated) {
         setView('dashboard');
         if (window.location.hash) {
             window.location.hash = '';
         }
     }
  }, [isAuthenticated]);

  // Handle modal-specific back button behavior
  useEffect(() => {
     const onPopState = (e: PopStateEvent) => {
        let handled = false;
        
        if (isSidebarOpen) { setIsSidebarOpen(false); handled = true; } 
        else if (isWalletModalOpen) { setIsWalletModalOpen(false); handled = true; } 
        else if (isAddOpen) { setIsAddOpen(false); setEditingTx(null); handled = true; } 
        else if (deleteConfirmation.isOpen) { setDeleteConfirmation({ isOpen: false, id: null }); handled = true; } 
        else if (isUnsavedModalOpen) { setIsUnsavedModalOpen(false); handled = true; }
        else if (view === 'menu') {
            const currentHash = window.location.hash.replace('#', '');
            const subViews = ['analytics', 'provisions', 'subscriptions', 'control', 'identity'];
            if (!subViews.includes(currentHash)) {
                setView('dashboard');
                handled = true;
            }
        }

        if (handled) {
            window.history.pushState(null, '', window.location.href);
        }
     };

     window.addEventListener('popstate', onPopState);
     return () => window.removeEventListener('popstate', onPopState);
  }, [isSidebarOpen, isWalletModalOpen, isAddOpen, deleteConfirmation, isUnsavedModalOpen, view]);

  const updateData = (newData: Partial<AppData>) => {
    setData(prev => {
      if (!prev) return null;

      if (user) {
        // 1. Wallets diff
        if (newData.wallets && newData.wallets !== prev.wallets) {
          const prevMap = new Map(prev.wallets.map(w => [w.id, w]));
          const nextMap = new Map(newData.wallets.map(w => [w.id, w]));
          newData.wallets.forEach(w => {
            const prevW = prevMap.get(w.id);
            if (!prevW) {
              syncEngine.push('wallets', 'INSERT', w);
            } else if (JSON.stringify(prevW) !== JSON.stringify(w)) {
              syncEngine.push('wallets', 'UPDATE', w);
            }
          });
          prev.wallets.forEach(w => {
            if (!nextMap.has(w.id)) {
              syncEngine.push('wallets', 'DELETE', w);
            }
          });
        }

        // 2. Transactions diff
        if (newData.transactions && newData.transactions !== prev.transactions) {
          const prevMap = new Map(prev.transactions.map(t => [t.id, t]));
          const nextMap = new Map(newData.transactions.map(t => [t.id, t]));
          newData.transactions.forEach(t => {
            const prevT = prevMap.get(t.id);
            if (!prevT) {
              syncEngine.push('transactions', 'INSERT', t);
            } else if (JSON.stringify(prevT) !== JSON.stringify(t)) {
              syncEngine.push('transactions', 'UPDATE', t);
            }
          });
          prev.transactions.forEach(t => {
            if (!nextMap.has(t.id)) {
              syncEngine.push('transactions', 'DELETE', t);
            }
          });
        }

        // 3. Debts diff
        if (newData.debts && newData.debts !== prev.debts) {
          const prevMap = new Map(prev.debts.map(d => [d.id, d]));
          const nextMap = new Map(newData.debts.map(d => [d.id, d]));
          newData.debts.forEach(d => {
            const prevD = prevMap.get(d.id);
            if (!prevD) {
              syncEngine.push('debts', 'INSERT', d);
            } else if (JSON.stringify(prevD) !== JSON.stringify(d)) {
              syncEngine.push('debts', 'UPDATE', d);
            }
          });
          prev.debts.forEach(d => {
            if (!nextMap.has(d.id)) {
              syncEngine.push('debts', 'DELETE', d);
            }
          });
        }

        // 4. Recurring Rules diff
        if (newData.recurringRules && newData.recurringRules !== prev.recurringRules) {
          const prevMap = new Map((prev.recurringRules || []).map(r => [r.id, r]));
          const nextMap = new Map((newData.recurringRules || []).map(r => [r.id, r]));
          (newData.recurringRules || []).forEach(r => {
            const prevR = prevMap.get(r.id);
            if (!prevR) {
              syncEngine.push('subscriptions', 'INSERT', r);
            } else if (JSON.stringify(prevR) !== JSON.stringify(r)) {
              syncEngine.push('subscriptions', 'UPDATE', r);
            }
          });
          (prev.recurringRules || []).forEach(r => {
            if (!nextMap.has(r.id)) {
              syncEngine.push('subscriptions', 'DELETE', r);
            }
          });
        }

        // 5. Provisions diff
        if (newData.provisions && newData.provisions !== prev.provisions) {
          const prevMap = new Map(prev.provisions.map(p => [p.id, p]));
          const nextMap = new Map(newData.provisions.map(p => [p.id, p]));
          newData.provisions.forEach(p => {
            const prevP = prevMap.get(p.id);
            if (!prevP) {
              syncEngine.push('provisions', 'INSERT', p);
            } else if (JSON.stringify(prevP) !== JSON.stringify(p)) {
              syncEngine.push('provisions', 'UPDATE', p);
            }
          });
          prev.provisions.forEach(p => {
            if (!nextMap.has(p.id)) {
              syncEngine.push('provisions', 'DELETE', p);
            }
          });
        }

        // 6. Templates diff
        if (newData.templates && newData.templates !== prev.templates) {
          const prevMap = new Map(prev.templates.map(t => [t.id, t]));
          const nextMap = new Map(newData.templates.map(t => [t.id, t]));
          newData.templates.forEach(t => {
            const prevT = prevMap.get(t.id);
            if (!prevT) {
              syncEngine.push('templates', 'INSERT', t);
            } else if (JSON.stringify(prevT) !== JSON.stringify(t)) {
              syncEngine.push('templates', 'UPDATE', t);
            }
          });
          prev.templates.forEach(t => {
            if (!nextMap.has(t.id)) {
              syncEngine.push('templates', 'DELETE', t);
            }
          });
        }

        // 7. Balance Snapshots diff
        if (newData.balanceHistory && newData.balanceHistory !== prev.balanceHistory) {
          const prevMap = new Map<string, any>(prev.balanceHistory.map(b => [b.date, b] as [string, any]));
          const nextMap = new Map<string, any>(newData.balanceHistory.map(b => [b.date, b] as [string, any]));
          newData.balanceHistory.forEach(b => {
            const prevB = prevMap.get(b.date);
            if (!prevB) {
              syncEngine.push('balance_snapshots', 'INSERT', { amount: b.amount, date: b.date });
            } else if (prevB.amount !== b.amount) {
              syncEngine.push('balance_snapshots', 'UPDATE', { amount: b.amount, date: b.date });
            }
          });
          prev.balanceHistory.forEach(b => {
            if (!nextMap.has(b.date)) {
              syncEngine.push('balance_snapshots', 'DELETE', { date: b.date });
            }
          });
        }

        // 8. Settings diff
        if (newData.settings && JSON.stringify(prev.settings) !== JSON.stringify(newData.settings)) {
          syncEngine.push('settings', 'UPDATE', newData.settings);
        }

        // 9. Profile diff
        if (newData.profile && JSON.stringify(prev.profile) !== JSON.stringify(newData.profile)) {
          syncEngine.push('users', 'UPDATE', newData.profile);
        }
      }

      return { ...prev, ...newData };
    });
  };

  const handleOnboardingComplete = (name: string, balance: number, dailyGoal: number) => {
      if (!data) return;
      
      let newTransactions = [...data.transactions];
      
      // Create initial balance transaction if amount > 0
      if (balance > 0) {
          const initTx: Transaction = {
              id: 'init_balance_' + Date.now(),
              amount: balance,
              type: TransactionType.INCOME,
              category: 'Other',
              date: new Date().toISOString(),
              note: 'Initial Balance Adjustment',
              walletId: data.currentWalletId
          };
          newTransactions = [initTx, ...newTransactions];
      }

      updateData({
          profile: { ...data.profile, name, dailyGoal },
          settings: { ...data.settings, hasOnboarded: true },
          transactions: newTransactions
      });
  };

  const handleAddWallet = (name: string, type: WalletType, target: number, currency?: string, color?: ThemeOption) => {
    if (!data) return;
    const newWallet: Wallet = { id: Date.now().toString(), name, type, targetAmount: target, currency, color, updated_at: new Date().toISOString() };
    updateData({ wallets: [...data.wallets, newWallet], currentWalletId: newWallet.id });
    setIsWalletModalOpen(false);
  };

  const handleAddTransaction = (t: Transaction) => {
    if (!data) return;
    
    const newTx = { ...t, updated_at: new Date().toISOString() };

    // Auto-Taxonomy update
    let newMap = { ...data.lastUsedCategoryMap };
    if (t.note) {
        newMap[t.note.trim().toLowerCase()] = t.category;
    }

    updateData({ 
        transactions: [newTx, ...data.transactions],
        lastUsedCategoryMap: newMap
    });
    
    setIsAddOpen(false);
    Haptics.success();
  };

  const handleSaveTemplate = (template: Omit<TransactionTemplate, 'id'>) => {
      if (!data) return;
      const newTemplate = { ...template, id: Date.now().toString(), updated_at: new Date().toISOString() };
      updateData({ templates: [newTemplate, ...data.templates] });
  };

  const handleDeleteTemplate = (id: string) => {
      if (!data) return;
      const tpl = data.templates.find(t => t.id === id);
      updateData({ templates: data.templates.filter(tpl => tpl.id !== id) });
  };

  const handleDebtPayment = (debtId: string, payment: Omit<DebtPayment, 'id'>) => {
      if (!data) return;
      const newPayment = { ...payment, id: Date.now().toString() };
      const updatedDebts = data.debts.map(d => {
          if (d.id === debtId) {
              const updatedDebt = { 
                  ...d, 
                  payments: [...(d.payments || []), newPayment],
                  updated_at: new Date().toISOString()
              };
              const totalPaid = updatedDebt.payments.reduce((sum, p) => sum + p.amount, 0);
              updatedDebt.isSettled = totalPaid >= d.amount;
              return updatedDebt;
          }
          return d;
      });
      updateData({ debts: updatedDebts });
  };
  
  const handleEditTransaction = (updatedTx: Transaction) => {
      if (!data) return;
      const tx = { ...updatedTx, updated_at: new Date().toISOString() };
      const updatedTransactions = data.transactions.map(t => t.id === tx.id ? tx : t);
      updateData({ transactions: updatedTransactions });
      setIsAddOpen(false);
      setEditingTx(null);
  };

  const handleAddDebt = (debt: Debt) => {
      if (!data) return;
      const newDebt = { ...debt, updated_at: new Date().toISOString() };
      updateData({ debts: [newDebt, ...data.debts] });
  };

  const handleTransfer = (amount: number, fromId: string, toId: string, note: string, dateStr: string) => {
    if (!data) return;
    const timestamp = Date.now();
    const dateTime = getDateTime(dateStr);
    const now = new Date().toISOString();
    const txOut: Transaction = { id: timestamp.toString(), amount, type: TransactionType.EXPENSE, category: Category.TRANSFER, date: dateTime, note: `To: ${data.wallets.find(w => w.id === toId)?.name} - ${note}`, walletId: fromId, updated_at: now };
    const txIn: Transaction = { id: (timestamp + 1).toString(), amount, type: TransactionType.INCOME, category: Category.TRANSFER, date: dateTime, note: `From: ${data.wallets.find(w => w.id === fromId)?.name} - ${note}`, walletId: toId, updated_at: now };
    
    updateData({ transactions: [txIn, txOut, ...data.transactions] });
    setIsAddOpen(false);
  };

  const openAddModal = (e?: React.MouseEvent, type: TransactionType = TransactionType.EXPENSE, quickData?: { category?: string, amount?: number, note?: string }) => {
      if (e) {
          e.preventDefault();
          e.stopPropagation();
      }
      setEditingTx(null);
      setAddModalData({ type, ...quickData });
      setIsAddOpen(true);
  };
  
  const openEditModal = (t: Transaction) => {
      setEditingTx(t);
      setIsAddOpen(true);
  };

  const requestViewChange = (newView: ViewState) => {
      if (isDirty) {
          setPendingView(newView);
          setIsUnsavedModalOpen(true);
      } else {
          setView(newView);
          window.location.hash = newView;
      }
  };

  const handleDiscardChanges = () => {
      if (pendingView) {
          setIsDirty(false);
          setView(pendingView);
          setPendingView(null);
          setIsUnsavedModalOpen(false);
      }
  };

  if (authLoading || !data) return <AppSkeleton />;
  
  if (!isAuthenticated) {
    return <AuthScreen onContinueAsGuest={continueAsGuest} />;
  }

    return (
        <div className="h-screen w-full bg-[#000] text-main font-sans selection:bg-primary/30 transition-colors duration-300 flex flex-col lg:flex-row overflow-hidden relative">
          {isDesktop && (
            <svg width={0} height={0} style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden>
              <defs>
                <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                  <feTurbulence type="fractalNoise" baseFrequency="0.001 0.001" numOctaves={2} seed={92} result="noise" />
                  <feGaussianBlur in="noise" stdDeviation={2} result="blurred" />
                  <feDisplacementMap in="SourceGraphic" in2="blurred" scale={30} xChannelSelector="R" yChannelSelector="G" />
                </filter>
              </defs>
            </svg>
          )}
      <div className="absolute inset-0 bg-noise opacity-15 pointer-events-none z-0" />
      
      <OnboardingModal isOpen={!data.settings.hasOnboarded} onComplete={handleOnboardingComplete} />
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        data={data} 
        updateData={updateData} 
        onViewChange={requestViewChange} 
        isStatic={isDesktop} 
        currentView={view} 
        onLogout={signOut}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />
      
      <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden h-full relative z-10">
        {/* Header - Hidden on Desktop Sidebar if we want a different layout, but let's keep it for now and refine */}
        {!isDesktop && (
          <div className="flex-none pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 px-4 shadow-sm border-b border-main/10 z-40 glass">
            <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
              {['analytics', 'provisions', 'subscriptions', 'control', 'identity'].includes(view) ? (
                <>
                  <button 
                    onClick={() => {
                      Haptics.light();
                      requestViewChange('menu');
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 active:scale-95 transition-all shrink-0"
                  >
                      <ChevronLeft size={16} />
                      <span>Back</span>
                  </button>
                  <h1 className="text-xs font-bold text-main tracking-tight leading-none uppercase">
                      {(() => {
                          const titles: Record<string, string> = {
                              analytics: 'Analytics & Trends',
                              provisions: 'Upcoming Expenses',
                              subscriptions: 'Subscriptions',
                              control: 'Budgets & Categories',
                              identity: 'Profile Settings'
                          };
                          return titles[view] || '';
                      })()}
                  </h1>
                  <div className="w-12 flex justify-end shrink-0">
                      <SyncIndicator />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-primary/40 p-[2px] shadow-[0_0_8px_rgba(var(--color-primary),0.25)] shrink-0">
                          <div className="w-full h-full rounded-full bg-card flex items-center justify-center border border-main/10 animate-pulse-slow">
                              <span className="text-xs font-bold text-primary tracking-tighter">
                                  {data.profile.name ? data.profile.name.charAt(0).toUpperCase() : 'U'}
                              </span>
                          </div>
                      </div>
                      <div className="flex flex-col items-start justify-center">
                          <h1 className="text-xs font-bold text-main tracking-tight leading-none">{data.profile.name.split(' ')[0]}</h1>
                      </div>
                  </div>
                  <button 
                    onClick={() => {
                      Haptics.light();
                      setIsWalletModalOpen(true);
                    }} 
                    className="flex items-center gap-1.5 bg-main/5 hover:bg-main/10 active:scale-95 transition-all py-1 px-2.5 rounded-lg border border-main/10 max-w-[120px] shrink-0"
                  >
                      <span className="text-[10px] font-bold text-main truncate">{data.wallets.find(w => w.id === data.currentWalletId)?.name}</span>
                      <ChevronDown size={12} className="text-muted/50 shrink-0" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {isDesktop && (
          <div className="flex-none h-[52px] bg-transparent flex items-center justify-between px-8 relative z-50">
            {/* Left: Minimal Page Title with Icon */}
            <div className="flex items-center gap-2">
              {(() => {
                const pageConfig: Record<string, { title: string; icon: React.ElementType }> = {
                  dashboard: { title: 'Dashboard', icon: LayoutGrid },
                  history: { title: 'Transactions', icon: Activity },
                  analytics: { title: 'Analytics', icon: TrendingUp },
                  debts: { title: 'Debts & Loans', icon: ArrowDownRight },
                  control: { title: 'Budgets & Categories', icon: TrendingUp },
                  provisions: { title: 'Upcoming Expenses', icon: Calendar },
                  subscriptions: { title: 'Subscriptions', icon: Ghost },
                  identity: { title: 'Profile & Settings', icon: UserCircle },
                };
                const current = pageConfig[view] || { title: 'Overview', icon: LayoutGrid };
                const IconComp = current.icon;
                return (
                  <>
                    <IconComp size={16} className="text-[var(--text-muted)] stroke-[1.5px]" />
                    <h1 className="text-sm font-medium text-[var(--text-primary)] tracking-tight">
                      {current.title}
                    </h1>
                  </>
                );
              })()}
            </div>

            {/* Right: Utilities */}
            <div className="flex items-center gap-3">
              {/* Current Wallet Selector Pill */}
              <button 
                onClick={() => {
                  setWalletSearchQuery('');
                  setIsWalletModalOpen(true);
                }} 
                className="flex items-center gap-2 bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] active:scale-95 transition-all h-[32px] px-3 rounded-[6px] border border-[var(--border-default)] hover:border-[var(--border-active)] group"
              >
                <span className="text-[10px] text-[var(--text-muted)] uppercase font-medium">Wallet:</span>
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {data.wallets.find(w => w.id === data.currentWalletId)?.name}
                </span>
                <ChevronDown size={14} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
              </button>

              {/* Runway Indicator */}
              {(() => {
                const walletTransactions = data.transactions.filter((t: Transaction) => t.walletId === data.currentWalletId);
                const totalIncome = walletTransactions.filter((t: Transaction) => t.type === TransactionType.INCOME).reduce((sum: number, t: Transaction) => sum + t.amount, 0);
                const totalExpense = walletTransactions.filter((t: Transaction) => t.type === TransactionType.EXPENSE).reduce((sum: number, t: Transaction) => sum + t.amount, 0);
                const balance = totalIncome - totalExpense;
                const runwayDays = PredictiveEngine.getRunwayDays(data, balance);
                
                if (!isFinite(runwayDays) || runwayDays >= 999) return null;
                
                return (
                  <div className="flex items-center gap-1.5 bg-[var(--status-success-bg)] h-[32px] px-2.5 rounded-[6px] border border-[var(--border-default)]">
                    <Activity size={12} className="text-[var(--status-success-fg)]" />
                    <span className="text-[10px] font-medium text-[var(--text-muted)]">Runway:</span>
                    <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                      {!data.settings.privacyMode ? `${runwayDays} Days` : '••••'}
                    </span>
                  </div>
                );
              })()}

              <button 
                onClick={() => openAddModal(undefined, TransactionType.EXPENSE)} 
                className="btn btn--primary text-[12px] h-[32px] px-3 font-medium rounded-[6px] flex items-center gap-1.5"
              >
                <PlusCircle size={15} className="btn__icon" /> Add Transaction
              </button>
            </div>
          </div>
        )}
        
        {/* Main Content */}
        <main 
          ref={mainRef}
          className={`flex-1 min-w-0 min-h-0 w-full ${isDesktop ? 'max-w-none px-8 overflow-y-auto' : 'max-w-md mx-auto px-4 overflow-y-auto overflow-x-hidden pt-5'} relative ${!isDesktop ? 'pb-[calc(66px+env(safe-area-inset-bottom))]' : 'pb-4'}`}
        >
          {isDesktop ? (
            <div className="w-full max-w-6xl mx-auto py-4 view-transition">
               {view === 'dashboard' && (
                  <DesktopDashboard 
                      data={data} 
                      setView={setView} 
                      updateData={updateData} 
                      formatMoney={formatMoney} 
                      onAddTransactionRequest={(t, q) => openAddModal(undefined, t, q)} 
                      onEditTransaction={openEditModal}
                      onDeleteTemplate={handleDeleteTemplate}
                  />
               )}
               {view === 'history' && (
                  <DesktopHistory 
                      data={data} 
                      updateData={updateData}
                      onRequestDelete={(id) => setDeleteConfirmation({ isOpen: true, id })} 
                      formatMoney={formatMoney} 
                      onEditTransaction={openEditModal}
                  />
               )}
                {view === 'debts' && (
                  <DesktopDebt 
                      data={data} 
                      updateData={updateData} 
                      formatMoney={formatMoney} 
                      onSettleTransaction={handleAddTransaction}
                      onAddPayment={handleDebtPayment}
                  />
               )}
               {view === 'analytics' && (
                  <DesktopAnalytics data={data} updateData={updateData} formatMoney={formatMoney} />
               )}
               {view === 'identity' && (
                  <DesktopIdentity data={data} updateData={updateData} formatMoney={formatMoney} onDirtyChange={setIsDirty} onLogout={signOut} />
               )}
               {view === 'control' && (
                  <DesktopControl data={data} updateData={updateData} formatMoney={formatMoney} />
               )}
               {view === 'provisions' && (
                  <ProvisioningCenter data={data} updateData={updateData} formatMoney={formatMoney} />
               )}
               {view === 'subscriptions' && (
                  <SubscriptionManager data={data} updateData={updateData} formatMoney={formatMoney} />
               )}
            </div>
          ) : (
            <>
              {view === 'dashboard' && (
                <div className="w-full view-transition">
                  <div className="h-auto p-0 lg:p-4">
                      <DashboardView 
                          data={data} 
                          setView={setView} 
                          updateData={updateData} 
                          formatMoney={formatMoney} 
                          onAddTransactionRequest={(t, q) => openAddModal(undefined, t, q)} 
                          onEditTransaction={openEditModal}
                          onDeleteTemplate={handleDeleteTemplate}
                      />
                  </div>
                </div>
              )}

              {view === 'history' && (
                <div className="w-full view-transition">
                  <div className="h-auto p-0 lg:p-4">
                      <HistoryView 
                          data={data} 
                          updateData={updateData}
                          onRequestDelete={(id) => setDeleteConfirmation({ isOpen: true, id })} 
                          formatMoney={formatMoney} 
                          onEditTransaction={openEditModal}
                      />
                  </div>
                </div>
              )}

              {view === 'debts' && (
                <div className="w-full view-transition">
                  <div className="h-auto p-0 lg:p-4">
                    <DebtView 
                        data={data} 
                        updateData={updateData} 
                        formatMoney={formatMoney} 
                        onSettleTransaction={handleAddTransaction} 
                        onAddPayment={handleDebtPayment}
                    />
                  </div>
                </div>
              )}

              {view === 'analytics' && (
                <div className="w-full view-transition">
                  <div className="h-auto p-0 lg:p-4">
                      <AnalyticsView data={data} updateData={updateData} formatMoney={formatMoney} />
                  </div>
                </div>
              )}

              {view === 'provisions' && (
                <div className="w-full view-transition">
                  <div className="h-auto p-0 lg:p-4">
                      <ProvisioningCenter data={data} updateData={updateData} formatMoney={formatMoney} />
                  </div>
                </div>
              )}

              {view === 'subscriptions' && (
                <div className="w-full view-transition">
                  <div className="h-auto p-0 lg:p-4">
                      <SubscriptionManager data={data} updateData={updateData} formatMoney={formatMoney} />
                  </div>
                </div>
              )}

              {view === 'identity' && (
                <div className="w-full view-transition">
                  <div className="h-auto p-0 lg:p-4">
                      <DesktopIdentity data={data} updateData={updateData} formatMoney={formatMoney} onDirtyChange={setIsDirty} onLogout={signOut} />
                  </div>
                </div>
              )}

              {view === 'control' && (
                <div className="w-full view-transition">
                  <div className="h-auto p-0 lg:p-4">
                      <DesktopControl data={data} updateData={updateData} formatMoney={formatMoney} />
                  </div>
                </div>
              )}

              {view === 'menu' && (
                <div className="w-full view-transition absolute inset-x-0 bottom-0 top-5">
                  <MobileMenuView
                    currentView={view}
                    onNavigate={(v) => { requestViewChange(v); }}
                    data={data}
                    updateData={updateData}
                    onLogout={signOut}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>



      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)} 
        data={data}
        setView={requestViewChange}
        onQuickAdd={handleAddTransaction}
      />

      <RabbAiChatWidget 
        data={data} 
        onAddTransaction={handleAddTransaction} 
      />
      
      {/* Modals */}
      <AddTransactionModal 
        isOpen={isAddOpen} 
        onClose={() => { setIsAddOpen(false); setEditingTx(null); }} 
        data={data} 
        onAdd={handleAddTransaction} 
        onEdit={handleEditTransaction}
        onTransfer={handleTransfer} 
        onAddDebt={handleAddDebt} 
        getDateTime={getDateTime} 
        initialData={addModalData} 
        editingTransaction={editingTx}
        lastUsedCategoryMap={data?.lastUsedCategoryMap || {}}
        onSaveTemplate={handleSaveTemplate}
      />
      
      <DeleteConfirmationModal 
        isOpen={deleteConfirmation.isOpen} 
        onClose={() => setDeleteConfirmation({ isOpen: false, id: null })} 
        onConfirm={() => { 
            if (deleteConfirmation.id) { 
                const tx = data.transactions.find(t => t.id === deleteConfirmation.id);
                updateData({ transactions: data.transactions.filter(t => t.id !== deleteConfirmation.id) });
                setDeleteConfirmation({ isOpen: false, id: null }); 
            }
        }} 
      />

        {/* Wallet Dropdown Menu */}
        {isWalletModalOpen && (
          <div className="fixed inset-0 z-[5000] flex items-start justify-end pt-[52px] pr-8 lg:pr-[260px]">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={() => setIsWalletModalOpen(false)} />
            
            <div className="relative w-[300px] bg-[var(--bg-surface)] rounded-[10px] border border-[var(--border-default)] shadow-2xl overflow-visible z-10 text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-150 p-1.5">
              {/* Triangular Pointer / Nudge */}
              <div className="absolute -top-[6px] right-[88px] w-2.5 h-2.5 bg-[var(--bg-surface)] border-t border-l border-[var(--border-default)] rotate-45 z-20" />

              {/* Top Search Input */}
              <div className="px-2.5 py-1.5 flex items-center gap-2 border-b border-[var(--border-default)]/60 mb-1 relative z-10">
                <Search size={14} className="text-[var(--text-muted)] shrink-0 stroke-[1.5px]" />
                <input 
                  type="text" 
                  placeholder="Search wallets..." 
                  value={walletSearchQuery}
                  onChange={(e) => setWalletSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] font-normal"
                />
              </div>

              {/* Wallet List */}
              <div className="max-h-[220px] overflow-y-auto space-y-0.5 no-scrollbar relative z-10">
                {data.wallets
                  .filter(w => w.name.toLowerCase().includes(walletSearchQuery.toLowerCase()))
                  .map(w => {
                    const isSelected = w.id === data.currentWalletId;
                    return (
                      <button 
                        key={w.id} 
                        onClick={() => { 
                          Haptics.success();
                          updateData({ currentWalletId: w.id }); 
                          setIsWalletModalOpen(false); 
                        }} 
                        className={`w-full h-[34px] px-2.5 flex items-center justify-between rounded-[6px] text-[13px] transition-colors ${
                          isSelected 
                            ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium' 
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] font-normal'
                        }`}
                      >
                        <span className="truncate">{w.name}</span>
                        {isSelected && <Check size={14} className="text-[var(--text-primary)] shrink-0 stroke-[2px]" />}
                      </button>
                    );
                  })}
              </div>

              {/* Action Divider & Create Wallet Button */}
              <div className="border-t border-[var(--border-default)]/60 my-1 pt-1 relative z-10">
                <button 
                  onClick={() => {
                    setIsWalletModalOpen(false);
                    setCreateWalletStep(1);
                    setNewWalletName('');
                    setNewWalletCurrency(data.settings.currencySymbol || '$');
                    setNewWalletIsGoal(false);
                    setNewWalletTarget(0);
                    setNewWalletColor('indigo');
                    setIsCreateWalletModalOpen(true);
                  }}
                  className="w-full h-[32px] px-2.5 flex items-center gap-2 rounded-[6px] text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                >
                  <Plus size={14} className="stroke-[1.5px]" />
                  <span>Create Wallet</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Wallet Modal (2-Step Flow) */}
        {isCreateWalletModalOpen && (
          <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200" onClick={() => setIsCreateWalletModalOpen(false)} />
            
            <div className="relative w-full max-w-[480px] bg-[var(--bg-surface)] rounded-[16px] p-7 border border-[var(--border-default)] shadow-2xl z-10 text-[var(--text-primary)] animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Create a Wallet</h2>
                  <p className="text-[12px] text-[var(--text-muted)] mt-1">
                    {createWalletStep === 1 ? 'Step 1 of 2: Enter wallet name' : `Step 2 of 2: Configuration for "${newWalletName}"`}
                  </p>
                </div>
                <button 
                  onClick={() => setIsCreateWalletModalOpen(false)}
                  className="w-9 h-9 rounded-[8px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Step 1: Wallet Name Input & Callout Banner */}
              {createWalletStep === 1 ? (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 relative">
                      <label className="text-[14px] font-medium text-[var(--text-primary)]">Wallet name</label>
                      <div className="relative group cursor-pointer inline-flex items-center">
                        <Info size={15} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-[250px] px-3 py-2 rounded-[6px] bg-[#1a1a1e] border border-[var(--border-default)] text-[12px] text-[var(--text-secondary)] shadow-xl z-50 pointer-events-none">
                          You can rename the Wallet at any time in settings
                        </div>
                      </div>
                    </div>
                    <input 
                      type="text" 
                      value={newWalletName}
                      onChange={(e) => setNewWalletName(e.target.value)}
                      placeholder="My Wallet" 
                      className="w-full h-[44px] px-3.5 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] focus:border-[var(--border-active)] outline-none text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 transition-colors"
                      autoFocus
                    />
                  </div>

                  {/* Info Callout Banner */}
                  <div className="p-4 rounded-[10px] bg-blue-500/10 border border-blue-500/20 flex items-start gap-3 text-[13px] text-blue-400 leading-relaxed my-4">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0 mt-0.5 font-bold text-[11px]">i</div>
                    <span>This Wallet will be created with default settings. You can customize currency, target goals, and color theme anytime.</span>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setIsCreateWalletModalOpen(false)}
                      className="h-[40px] px-5 rounded-[8px] border border-[var(--border-default)] text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button"
                      disabled={!newWalletName.trim()}
                      onClick={() => {
                        if (newWalletName.trim()) setCreateWalletStep(2);
                      }}
                      className="h-[40px] px-5 rounded-[8px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[14px] font-medium transition-colors disabled:opacity-40 shadow-sm"
                    >
                      Create Wallet
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Currency, Savings Goal & Theme Color (loads in same modal) */
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-[var(--text-primary)]">Wallet Currency</label>
                    <div className="flex bg-[var(--bg-subtle)] p-1 rounded-[8px] border border-[var(--border-default)]">
                      {['৳', '$', '€', '£'].map(curr => (
                        <button 
                          key={curr} 
                          type="button"
                          onClick={() => setNewWalletCurrency(curr)}
                          className={`flex-1 py-2 rounded-[6px] text-[13px] font-medium transition-all ${
                            newWalletCurrency === curr 
                              ? 'bg-[var(--accent-solid)] text-[var(--accent-text)]' 
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {curr}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="modalIsGoal" 
                        checked={newWalletIsGoal}
                        onChange={(e) => setNewWalletIsGoal(e.target.checked)}
                        className="w-4 h-4 rounded border-[var(--border-default)] accent-[#2563eb] cursor-pointer"
                      />
                      <label htmlFor="modalIsGoal" className="text-[14px] font-medium text-[var(--text-primary)] cursor-pointer select-none">Savings Goal</label>
                    </div>
                    {newWalletIsGoal && (
                      <input 
                        type="number" 
                        value={newWalletTarget || ''}
                        onChange={(e) => setNewWalletTarget(parseFloat(e.target.value) || 0)}
                        placeholder="Target Amount..."
                        className="w-full h-[40px] px-3.5 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]/50"
                      />
                    )}
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="text-[13px] font-medium text-[var(--text-primary)]">Theme Color</label>
                    <div className="flex gap-3 py-1">
                      {[
                        { name: 'indigo' as ThemeOption, color: '#5e5ce6' },
                        { name: 'emerald' as ThemeOption, color: '#30d158' },
                        { name: 'rose' as ThemeOption, color: '#ff453a' },
                        { name: 'amber' as ThemeOption, color: '#ff9f0a' },
                        { name: 'blue' as ThemeOption, color: '#0a84ff' },
                      ].map(col => (
                        <button
                          key={col.name}
                          type="button"
                          onClick={() => setNewWalletColor(col.name)}
                          className={`w-8 h-8 rounded-full relative transition-all ${
                            newWalletColor === col.name 
                              ? 'ring-2 ring-white ring-offset-2 ring-offset-[#141417] scale-110' 
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: col.color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setCreateWalletStep(1)}
                      className="h-[40px] px-5 rounded-[8px] border border-[var(--border-default)] text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        if (newWalletName.trim()) {
                          Haptics.success();
                          handleAddWallet(
                            newWalletName.trim(), 
                            newWalletIsGoal ? 'GOAL' : 'STANDARD', 
                            newWalletTarget, 
                            newWalletCurrency, 
                            newWalletColor
                          );
                          setIsCreateWalletModalOpen(false);
                        }
                      }}
                      className="h-[40px] px-5 rounded-[8px] bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[14px] font-medium transition-colors shadow-sm"
                    >
                      Finish & Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      
      {isUnsavedModalOpen && <UnsavedChangesModal isOpen={isUnsavedModalOpen} onClose={() => setIsUnsavedModalOpen(false)} onConfirm={handleDiscardChanges} />}
      {!isDesktop && (
        <NavBar
          currentView={view}
          onChangeView={(v) => requestViewChange(v)}
          onAddClick={(e) => openAddModal(e, TransactionType.EXPENSE)}
        />
      )}
      {isStealthActive && <StealthOverlay />}
      {isLocked && data?.settings.vaultPasscode && (
        <VaultLock 
            correctPasscode={data.settings.vaultPasscode} 
            onUnlock={() => { setIsLocked(false); Haptics.success(); }} 
        />
      )}
      {data && (
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          data={data}
          onViewChange={(v) => requestViewChange(v)}
          onQuickAdd={(type, quickData) => {
            const newTx: Transaction = {
              id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              amount: quickData.amount,
              type,
              category: quickData.category || 'Other',
              date: new Date().toISOString(),
              note: quickData.note || '',
              walletId: data.currentWalletId
            };
            updateData({ transactions: [newTx, ...data.transactions] });
            Haptics.success();
          }}
          onTogglePrivacy={() => {
            updateData({ settings: { ...data.settings, privacyMode: !data.settings.privacyMode } });
            Haptics.light();
          }}
          onSelectWallet={(walletId) => {
            updateData({ currentWalletId: walletId });
            Haptics.light();
          }}
        />
      )}
    </div>
  );
}
