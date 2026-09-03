import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavBar } from './components/NavBar';
import { MobileMenuView } from './components/MobileMenuView';
import { Transaction, ViewState, TransactionType, AppData, Wallet, WalletType, Debt, TransactionTemplate, DebtPayment, Category, CategoryItem, ThemeOption } from './types';
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
  Trash as Trash2, 
  CaretDown as ChevronDown, 
  X, PlusCircle, Check,
  Plus, Pulse as Activity, WarningCircle as AlertCircle,
  CaretLeft as ChevronLeft, CaretRight as ChevronRight,
  SquaresFour as LayoutGrid, TrendUp as TrendingUp, ArrowDownRight, HandCoins, Sliders, Calendar, Ghost, UserCircle, MagnifyingGlass as Search, Info,
  Eye, EyeSlash as EyeOff, Sparkle
} from '@phosphor-icons/react';
import { parseCurrentRoute, subscribeToRoutes, navigateTo } from './src/services/router';
import { CategoryIcon } from './components/shared/CategoryIcon';
import { getDateTime, formatMoney } from './utils/formatters';
import { AppSkeleton } from './components/ui/Skeletons';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/AuthScreen';
import { syncEngine } from './services/SyncEngine';
import { ExchangeRateService } from './services/ExchangeRateService';
import { AuditLogger } from './services/auditLog';

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: () => void }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity" onClick={onClose} />
            <div className="relative bg-[var(--bg-surface)] w-full max-w-xs rounded-[12px] p-6 border border-[var(--border-default)] shadow-2xl animate-in zoom-in-95 duration-150">
                <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-[8px] bg-[var(--status-error-bg)] text-[var(--status-error-fg)] flex items-center justify-center mb-3">
                        <Trash2 size={20} className="stroke-[1.5px]" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">Delete Item?</h3>
                    <p className="text-[13px] text-[var(--text-secondary)] mb-5">This action cannot be undone.</p>
                    <div className="flex gap-2 w-full">
                        <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
                        <button onClick={onConfirm} className="btn-destructive flex-1">Delete</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

const UnsavedChangesModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: () => void }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity" onClick={onClose} />
            <div className="relative bg-[var(--bg-surface)] w-full max-w-xs rounded-[12px] p-6 border border-[var(--border-default)] shadow-2xl animate-in zoom-in-95 duration-150">
                <div className="flex flex-col items-center text-center">
                    <div className="w-10 h-10 rounded-[8px] bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)] flex items-center justify-center mb-3">
                        <AlertCircle size={20} className="stroke-[1.5px]" />
                    </div>
                    <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">Unsaved Changes</h3>
                    <p className="text-[13px] text-[var(--text-secondary)] mb-5">You have unsaved modifications. Do you want to discard them and proceed?</p>
                    <div className="flex flex-col gap-2 w-full">
                        <button onClick={onConfirm} className="btn-primary w-full">Discard & Continue</button>
                        <button onClick={onClose} className="btn-secondary w-full">Stay & Save</button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default function App() {
  const { user, loading: authLoading, continueAsGuest, isAuthenticated, signOut } = useAuth();
  const mainRef = React.useRef<HTMLElement>(null);
  
  // Router-driven state
  const initialRoute = parseCurrentRoute();
  const [view, setView] = useState<ViewState>(initialRoute.view);
  const [activeSubTab, setActiveSubTab] = useState<string | undefined>(initialRoute.subTab);

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
    window.addEventListener('resize', handleResize);
    
    // Subscribe to router navigation events
    const unsubscribe = subscribeToRoutes((route) => {
      setView(route.view);
      if (route.subTab) {
        setActiveSubTab(route.subTab);
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      unsubscribe();
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
    
    // Sync canonical route with view and subTab
    navigateTo(view, activeSubTab, { replace: true });
  }, [view, activeSubTab]);

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
            const txId = `recurring_${rule.id}_${nextDue.getTime()}`;
            const alreadyExists = data.transactions.some(t => t.id === txId);
            
            if (!alreadyExists) {
              const newTx: Transaction = {
                  id: txId,
                  amount: rule.amount,
                  type: rule.type,
                  category: rule.category,
                  date: nextDue.toISOString(),
                  note: `[Recurring] ${rule.note || rule.name}`,
                  walletId: rule.walletId,
                  isSubscription: true
              };
              newTransactions = [newTx, ...newTransactions];
              hasChanges = true;
            }
            
            // Advance nextDueDate
            if (rule.frequency === 'DAILY') nextDue.setDate(nextDue.getDate() + 1);
            else if (rule.frequency === 'WEEKLY') nextDue.setDate(nextDue.getDate() + 7);
            else if (rule.frequency === 'MONTHLY') nextDue.setMonth(nextDue.getMonth() + 1);
            else if (rule.frequency === 'YEARLY') nextDue.setFullYear(nextDue.getFullYear() + 1);
            
            currentRule.nextDueDate = nextDue.toISOString().split('T')[0];
            currentRule.updated_at = new Date().toISOString();

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
         navigateTo('dashboard');
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

  const handleDeleteWallet = (id: string) => {
    if (!data) return;
    const remaining = data.wallets.filter(w => w.id !== id);
    if (remaining.length === 0) return; // never delete the last wallet
    const newCurrentId = id === data.currentWalletId ? remaining[0].id : data.currentWalletId;
    updateData({ wallets: remaining, currentWalletId: newCurrentId });
  };

  const handleAiAddCategory = (cat: Omit<import('./types').CategoryItem, 'id'>) => {
    if (!data) return;
    const newCat: import('./types').CategoryItem = { ...cat, id: `cat_${Date.now()}`, isSystem: false };
    updateData({ categories: [...(data.categories || []), newCat] });
  };

  const handleAiDeleteCategory = (id: string) => {
    if (!data) return;
    updateData({ categories: data.categories.filter(c => c.id !== id) });
  };

  const handleAiMergeCategory = (fromId: string, intoId: string) => {
    if (!data) return;
    const fromCat = data.categories.find(c => c.id === fromId);
    const intoCat = data.categories.find(c => c.id === intoId);
    if (!fromCat || !intoCat) return;
    // Remap all transactions from `from` to `into`
    const updatedTransactions = data.transactions.map(t =>
      t.category === fromCat.name ? { ...t, category: intoCat.name, updated_at: new Date().toISOString() } : t
    );
    // Remove the merged-from category
    const updatedCategories = data.categories.filter(c => c.id !== fromId);
    updateData({ transactions: updatedTransactions, categories: updatedCategories });
  };

  const handleAddTransaction = (t: Transaction) => {
    if (!data) return;
    
    const newTx = { ...t, updated_at: new Date().toISOString() };

    // Auto-create category if it does not exist in categories list
    let updatedCategories = data.categories || [];
    const normalizedCategory = (t.category || '').trim();
    if (normalizedCategory) {
      const catExists = updatedCategories.some(
        c => c.name.trim().toLowerCase() === normalizedCategory.toLowerCase()
      );
      if (!catExists) {
        const newCategoryItem: CategoryItem = {
          id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: normalizedCategory,
          type: t.type === TransactionType.INCOME ? TransactionType.INCOME : TransactionType.EXPENSE,
          icon: 'Tag',
          color: '#6366f1',
          isSystem: false
        };
        updatedCategories = [...updatedCategories, newCategoryItem];
      }
    }

    // Auto-Taxonomy update
    let newMap = { ...data.lastUsedCategoryMap };
    if (t.note) {
        newMap[t.note.trim().toLowerCase()] = t.category;
    }

    updateData({ 
        transactions: [newTx, ...data.transactions],
        categories: updatedCategories,
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
      AuditLogger.log('DEBT_PAY', debtId, `Payment of ${newPayment.amount} logged`, user?.id);
      updateData({ debts: updatedDebts });
  };
  
  const handleEditTransaction = (updatedTx: Transaction) => {
      if (!data) return;
      const tx = { ...updatedTx, updated_at: new Date().toISOString() };
      const updatedTransactions = data.transactions.map(t => t.id === tx.id ? tx : t);
      AuditLogger.log('TX_UPDATE', tx.id, `Updated ${tx.type} of ${tx.amount} (${tx.category})`, user?.id);
      updateData({ transactions: updatedTransactions });
      setIsAddOpen(false);
      setEditingTx(null);
  };

  const handleAddDebt = (debt: Debt) => {
      if (!data) return;
      const newDebt = { ...debt, updated_at: new Date().toISOString() };
      AuditLogger.log('DEBT_CREATE', newDebt.id, `Created debt for ${newDebt.person} of ${newDebt.amount}`, user?.id);
      updateData({ debts: [newDebt, ...data.debts] });
  };

  const handleTransfer = async (amount: number, fromId: string, toId: string, note: string, dateStr: string) => {
    if (!data) return;
    const timestamp = Date.now();
    const dateTime = getDateTime(dateStr);
    const now = new Date().toISOString();

    const fromWallet = data.wallets.find(w => w.id === fromId);
    const toWallet = data.wallets.find(w => w.id === toId);
    const fromCurr = fromWallet?.currency || data.settings.currencySymbol || '$';
    const toCurr = toWallet?.currency || data.settings.currencySymbol || '$';

    let receivedAmount = amount;
    if (fromCurr !== toCurr) {
      receivedAmount = await ExchangeRateService.convertAmount(amount, fromCurr, toCurr);
    }

    const txOut: Transaction = { 
      id: timestamp.toString(), 
      amount, 
      type: TransactionType.EXPENSE, 
      category: Category.TRANSFER, 
      date: dateTime, 
      note: `To: ${toWallet?.name || 'Wallet'} ${fromCurr !== toCurr ? `(Exchange: ${toCurr}${receivedAmount})` : ''} - ${note}`.trim(), 
      walletId: fromId, 
      updated_at: now 
    };

    const txIn: Transaction = { 
      id: (timestamp + 1).toString(), 
      amount: receivedAmount, 
      type: TransactionType.INCOME, 
      category: Category.TRANSFER, 
      date: dateTime, 
      note: `From: ${fromWallet?.name || 'Wallet'} ${fromCurr !== toCurr ? `(Exchange: ${fromCurr}${amount})` : ''} - ${note}`.trim(), 
      walletId: toId, 
      updated_at: now 
    };
    
    AuditLogger.log('TRANSFER', `${timestamp}`, `Transferred ${fromCurr}${amount} to ${toWallet?.name} (${toCurr}${receivedAmount})`, user?.id);
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

  const requestViewChange = (newView: ViewState, subTab?: string) => {
      if (isDirty) {
          setPendingView(newView);
          setIsUnsavedModalOpen(true);
      } else {
          setView(newView);
          if (subTab) setActiveSubTab(subTab);
          navigateTo(newView, subTab);
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
        <div className="h-screen w-full bg-[var(--bg-page)] text-main font-sans selection:bg-primary/30 transition-colors duration-300 flex flex-col lg:flex-row overflow-hidden relative">
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
        {/* Header - Mobile */}
        {!isDesktop && (
          <div className="flex-none pt-[calc(env(safe-area-inset-top,0px)+8px)] pb-2.5 px-4 bg-[var(--bg-surface)]/90 backdrop-blur-md border-b border-[var(--border-default)] z-40">
            <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
              {['rabbai', 'analytics', 'provisions', 'subscriptions', 'control', 'identity'].includes(view) ? (
                <>
                  <button 
                    onClick={() => {
                      Haptics.light();
                      requestViewChange('dashboard');
                    }}
                    className="flex items-center gap-1 text-[13px] font-medium text-[var(--accent-solid)] hover:opacity-80 active:scale-95 transition-all shrink-0 cursor-pointer"
                  >
                    <ChevronLeft size={16} strokeWidth={1.5} />
                    <span>Back</span>
                  </button>
                  <h1 className="text-[13px] font-medium text-[var(--text-primary)] tracking-tight">
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
                  <div className="w-[32px]" />
                </>
              ) : (
                <>
                  {/* Left: Wallet Selector Pill */}
                  <button 
                    onClick={() => {
                      Haptics.light();
                      setWalletSearchQuery('');
                      setIsWalletModalOpen(true);
                    }} 
                    className="flex items-center gap-1.5 bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] active:scale-95 transition-all h-[32px] px-2.5 rounded-[6px] border border-[var(--border-default)] max-w-[180px]"
                  >
                    <span className="w-2 h-2 rounded-full bg-[var(--accent-solid)] shrink-0" />
                    <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                      {data.wallets.find(w => w.id === data.currentWalletId)?.name || 'Wallet'}
                    </span>
                    <ChevronDown size={13} className="text-[var(--text-muted)] shrink-0 stroke-[1.5px]" />
                  </button>

                  <div className="flex items-center gap-1.5" />
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
                  rabbai: { title: 'RabbAi', icon: Sparkle },
                  dashboard: { title: 'Dashboard', icon: LayoutGrid },
                  history: { title: 'Transactions', icon: Activity },
                  analytics: { title: 'Analytics', icon: TrendingUp },
                  debts: { title: 'Debts & Loans', icon: HandCoins },
                  control: { title: 'Budgets & Categories', icon: Sliders },
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
                className="flex items-center gap-2 bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] active:scale-95 transition-all h-[32px] px-3 rounded-[6px] border border-[var(--border-default)] hover:border-[var(--border-active)] group cursor-pointer"
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
                className="btn btn--primary text-[12px] h-[32px] px-3.5 font-medium rounded-[6px] flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle size={15} className="btn__icon" /> Add Transaction
              </button>
            </div>
          </div>
        )}
        
        {/* Main Content */}
        <main 
          ref={mainRef}
          className={`flex-1 min-w-0 min-h-0 w-full ${
            isDesktop 
              ? 'max-w-none px-8 overflow-y-auto pb-4' 
              : 'max-w-md mx-auto px-3.5 overflow-y-auto overflow-x-hidden pt-3.5 pb-[calc(76px+env(safe-area-inset-bottom,0px))]'
          } relative`}
        >
          {isDesktop ? (
            <div className="w-full max-w-5xl mx-auto py-4 view-transition">
               {view === 'dashboard' && (
                  <DesktopDashboard 
                      data={data} 
                      setView={setView} 
                      updateData={updateData} 
                      formatMoney={formatMoney} 
                      onAddTransactionRequest={(t, q) => openAddModal(undefined, t, q)} 
                      onEditTransaction={openEditModal}
                      onDeleteTemplate={handleDeleteTemplate}
                      onAddTransaction={handleAddTransaction}
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
                  <DesktopIdentity 
                    data={data} 
                    updateData={updateData} 
                    formatMoney={formatMoney} 
                    onDirtyChange={setIsDirty} 
                    onLogout={signOut} 
                    initialTab={activeSubTab as any}
                    onTabChange={(tab) => {
                      setActiveSubTab(tab);
                      navigateTo('identity', tab);
                    }}
                  />
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
                          onAddTransaction={handleAddTransaction}
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
                      <DesktopIdentity 
                        data={data} 
                        updateData={updateData} 
                        formatMoney={formatMoney} 
                        onDirtyChange={setIsDirty} 
                        onLogout={signOut} 
                        initialTab={activeSubTab as any}
                        onTabChange={(tab) => {
                          setActiveSubTab(tab);
                          navigateTo('identity', tab);
                        }}
                      />
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
          <div className="fixed inset-0 z-[5000] pointer-events-auto">
            {/* Transparent click-away backdrop: does NOT dim screen */}
            <div className="fixed inset-0 bg-transparent" onClick={() => setIsWalletModalOpen(false)} />
            
            {/* Popover anchored directly below wallet trigger: left on mobile, right on desktop */}
            <div className="absolute left-3 top-[calc(50px+env(safe-area-inset-top,0px))] md:left-auto md:right-8 lg:right-[260px] md:top-[52px] w-[calc(100vw-24px)] max-w-[270px] md:w-[260px] bg-[var(--bg-surface)] rounded-[10px] border border-[var(--border-default)] shadow-[0_16px_40px_rgba(0,0,0,0.65),0_2px_8px_rgba(0,0,0,0.4)] z-10 text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-150 p-1.5 space-y-1">

              {/* Top Search Input (single field, no nested inner box) */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none stroke-[1.5px]" />
                <input 
                  type="text" 
                  placeholder="Search wallets..." 
                  value={walletSearchQuery}
                  onChange={(e) => setWalletSearchQuery(e.target.value)}
                  className="w-full h-[32px] bg-[var(--field-bg)] border border-[var(--field-border)] focus:border-[var(--field-border-focus)] rounded-[6px] pl-8 pr-2.5 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all font-normal"
                  autoFocus
                />
              </div>

              {/* Wallet List (no divider lines) */}
              <div className="max-h-[220px] overflow-y-auto space-y-0.5 no-scrollbar py-0.5">
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
                        className={`w-full h-[32px] px-2.5 flex items-center justify-between rounded-[6px] text-[12px] transition-colors ${
                          isSelected 
                            ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium' 
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] font-normal'
                        }`}
                      >
                        <span className="truncate">{w.name}</span>
                        {isSelected && <Check size={13} className="text-[var(--text-primary)] shrink-0 stroke-[2px]" />}
                      </button>
                    );
                  })}
              </div>

              {/* Create Wallet Button (no top divider line) */}
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
                className="w-full h-[30px] px-2.5 flex items-center gap-2 rounded-[6px] text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors"
              >
                <Plus size={13} className="stroke-[1.5px]" />
                <span>Create Wallet</span>
              </button>
            </div>
          </div>
        )}

        {/* Create Wallet Modal (2-Step Flow) */}
        {isCreateWalletModalOpen && createPortal(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150" onClick={() => setIsCreateWalletModalOpen(false)} />
            
            <div className="relative w-full max-w-[460px] bg-[var(--bg-surface)] rounded-[12px] p-6 border border-[var(--border-default)] shadow-2xl z-10 text-[var(--text-primary)] animate-in zoom-in-95 duration-150 space-y-4">
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">Create a Wallet</h3>
                  <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                    {createWalletStep === 1 ? 'Step 1 of 2: Enter wallet name' : `Step 2 of 2: Configuration for "${newWalletName}"`}
                  </p>
                </div>
                <button 
                  onClick={() => setIsCreateWalletModalOpen(false)}
                  className="btn btn--outline btn--icon-sm shrink-0"
                >
                  <X size={15} strokeWidth={1.5} />
                </button>
              </div>

              {/* Step 1: Wallet Name Input & Callout Banner */}
              {createWalletStep === 1 ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 relative">
                      <label className="text-[13px] font-medium text-[var(--text-primary)]">Wallet name</label>
                      <div className="relative group cursor-pointer inline-flex items-center">
                        <Info size={14} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-[240px] px-3 py-2 rounded-[6px] bg-[#1a1a1e] border border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] shadow-xl z-50 pointer-events-none">
                          You can rename the Wallet at any time in settings
                        </div>
                      </div>
                    </div>
                    <input 
                      type="text" 
                      value={newWalletName}
                      onChange={(e) => setNewWalletName(e.target.value)}
                      placeholder="My Wallet" 
                      className="w-full h-[40px] px-3.5 rounded-[6px] bg-[var(--field-bg)] border border-[var(--field-border)] outline-none text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 transition-colors"
                      autoFocus
                    />
                  </div>

                  {/* Info Callout Banner */}
                  <div className="p-3 rounded-[8px] bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5 text-[12px] text-blue-400 leading-relaxed">
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0 mt-0.5 font-bold text-[10px]">i</div>
                    <span>This Wallet will be created with default settings. You can customize currency, target goals, and color theme anytime.</span>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setIsCreateWalletModalOpen(false)}
                      className="btn btn--outline h-[32px] px-3.5 text-[12px]"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      disabled={!newWalletName.trim()}
                      onClick={() => {
                        if (newWalletName.trim()) setCreateWalletStep(2);
                      }}
                      className="btn btn--primary h-[32px] px-4 text-[12px]"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              ) : (
                /* Step 2: Currency, Savings Goal & Theme Color (loads in same modal) */
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-medium text-[var(--text-primary)]">Wallet Currency</label>
                    <div className="tabs flex">
                      {['৳', '$', '€', '£'].map(curr => (
                        <button 
                          key={curr} 
                          type="button"
                          onClick={() => setNewWalletCurrency(curr)}
                          className={`tab flex-1 justify-center ${newWalletCurrency === curr ? 'is-active' : ''}`}
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
                      <label htmlFor="modalIsGoal" className="text-[13px] font-medium text-[var(--text-primary)] cursor-pointer select-none">Savings Goal</label>
                    </div>
                    {newWalletIsGoal && (
                      <input 
                        type="number" 
                        value={newWalletTarget || ''}
                        onChange={(e) => setNewWalletTarget(parseFloat(e.target.value) || 0)}
                        placeholder="Target Amount..."
                        className="w-full h-[36px] px-3 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[12px] font-mono text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]/50"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1">
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
                          className={`w-6 h-6 rounded-full relative transition-all ${
                            newWalletColor === col.name 
                              ? 'ring-2 ring-white ring-offset-2 ring-offset-[#141417] scale-110' 
                              : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: col.color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setCreateWalletStep(1)}
                      className="btn btn--outline h-[32px] px-3.5 text-[12px]"
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
                      className="btn btn--primary h-[32px] px-4 text-[12px]"
                    >
                      Finish & Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
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
            storedHash={data.settings.vaultPasscode} 
            storedSalt={data.settings.vaultSalt}
            onUnlock={() => { setIsLocked(false); Haptics.success(); }} 
            onMigratePasscode={(newHash, newSalt) => {
              updateData({
                settings: {
                  ...data.settings,
                  vaultPasscode: newHash,
                  vaultSalt: newSalt
                }
              });
            }}
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
