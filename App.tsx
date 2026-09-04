import React, { useState, useEffect, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Transaction, ViewState, TransactionType, AppData, Wallet, WalletType, Debt, TransactionTemplate, DebtPayment, Category, CategoryItem, ThemeOption } from './types';
import { PredictiveEngine } from './services/PredictiveEngine';
import * as StorageService from './services/storage';
import { DashboardView } from './components/DashboardView';
import { AddTransactionModal } from './components/AddTransactionModal';
import { DesktopDashboard } from './components/pc/DesktopDashboard';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { VaultLock } from './components/VaultLock';
import { loadRabbAiConversations, saveRabbAiConversations, RabbAiConversation } from './services/rabbAiService';

// Route Code-Splitting with React.lazy
const RabbAiView = React.lazy(() => import('./components/views/RabbAiView').then(m => ({ default: m.RabbAiView })));
const HistoryView = React.lazy(() => import('./components/HistoryView').then(m => ({ default: m.HistoryView })));
const DebtView = React.lazy(() => import('./components/DebtView').then(m => ({ default: m.DebtView })));
const AnalyticsView = React.lazy(() => import('./components/AnalyticsView').then(m => ({ default: m.AnalyticsView })));
const DesktopIdentity = React.lazy(() => import('./components/pc/DesktopManagement').then(m => ({ default: m.DesktopIdentity })));
const DesktopControl = React.lazy(() => import('./components/pc/DesktopManagement').then(m => ({ default: m.DesktopControl })));
const ProvisioningCenter = React.lazy(() => import('./components/ProvisioningCenter').then(m => ({ default: m.ProvisioningCenter })));
const SubscriptionManager = React.lazy(() => import('./components/SubscriptionManager').then(m => ({ default: m.SubscriptionManager })));
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
  SquaresFour as LayoutGrid, TrendUp as TrendingUp, ArrowDownRight, HandCoins, Sliders, Calendar, UserCircle, MagnifyingGlass as Search, Info,
  Eye, EyeSlash as EyeOff, Sparkle, List, ClockCounterClockwise, Wallet as WalletIcon, Key, NotePencil
} from '@phosphor-icons/react';
import { AiStarIcon } from './components/shared/AiStarIcon';
import { SpotifyIcon } from './components/shared/SpotifyIcon';
import { parseCurrentRoute, subscribeToRoutes, navigateTo } from './src/services/router';
import { CategoryIcon } from './components/shared/CategoryIcon';
import { getDateTime, formatMoney } from './utils/formatters';
import { AppSkeleton } from './components/ui/Skeletons';
import { useAuth } from './hooks/useAuth';
import { AuthScreen } from './components/AuthScreen';
import { syncEngine } from './services/SyncEngine';
import { ExchangeRateService } from './services/ExchangeRateService';
import { AuditLogger } from './services/auditLog';
import { validateAmount, sanitizeNote } from './utils/validation';

import { DeleteConfirmationModal, UnsavedChangesModal } from './components/shared/ConfirmModals';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useRecurringEngine } from './hooks/useRecurringEngine';
import { useNetWorth } from './hooks/useNetWorth';
import { useStreaks } from './hooks/useStreaks';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: string | null;
    itemDetails?: { title?: string; amount?: string | number; category?: string; date?: string };
  }>({ isOpen: false, id: null });
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
  const [newWalletColor, setNewWalletColor] = useState<ThemeOption>('amber');
  const [isStealthActive, setIsStealthActive] = useState(false);
  const [undoToast, setUndoToast] = useState<{ tx: Transaction; expiresAt: number } | null>(null);

  // RabbAi Conversation & Query State
  const [conversations, setConversations] = useState<RabbAiConversation[]>(() => loadRabbAiConversations());
  const [activeConvId, setActiveConvId] = useState<string>(() => {
    const loaded = loadRabbAiConversations();
    return loaded[0]?.id || '';
  });
  const [rabbaiPendingQuery, setRabbaiPendingQuery] = useState<{ text: string; image?: string } | null>(null);
  const [isRabbaiConvDropdownOpen, setIsRabbaiConvDropdownOpen] = useState(false);
  const rabbaiDropdownRef = useRef<HTMLDivElement>(null);
  const rabbaiDesktopDropdownRef = useRef<HTMLDivElement>(null);

  const activeRabbAiConv = conversations.find(c => c.id === activeConvId) || conversations[0];

  const handleCreateNewRabbAiConversation = () => {
    Haptics.light();
    const newConv: RabbAiConversation = {
      id: `conv_${Date.now()}`,
      title: 'New conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [newConv, ...conversations];
    setConversations(updated);
    saveRabbAiConversations(updated);
    setActiveConvId(newConv.id);
    setIsRabbaiConvDropdownOpen(false);
    return newConv.id;
  };

  const handleOpenRabbAiWithQuery = (q: { text: string; image?: string }) => {
    Haptics.light();
    const newConvId = `conv_${Date.now()}`;
    const newConv: RabbAiConversation = {
      id: newConvId,
      title: q.text ? q.text.slice(0, 32) : 'New conversation',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const updated = [newConv, ...conversations];
    setConversations(updated);
    saveRabbAiConversations(updated);
    setActiveConvId(newConvId);
    setRabbaiPendingQuery(q);
    requestViewChange('rabbai');
  };

  const handleDeleteRabbAiConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Haptics.light();
    const filtered = conversations.filter(c => c.id !== id);
    if (filtered.length === 0) {
      const fresh: RabbAiConversation = {
        id: `conv_${Date.now()}`,
        title: 'New conversation',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setConversations([fresh]);
      saveRabbAiConversations([fresh]);
      setActiveConvId(fresh.id);
    } else {
      setConversations(filtered);
      saveRabbAiConversations(filtered);
      if (activeConvId === id) {
        setActiveConvId(filtered[0].id);
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (!rabbaiDropdownRef.current || !rabbaiDropdownRef.current.contains(target)) &&
        (!rabbaiDesktopDropdownRef.current || !rabbaiDesktopDropdownRef.current.contains(target))
      ) {
        setIsRabbaiConvDropdownOpen(false);
      }
    };
    if (isRabbaiConvDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isRabbaiConvDropdownOpen]);

  // Notification Toast State
  const [notificationToast, setNotificationToast] = useState<{ message: string; type?: 'error' | 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    setNotificationToast({ message, type });
    Haptics.warning();
  };

  useEffect(() => {
    if (!notificationToast) return;
    const timer = setTimeout(() => setNotificationToast(null), 4000);
    return () => clearTimeout(timer);
  }, [notificationToast]);

  useEffect(() => {
    if (!undoToast) return;
    const remaining = undoToast.expiresAt - Date.now();
    if (remaining <= 0) {
      setUndoToast(null);
      return;
    }
    const timer = setTimeout(() => setUndoToast(null), remaining);
    return () => clearTimeout(timer);
  }, [undoToast]);

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
        // 7. Add all categories to sync queue
        for (const cat of localData.categories) {
          await syncEngine.push('categories', 'INSERT', cat);
        }
        // 8. Update profile and settings
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
      rabbai: 'RabbAi Assistant',
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
  // Global Navigation Hotkeys & Stealth Panic Listeners
  useKeyboardShortcuts({
    isDesktop,
    stealthModeEnabled: data?.settings.stealthModeEnabled,
    stealthHotkey: data?.settings.stealthHotkey,
    isStealthActive,
    setIsStealthActive,
    onOpenAdd: () => setIsAddOpen(true),
    onNavigate: (newView) => requestViewChange(newView),
    onToggleCommandPalette: () => setIsCommandPaletteOpen(prev => !prev)
  });

  useEffect(() => {
    if (data) {
      StorageService.saveAppData(data);
      const classes = [
        'theme-orange',
        data.settings.darkMode ? '' : 'light-mode',
        isDesktop ? 'desktop-ui' : ''
      ].filter(Boolean).join(' ');
      document.body.className = classes;
    }
  }, [data, isDesktop]);

  const hasEntityChanged = (prevObj: any, nextObj: any): boolean => {
    if (prevObj === nextObj) return false;
    if (!prevObj || !nextObj) return true;
    if (prevObj.updated_at && nextObj.updated_at) {
      return prevObj.updated_at !== nextObj.updated_at;
    }
    const prevKeys = Object.keys(prevObj);
    const nextKeys = Object.keys(nextObj);
    if (prevKeys.length !== nextKeys.length) return true;
    for (const k of prevKeys) {
      if (prevObj[k] !== nextObj[k]) {
        if (typeof prevObj[k] === 'object' && prevObj[k] !== null) {
          if (JSON.stringify(prevObj[k]) !== JSON.stringify(nextObj[k])) return true;
        } else {
          return true;
        }
      }
    }
    return false;
  };

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
            } else if (hasEntityChanged(prevW, w)) {
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
            } else if (hasEntityChanged(prevT, t)) {
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
            } else if (hasEntityChanged(prevD, d)) {
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
            } else if (hasEntityChanged(prevR, r)) {
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
            } else if (hasEntityChanged(prevP, p)) {
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
            } else if (hasEntityChanged(prevT, t)) {
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

        // 10. Categories diff
        if (newData.categories && newData.categories !== prev.categories) {
          const prevMap = new Map(prev.categories.map(c => [c.id, c]));
          const nextMap = new Map(newData.categories.map(c => [c.id, c]));
          newData.categories.forEach(c => {
            const prevC = prevMap.get(c.id);
            if (!prevC) {
              syncEngine.push('categories', 'INSERT', c);
            } else if (hasEntityChanged(prevC, c)) {
              syncEngine.push('categories', 'UPDATE', c);
            }
          });
          prev.categories.forEach(c => {
            if (!nextMap.has(c.id)) {
              syncEngine.push('categories', 'DELETE', c);
            }
          });
        }
      }

      return { ...prev, ...newData };
    });
  };

  // Net Worth Snapshot Logic with Multi-Currency Normalization
  useNetWorth({ data, updateData });

  // Recurring Transaction Engine with Visibility & Heartbeat Interval
  useRecurringEngine({ data, updateData });

  // Spending Streaks Engine
  useStreaks({ data, updateData });

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
    const newWallet: Wallet = { id: crypto.randomUUID(), name, type, targetAmount: target, currency, color, updated_at: new Date().toISOString() };
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
    const newCat: import('./types').CategoryItem = { ...cat, id: `cat_${crypto.randomUUID()}`, isSystem: false };
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
    
    const valid = validateAmount(t.amount);
    if (!valid.isValid) {
      showToast(valid.error || 'Invalid amount');
      return;
    }

    const newTx: Transaction = { 
      ...t, 
      id: t.id ? String(t.id) : `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      amount: valid.sanitizedAmount, 
      note: sanitizeNote(t.note), 
      updated_at: new Date().toISOString() 
    };

    // Auto-create category if it does not exist in categories list
    let updatedCategories = data.categories || [];
    const normalizedCategory = (t.category || '').trim();
    if (normalizedCategory) {
      const catExists = updatedCategories.some(
        c => c.name.trim().toLowerCase() === normalizedCategory.toLowerCase()
      );
      if (!catExists) {
        const newCategoryItem: CategoryItem = {
          id: `cat_${crypto.randomUUID()}`,
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
    AuditLogger.log('TX_CREATE', newTx.id, `Created ${newTx.type} of ${newTx.amount} (${newTx.category})`, user?.id);
    
    setIsAddOpen(false);
    Haptics.success();
  };

  const handleSaveTemplate = (template: Omit<TransactionTemplate, 'id'>) => {
      if (!data) return;
      const valid = validateAmount(template.amount);
      const newTemplate = { 
        ...template, 
        amount: valid.isValid ? valid.sanitizedAmount : template.amount, 
        id: crypto.randomUUID(), 
        updated_at: new Date().toISOString() 
      };
      updateData({ templates: [newTemplate, ...data.templates] });
  };

  const handleDeleteTemplate = (id: string) => {
      if (!data) return;
      const tpl = data.templates.find(t => t.id === id);
      updateData({ templates: data.templates.filter(tpl => tpl.id !== id) });
  };

  const handleDebtPayment = (debtId: string, payment: Omit<DebtPayment, 'id'>) => {
      if (!data) return;
      const valid = validateAmount(payment.amount);
      if (!valid.isValid) {
        showToast(valid.error || 'Invalid payment amount');
        return;
      }
      const newPayment = { ...payment, amount: valid.sanitizedAmount, id: crypto.randomUUID() };
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
      const valid = validateAmount(updatedTx.amount);
      if (!valid.isValid) {
        showToast(valid.error || 'Invalid amount');
        return;
      }
      const tx = { 
        ...updatedTx, 
        amount: valid.sanitizedAmount, 
        note: sanitizeNote(updatedTx.note), 
        updated_at: new Date().toISOString() 
      };
      const updatedTransactions = data.transactions.map(t => t.id === tx.id ? tx : t);
      AuditLogger.log('TX_UPDATE', tx.id, `Updated ${tx.type} of ${tx.amount} (${tx.category})`, user?.id);
      updateData({ transactions: updatedTransactions });
      setIsAddOpen(false);
      setEditingTx(null);
  };

  const triggerDeleteConfirmation = (id: string) => {
    const tx = data?.transactions.find(t => t.id === id);
    setDeleteConfirmation({
      isOpen: true,
      id,
      itemDetails: tx ? {
        title: tx.note || tx.category,
        amount: `${data?.settings.currencySymbol || '$'}${tx.amount.toFixed(2)}`,
        category: tx.category,
        date: tx.date
      } : undefined
    });
  };

  const handleAddDebt = (debt: Debt) => {
      if (!data) return;
      const valid = validateAmount(debt.amount);
      if (!valid.isValid) {
        showToast(valid.error || 'Invalid debt amount');
        return;
      }
      const newDebt = { ...debt, amount: valid.sanitizedAmount, updated_at: new Date().toISOString() };
      AuditLogger.log('DEBT_CREATE', newDebt.id, `Created debt for ${newDebt.person} of ${newDebt.amount}`, user?.id);
      updateData({ debts: [newDebt, ...data.debts] });
  };

  const handleTransfer = async (amount: number, fromId: string, toId: string, note: string, dateStr: string) => {
    if (!data) return;

    const valid = validateAmount(amount);
    if (!valid.isValid) {
      showToast(valid.error || 'Invalid transfer amount');
      return;
    }
    const transferAmount = valid.sanitizedAmount;

    const fromWallet = data.wallets.find(w => w.id === fromId);
    const toWallet = data.wallets.find(w => w.id === toId);
    const fromCurr = fromWallet?.currency || data.settings.currencySymbol || '$';
    const toCurr = toWallet?.currency || data.settings.currencySymbol || '$';

    // Transfer Balance Guard: Check source wallet balance
    const fromWalletTxs = data.transactions.filter(t => t.walletId === fromId);
    const fromBalance = fromWalletTxs.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0)
      - fromWalletTxs.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
    if (transferAmount > fromBalance) {
      showToast(`Notice: Transfer amount exceeds available balance in ${fromWallet?.name || 'wallet'}.`, 'info');
    }

    const timestamp = Date.now();
    const dateTime = getDateTime(dateStr);
    const now = new Date().toISOString();

    let receivedAmount = transferAmount;
    if (fromCurr !== toCurr) {
      receivedAmount = await ExchangeRateService.convertAmount(transferAmount, fromCurr, toCurr);
    }

    const outId = crypto.randomUUID();
    const inId = crypto.randomUUID();

    const txOut: Transaction = { 
      id: outId, 
      amount: transferAmount, 
      type: TransactionType.EXPENSE, 
      category: Category.TRANSFER, 
      date: dateTime, 
      note: `To: ${toWallet?.name || 'Wallet'} ${fromCurr !== toCurr ? `(Exchange: ${toCurr}${receivedAmount})` : ''} - ${note}`.trim(), 
      walletId: fromId, 
      updated_at: now 
    };

    const txIn: Transaction = { 
      id: inId, 
      amount: receivedAmount, 
      type: TransactionType.INCOME, 
      category: Category.TRANSFER, 
      date: dateTime, 
      note: `From: ${fromWallet?.name || 'Wallet'} ${fromCurr !== toCurr ? `(Exchange: ${fromCurr}${amount})` : ''} - ${note}`.trim(), 
      walletId: toId, 
      updated_at: now 
    };
    
    AuditLogger.log('TRANSFER', outId, `Transferred ${fromCurr}${amount} to ${toWallet?.name} (${toCurr}${receivedAmount})`, user?.id);
    updateData({ transactions: [txIn, txOut, ...data.transactions] });
    setIsAddOpen(false);
  };

  const handleUndoDelete = () => {
    if (undoToast?.tx && data) {
      updateData({ transactions: [undoToast.tx, ...data.transactions] });
      AuditLogger.log('TX_RESTORE', undoToast.tx.id, `Restored deleted transaction ${undoToast.tx.category}`, user?.id);
      setUndoToast(null);
      Haptics.success();
    }
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
      if (newView === 'rabbai' && view !== 'rabbai') {
        // If user left conversation and is now tapping on AI, open in a new conversation
        if (activeRabbAiConv && activeRabbAiConv.messages.length > 0) {
          const newConvId = `conv_${Date.now()}`;
          const newConv: RabbAiConversation = {
            id: newConvId,
            title: 'New conversation',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          const updated = [newConv, ...conversations];
          setConversations(updated);
          saveRabbAiConversations(updated);
          setActiveConvId(newConvId);
        }
      }
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
        <div className="h-full h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-full bg-[var(--bg-page)] text-main font-sans selection:bg-primary/30 transition-colors duration-300 flex flex-col lg:flex-row overflow-hidden relative">
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
      
      <div className={`flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden h-full relative z-10 ${view === 'rabbai' ? 'dot-matrix-canvas' : ''}`}>
        {/* Header - Mobile (Cloudflare Technical Design) */}
        {!isDesktop && (
          <header className="flex-none pt-[calc(env(safe-area-inset-top,0px)+6px)] pb-2 px-3 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-default)] z-40 select-none">
            <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
              {view === 'rabbai' ? (
                <>
                  {/* Left: New conversation dropdown (container-free) */}
                  <div className="flex items-center gap-1 min-w-0">
                    <div ref={rabbaiDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsRabbaiConvDropdownOpen(!isRabbaiConvDropdownOpen)}
                        className="flex items-center gap-1 text-[13px] font-medium text-[var(--text-primary)] hover:text-white py-1 px-1 cursor-pointer transition-colors"
                      >
                        <span className="truncate max-w-[170px]">{activeRabbAiConv?.title || 'New conversation'}</span>
                        <ChevronDown size={12} className="text-[var(--text-muted)] shrink-0 stroke-[1.5px]" />
                      </button>

                      {/* Dropdown Popover */}
                      {isRabbaiConvDropdownOpen && (
                        <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#141418] border border-[var(--border-default)] rounded-[8px] shadow-2xl p-1.5 z-50 text-[12px] animate-in fade-in zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={handleCreateNewRabbAiConversation}
                            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[6px] text-[var(--text-primary)] hover:bg-white/5 font-medium cursor-pointer transition-colors border-b border-[var(--border-default)] mb-1"
                          >
                            <NotePencil size={14} strokeWidth={1.5} />
                            <span>New conversation</span>
                          </button>

                          <div className="max-h-56 overflow-y-auto space-y-0.5 no-scrollbar">
                            {conversations.map(c => {
                              const isActive = c.id === activeConvId;
                              return (
                                <div
                                  key={c.id}
                                  onClick={() => {
                                    setActiveConvId(c.id);
                                    setIsRabbaiConvDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] cursor-pointer transition-colors group ${
                                    isActive ? 'bg-white/10 text-white font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <ClockCounterClockwise size={12} className="shrink-0 text-[var(--text-muted)]" />
                                    <span className="truncate">{c.title || 'Conversation'}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteRabbAiConversation(c.id, e)}
                                    className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 p-0.5 transition-opacity"
                                    title="Delete chat"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: NotePencil (new conversation) and ✕ (close / return to dashboard) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={handleCreateNewRabbAiConversation}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
                      title="New conversation"
                    >
                      <NotePencil size={18} strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => requestViewChange('dashboard')}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
                      title="Close RabbAi"
                    >
                      <X size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Left: Container-Free Navigation & Wallet Dropdown (with Wallet Icon, NO page title) */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        Haptics.light();
                        setIsSidebarOpen(prev => !prev);
                      }}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
                      title={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
                    >
                      <div className="relative w-5 h-5 flex items-center justify-center pointer-events-none">
                        <span
                          className={`absolute h-[1.5px] w-4 bg-current rounded-full transition-all duration-300 ease-in-out ${
                            isSidebarOpen ? 'rotate-45 translate-y-0' : '-translate-y-1.5'
                          }`}
                        />
                        <span
                          className={`absolute h-[1.5px] w-4 bg-current rounded-full transition-all duration-200 ease-in-out ${
                            isSidebarOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
                          }`}
                        />
                        <span
                          className={`absolute h-[1.5px] w-4 bg-current rounded-full transition-all duration-300 ease-in-out ${
                            isSidebarOpen ? '-rotate-45 translate-y-0' : 'translate-y-1.5'
                          }`}
                        />
                      </div>
                    </button>

                    {/* Wallet Dropdown with Wallet Icon (Container-Free) */}
                    <button 
                      type="button"
                      onClick={() => {
                        Haptics.light();
                        setWalletSearchQuery('');
                        setIsWalletModalOpen(true);
                      }} 
                      className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-colors cursor-pointer py-1 px-1"
                      title="Switch wallet"
                    >
                      <WalletIcon size={16} strokeWidth={1.5} className="text-[var(--text-secondary)] shrink-0" />
                      <span className="truncate max-w-[125px]">
                        {data.wallets.find(w => w.id === data.currentWalletId)?.name || 'Wallet'}
                      </span>
                      <ChevronDown size={12} className="text-[var(--text-muted)] shrink-0 stroke-[1.5px]" />
                    </button>
                  </div>

                  {/* Right: AI Icon (Opens RabbAi) + Search Icon (All Container-Free) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button 
                      type="button"
                      onClick={() => {
                        Haptics.light();
                        requestViewChange('rabbai');
                      }}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
                      title="Open RabbAi Assistant"
                    >
                      <AiStarIcon size={19} strokeWidth={1.5} />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        Haptics.light();
                        setIsCommandPaletteOpen(true);
                      }}
                      className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
                      title="Quick search (Ctrl+K)"
                    >
                      <Search size={18} strokeWidth={1.5} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </header>
        )}

        {isDesktop && (
          <div className="flex-none h-[52px] bg-transparent flex items-center justify-between px-8 relative z-50">
            {view === 'rabbai' ? (
              <div className="flex items-center justify-between w-full">
                {/* Left: New conversation dropdown */}
                <div ref={rabbaiDesktopDropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsRabbaiConvDropdownOpen(!isRabbaiConvDropdownOpen)}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-primary)] hover:text-white py-1 px-2 rounded-[6px] hover:bg-white/5 cursor-pointer"
                  >
                    <span className="truncate max-w-[280px]">{activeRabbAiConv?.title || 'New conversation'}</span>
                    <ChevronDown size={12} className="text-[var(--text-muted)] shrink-0 stroke-[1.5px]" />
                  </button>

                  {/* Dropdown Popover */}
                  {isRabbaiConvDropdownOpen && (
                    <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#141418] border border-[var(--border-default)] rounded-[8px] shadow-2xl p-1.5 z-50 text-[12px] animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={handleCreateNewRabbAiConversation}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-[6px] text-[var(--text-primary)] hover:bg-white/5 font-medium cursor-pointer transition-colors border-b border-[var(--border-default)] mb-1"
                      >
                        <NotePencil size={14} strokeWidth={1.5} />
                        <span>New conversation</span>
                      </button>

                      <div className="max-h-56 overflow-y-auto space-y-0.5 no-scrollbar">
                        {conversations.map(c => {
                          const isActive = c.id === activeConvId;
                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                setActiveConvId(c.id);
                                setIsRabbaiConvDropdownOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] cursor-pointer transition-colors group ${
                                isActive ? 'bg-white/10 text-white font-medium' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <ClockCounterClockwise size={12} className="shrink-0 text-[var(--text-muted)]" />
                                <span className="truncate">{c.title || 'Conversation'}</span>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteRabbAiConversation(c.id, e)}
                                className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 p-0.5 transition-opacity"
                                title="Delete chat"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* AI Provider Key Setup */}
                      <div className="pt-1 mt-1 border-t border-[var(--border-default)]">
                        <button
                          type="button"
                          onClick={() => {
                            const currentKey = localStorage.getItem('trackxpense_groq_api_key') || data.settings?.groqApiKey || '';
                            const key = window.prompt('Enter free Groq API Key (gsk_...) or Gemini Key (AIza...):', currentKey);
                            if (key !== null) {
                              const trimmed = key.trim();
                              if (trimmed.startsWith('AIza')) {
                                localStorage.setItem('trackxpense_gemini_api_key', trimmed);
                              } else if (trimmed) {
                                localStorage.setItem('trackxpense_groq_api_key', trimmed);
                              } else {
                                localStorage.removeItem('trackxpense_groq_api_key');
                                localStorage.removeItem('trackxpense_gemini_api_key');
                              }
                              updateData({ settings: { ...data.settings, groqApiKey: trimmed } });
                            }
                            setIsRabbaiConvDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <Key size={13} strokeWidth={1.5} />
                          <span>AI Provider Key</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: + New Chat */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCreateNewRabbAiConversation}
                    className="h-[32px] px-2.5 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    <NotePencil size={14} strokeWidth={1.5} />
                    <span>New conversation</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Left: Minimal Page Title with Icon */}
                <div className="flex items-center gap-2">
                  {(() => {
                    const pageConfig: Record<string, { title: string; icon: React.ElementType }> = {
                      dashboard: { title: 'Overview', icon: LayoutGrid },
                      history: { title: 'Ledger', icon: Activity },
                      debts: { title: 'Debts & Loans', icon: HandCoins },
                      analytics: { title: 'Analytics & Trends', icon: TrendingUp },
                      control: { title: 'Budgets & Categories', icon: Sliders },
                      provisions: { title: 'Upcoming Expenses', icon: Calendar },
                      subscriptions: { title: 'Subscriptions', icon: SpotifyIcon },
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

                {/* Right: Utilities (No synced indicator) */}
                <div className="flex items-center gap-3">
                  {/* Current Wallet Selector Pill */}
                  <button 
                    onClick={() => {
                      setWalletSearchQuery('');
                      setIsWalletModalOpen(true);
                    }} 
                    className="flex items-center gap-2 bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] active:scale-95 transition-all h-[32px] px-3 rounded-[6px] border border-[var(--border-default)] hover:border-[var(--border-active)] group cursor-pointer"
                    title="Switch wallet"
                  >
                    <WalletIcon size={14} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors shrink-0" />
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      {data.wallets.find(w => w.id === data.currentWalletId)?.name}
                    </span>
                    <ChevronDown size={14} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                  </button>

                  <button 
                    onClick={() => openAddModal(undefined, TransactionType.EXPENSE)} 
                    className="btn btn--primary text-[12px] h-[32px] px-3.5 font-medium rounded-[6px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle size={15} className="btn__icon" /> Add Transaction
                  </button>
                </div>
              </>
            )}
          </div>
        )}
                {/* Main Content */}
        <main 
          ref={mainRef}
          className={`flex-1 min-w-0 min-h-0 w-full ${
            view === 'rabbai'
              ? 'max-w-none p-0 m-0 flex flex-col overflow-hidden'
              : isDesktop 
                ? 'max-w-none px-8 overflow-y-auto pb-4 no-scrollbar' 
                : 'max-w-md mx-auto px-3.5 overflow-y-auto overflow-x-hidden pt-2 sm:pt-3.5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] no-scrollbar'
          } relative`}
        >
          <ErrorBoundary>
          <Suspense fallback={<AppSkeleton />}>
          {isDesktop ? (
            view === 'rabbai' ? (
              <div className="w-full h-full flex-1 flex flex-col min-h-0 overflow-hidden max-w-none p-0 m-0 view-transition">
                 <RabbAiView
                    data={data}
                    updateData={updateData}
                    conversations={conversations}
                    activeConvId={activeConvId || conversations[0]?.id}
                    onUpdateConversations={(updated) => {
                      setConversations(updated);
                      saveRabbAiConversations(updated);
                    }}
                    onAddTransaction={handleAddTransaction}
                    onDeleteTransaction={(id) => updateData({ transactions: data.transactions.filter(t => t.id !== id) })}
                    onAddWallet={(name, type, target, curr) => handleAddWallet(name, type, target, curr)}
                    onDeleteWallet={handleDeleteWallet}
                    onAddCategory={handleAiAddCategory}
                    onDeleteCategory={handleAiDeleteCategory}
                    onMergeCategory={handleAiMergeCategory}
                    initialQuery={rabbaiPendingQuery?.text}
                    initialImage={rabbaiPendingQuery?.image}
                    onClearInitialQuery={() => setRabbaiPendingQuery(null)}
                    onSelectConversation={setActiveConvId}
                    onClose={() => requestViewChange('dashboard')}
                  />
              </div>
            ) : (
              <div className="w-full max-w-5xl py-4 mx-auto view-transition">
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
                        onOpenRabbAi={handleOpenRabbAiWithQuery}
                    />
                 )}
                 {view === 'history' && (
                    <HistoryView 
                        data={data} 
                        updateData={updateData} 
                        onRequestDelete={triggerDeleteConfirmation} 
                        formatMoney={formatMoney} 
                        onEditTransaction={openEditModal}
                        isDesktop={true}
                    />
                 )}
                  {view === 'debts' && (
                    <DebtView 
                        data={data} 
                        updateData={updateData} 
                        formatMoney={formatMoney} 
                        onSettleTransaction={handleAddTransaction}
                        onAddPayment={handleDebtPayment}
                        isDesktop={true}
                    />
                 )}
                 {view === 'analytics' && (
                    <AnalyticsView data={data} updateData={updateData} formatMoney={formatMoney} />
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
            )
          ) : (
            <>
              {view === 'rabbai' && (
                <div className="w-full h-full flex-1 flex flex-col min-h-0 overflow-hidden p-0 m-0 max-w-none view-transition">
                  <RabbAiView
                    data={data}
                    updateData={updateData}
                    conversations={conversations}
                    activeConvId={activeConvId || conversations[0]?.id}
                    onUpdateConversations={(updated) => {
                      setConversations(updated);
                      saveRabbAiConversations(updated);
                    }}
                    onAddTransaction={handleAddTransaction}
                    onDeleteTransaction={(id) => updateData({ transactions: data.transactions.filter(t => t.id !== id) })}
                    onAddWallet={(name, type, target, curr) => handleAddWallet(name, type, target, curr)}
                    onDeleteWallet={handleDeleteWallet}
                    onAddCategory={handleAiAddCategory}
                    onDeleteCategory={handleAiDeleteCategory}
                    onMergeCategory={handleAiMergeCategory}
                    initialQuery={rabbaiPendingQuery?.text}
                    initialImage={rabbaiPendingQuery?.image}
                    onClearInitialQuery={() => setRabbaiPendingQuery(null)}
                    onSelectConversation={setActiveConvId}
                    onClose={() => requestViewChange('dashboard')}
                  />
                </div>
              )}

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
                          onOpenRabbAi={(q) => {
                            const newConvId = `conv_${Date.now()}`;
                            setActiveConvId(newConvId);
                            setRabbaiPendingQuery(q);
                            requestViewChange('rabbai');
                          }}
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
                          onRequestDelete={triggerDeleteConfirmation} 
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
            </>
          )}
          </Suspense>
          </ErrorBoundary>
        </main>
      </div>



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
        itemDetails={deleteConfirmation.itemDetails}
        onConfirm={() => { 
            if (deleteConfirmation.id && data) { 
                const tx = data.transactions.find(t => t.id === deleteConfirmation.id);
                if (tx) {
                  AuditLogger.log('TX_DELETE', tx.id, `Deleted transaction ${tx.category} of ${tx.amount}`, user?.id);
                  setUndoToast({
                    tx,
                    expiresAt: Date.now() + 6000
                  });
                }
                updateData({ transactions: data.transactions.filter(t => t.id !== deleteConfirmation.id) });
                setDeleteConfirmation({ isOpen: false, id: null }); 
                Haptics.light();
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
                  setNewWalletColor('amber');
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
          <div className="fixed inset-0 z-[var(--z-modal,600)] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-150" onClick={() => setIsCreateWalletModalOpen(false)} />
            
            <div className="relative w-full max-w-[460px] bg-[var(--bg-surface)] rounded-[8px] p-6 border border-[var(--border-default)] shadow-2xl z-10 text-[var(--text-primary)] animate-in zoom-in-95 duration-150 space-y-4">
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
                  className="btn btn--outline btn--icon-sm shrink-0 cursor-pointer"
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
                      className="w-full h-[36px] px-3 rounded-[6px] bg-[var(--field-bg)] border border-[var(--border-default)] focus:border-[var(--accent)] outline-none text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 transition-colors"
                      autoFocus
                    />
                  </div>

                  {/* Info Callout Banner */}
                  <div className="p-3 rounded-[8px] bg-[var(--accent-bg-soft)] border border-[var(--accent)]/20 flex items-start gap-2.5 text-[12px] text-[var(--accent)] leading-relaxed">
                    <div className="w-4 h-4 rounded-full bg-[var(--accent)] flex items-center justify-center text-white shrink-0 mt-0.5 font-bold text-[10px]">i</div>
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
                        className="w-4 h-4 rounded border-[var(--border-default)] accent-[#F6821F] cursor-pointer"
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
                        { name: 'amber' as ThemeOption, color: '#F6821F' },
                        { name: 'emerald' as ThemeOption, color: '#30d158' },
                        { name: 'rose' as ThemeOption, color: '#ff453a' },
                        { name: 'blue' as ThemeOption, color: '#0a84ff' },
                        { name: 'indigo' as ThemeOption, color: '#5e5ce6' },
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
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[var(--z-toast,700)] flex items-center gap-3.5 bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-2xl px-4 py-2.5 rounded-[8px] animate-in fade-in slide-in-from-bottom-2 text-[12.5px] text-[var(--text-primary)]">
          <span className="text-[var(--text-secondary)]">Transaction deleted</span>
          <button
            onClick={handleUndoDelete}
            className="font-medium text-[var(--accent)] hover:underline cursor-pointer transition-colors"
          >
            Undo
          </button>
        </div>
      )}
      {notificationToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[var(--z-toast,700)] flex items-center gap-2.5 bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-2xl px-4 py-2.5 rounded-[8px] animate-in fade-in slide-in-from-bottom-2 text-[12.5px] text-[var(--text-primary)]">
          {notificationToast.type === 'error' && <AlertCircle size={16} className="text-[var(--status-error-fg)] shrink-0" />}
          {notificationToast.type === 'info' && <Info size={16} className="text-[var(--accent)] shrink-0" />}
          {notificationToast.type === 'success' && <Check size={16} className="text-[var(--status-success-fg)] shrink-0" />}
          <span>{notificationToast.message}</span>
        </div>
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
              id: `tx_${crypto.randomUUID()}`,
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
          onOpenRabbAi={handleOpenRabbAiWithQuery}
        />
      )}
    </div>
  );
}
