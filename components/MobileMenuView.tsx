import React, { useState, useRef } from 'react';
import {
  PieChart,
  Calendar,
  Ghost,
  TrendingUp,
  UserCircle,
  ChevronRight,
  ChevronLeft,
  Wallet as WalletIcon,
  Flame,
  Palette,
  Database,
  ShieldAlert,
  Fingerprint,
  LogOut,
  Trash2,
  Eye,
  EyeOff,
  Sun,
  Moon,
  FileSpreadsheet,
  FileJson,
  Upload,
  Check,
  Bell,
  AlertTriangle,
} from 'lucide-react';
import { ViewState, AppData, ThemeOption, Streak } from '../types';
import { Haptics } from '../services/haptics';
import { formatMoney } from '../utils/formatters';
import { CURRENCIES } from './shared/CommonUI';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';

interface MobileMenuViewProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  data: AppData;
  updateData?: (data: Partial<AppData>) => void;
  onLogout?: () => void;
}

type SubView = 'root' | 'profile' | 'appearance' | 'backup' | 'security' | 'privacy';

export const MobileMenuView: React.FC<MobileMenuViewProps> = ({
  currentView,
  onNavigate,
  data,
  updateData,
  onLogout,
}) => {
  const [activeSubView, setActiveSubView] = useState<SubView>('root');

  // Edit Profile States
  const [localName, setLocalName] = useState(data.profile.name || '');
  const [localMonthlyGoal, setLocalMonthlyGoal] = useState(data.profile.monthlyGoal || 0);
  const [localDailyGoal, setLocalDailyGoal] = useState(data.profile.dailyGoal || 0);
  const [profileSaved, setProfileSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (currentView === 'menu') {
      setActiveSubView('root');
    }
  }, [currentView]);



  const handleItemClick = (id: ViewState) => {
    Haptics.light();
    onNavigate(id);
  };

  const handleTogglePrivacyMode = () => {
    if (!updateData) return;
    Haptics.light();
    updateData({
      settings: {
        ...data.settings,
        privacyMode: !data.settings.privacyMode,
      },
    });
  };

  const handleToggleReminder = (type: 'expense' | 'debt') => {
    if (!updateData) return;
    Haptics.light();
    const updatedSettings = {
      ...data.settings,
      [type === 'expense' ? 'expenseReminders' : 'debtReminders']: !data.settings[
        type === 'expense' ? 'expenseReminders' : 'debtReminders'
      ],
    };
    updateData({ settings: updatedSettings });
  };

  // Calculate active wallet balance
  const activeWallet = data.wallets.find((w) => w.id === data.currentWalletId);
  const walletSymbol = activeWallet?.currency || data.settings.currencySymbol;

  const walletTransactions = data.transactions.filter((t) => t.walletId === data.currentWalletId);
  const totalIncome = walletTransactions.filter((t) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = walletTransactions.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const currentBalance = totalIncome - totalExpense;

  // Consistency / active streaks
  const streaksList = Object.values(data.streaks || {}) as Streak[];
  const maxStreak = streaksList.length > 0 ? Math.max(...streaksList.map((s) => s.current)) : 0;

  // CSV Data Export
  const exportToCSV = () => {
    Haptics.light();
    const txs = data.transactions.map((t) => ({
      Date: t.date,
      Type: t.type,
      Category: t.category,
      Amount: t.amount,
      Note: t.note || '',
      Wallet: data.wallets.find((w) => w.id === t.walletId)?.name || 'Default',
      Tags: (t.tags || []).join(', '),
      Status: t.isPending ? 'Pending' : 'Cleared',
    }));
    const csv = Papa.unparse(txs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `trackxpense_ledger_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // JSON Data Export
  const exportToJSON = () => {
    Haptics.light();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `trackxpense_backup_${new Date().toISOString().split('T')[0]}.json`);
  };

  // JSON Data Import
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !updateData) return;
    Haptics.light();

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (!importedData.transactions || !Array.isArray(importedData.transactions)) {
          alert('Invalid data format. Transaction array missing.');
          return;
        }

        // Smart merge
        const existingIds = new Set(data.transactions.map((t) => t.id));
        const existingSignatures = new Set(data.transactions.map((t) => `${t.date}_${t.amount}_${t.category}`));

        const newTransactions = importedData.transactions.filter((t: any) => {
          if (existingIds.has(t.id)) return false;
          const sig = `${t.date}_${t.amount}_${t.category}`;
          if (existingSignatures.has(sig)) return false;
          return true;
        });

        if (newTransactions.length === 0) {
          alert('No new unique transactions found in import file.');
          return;
        }

        const updatedWallets = [...data.wallets];
        importedData.wallets?.forEach((w: any) => {
          if (!updatedWallets.find((ew) => ew.id === w.id)) updatedWallets.push(w);
        });

        const updatedCategories = [...data.categories];
        importedData.categories?.forEach((c: any) => {
          if (!updatedCategories.find((ec) => ec.id === c.id)) updatedCategories.push(c);
        });

        updateData({
          transactions: [...data.transactions, ...newTransactions],
          wallets: updatedWallets,
          categories: updatedCategories,
        });

        Haptics.success();
        alert(`Successfully imported ${newTransactions.length} unique records.`);
      } catch (err) {
        alert('Failed to parse import file. Ensure it is a valid TrackXpense JSON backup.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-main overflow-hidden">
      {/* Sub-view Header - Only shown when navigating into a sub-page */}
      {activeSubView !== 'root' && (
        <div className="flex-none pt-2 pb-2 px-4 border-b border-main/5 flex items-center justify-between">
          <button
            onClick={() => {
              Haptics.light();
              setActiveSubView('root');
            }}
            className="flex items-center gap-0.5 text-xs font-semibold text-primary hover:text-primary/80 active:scale-95 transition-all"
          >
            <ChevronLeft size={16} />
            <span>Back</span>
          </button>

          <h2 className="text-xs font-bold text-main tracking-tight uppercase">
            {activeSubView === 'profile' && 'Edit Profile'}
            {activeSubView === 'appearance' && 'Appearance'}
            {activeSubView === 'backup' && 'Backup & Restore'}
            {activeSubView === 'security' && 'Security & Actions'}
            {activeSubView === 'privacy' && 'Privacy Policy'}
          </h2>

          <div className="w-16" />
        </div>
      )}

      {/* Dynamic Slide Container Stack */}
      <div className="flex-1 relative overflow-hidden bg-[#09090b]">
        {/* 1. ROOT VIEW */}
        <div
          className={`absolute inset-0 flex flex-col overflow-y-auto no-scrollbar px-4 pt-4 pb-[calc(76px+env(safe-area-inset-bottom))] space-y-5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            activeSubView === 'root' ? 'translate-x-0 opacity-100' : '-translate-x-12 opacity-0 pointer-events-none'
          }`}
        >
          {/* Discord-style Profile Card */}
          <div className="relative rounded-2xl bg-card/25 border border-main/5 overflow-hidden flex flex-col">
            {/* Cover Gradient Banner */}
            <div className="h-20 bg-gradient-to-r from-primary/80 via-purple-600/70 to-blue-600/50 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent_50%)]" />
              <div className="absolute top-2.5 right-3 px-2 py-0.5 rounded-full bg-primary/20 border border-primary/30 text-[8px] font-black uppercase tracking-wider text-primary shadow-[0_0_8px_rgba(var(--color-primary),0.2)]">
                {data.profile.isPremium ? 'Platinum Tier' : 'Personal Account'}
              </div>
            </div>

            {/* Avatar & Profile Text */}
            <div className="px-4 pb-3 flex flex-col items-start relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md border-4 border-[#09090b] relative -mt-8 shrink-0">
                {data.profile.name ? data.profile.name.charAt(0).toUpperCase() : 'U'}
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#09090b] shadow-sm animate-pulse" />
              </div>

              <div className="mt-2 w-full flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-main leading-none block">
                    {data.profile.name || 'User'}
                  </span>
                  <span className="text-[10px] text-muted/60 mt-1 block font-medium">
                    {data.profile.isPremium ? 'Premium Core Member' : 'Standard Tier'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    Haptics.light();
                    setActiveSubView('profile');
                  }}
                  className="px-2.5 py-1 rounded-md bg-main/5 border border-main/5 text-[9px] font-bold text-muted hover:text-main active:scale-95 transition-all uppercase tracking-wider"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          </div>

          {/* Privacy Shield removed from settings */}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Wallet Balance Capsule */}
            <div className="p-3.5 rounded-2xl bg-card/15 border border-main/5 flex flex-col justify-between h-18">
              <div className="flex items-center gap-1.5 text-muted/50">
                <WalletIcon size={12} className="text-primary" />
                <span className="text-[9px] font-bold uppercase tracking-wider truncate">Active Wallet</span>
              </div>
              <span className="text-sm font-black text-main tracking-tight mt-1 truncate">
                {data.settings.privacyMode ? '••••' : formatMoney(currentBalance, walletSymbol)}
              </span>
            </div>

            {/* Consistency Streak Capsule */}
            <div className="p-3.5 rounded-2xl bg-card/15 border border-main/5 flex flex-col justify-between h-18">
              <div className="flex items-center gap-1.5 text-muted/50">
                <Flame size={12} className="text-orange-500 animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-wider truncate">Daily Streak</span>
              </div>
              <span className="text-sm font-black text-main tracking-tight mt-1">
                {maxStreak > 0 ? `${maxStreak} Day Streak` : 'No Streak Active'}
              </span>
            </div>
          </div>

          {/* Group: Core Features */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted/40 px-1">Insights & Planning</p>
            <div className="bg-card/20 border border-main/5 rounded-2xl overflow-hidden shadow-sm">
              {[
                {
                  id: 'analytics' as ViewState,
                  label: 'Analytics & Trends',
                  desc: 'Spending breakdown & category charts',
                  icon: PieChart,
                  color: 'text-blue-400',
                  bg: 'bg-blue-400/10',
                  border: 'border-blue-400/10',
                },
                {
                  id: 'provisions' as ViewState,
                  label: 'Upcoming Expenses',
                  desc: 'Plan and allocate future liabilities',
                  icon: Calendar,
                  color: 'text-indigo-400',
                  bg: 'bg-indigo-400/10',
                  border: 'border-indigo-400/10',
                },
                {
                  id: 'subscriptions' as ViewState,
                  label: 'Subscriptions',
                  desc: 'Recurring automated cost tracking',
                  icon: Ghost,
                  color: 'text-purple-400',
                  bg: 'bg-purple-400/10',
                  border: 'border-purple-400/10',
                },
                {
                  id: 'control' as ViewState,
                  label: 'Budgets & Categories',
                  desc: 'Set custom spending thresholds & caps',
                  icon: TrendingUp,
                  color: 'text-emerald-400',
                  bg: 'bg-emerald-400/10',
                  border: 'border-emerald-400/10',
                },
              ].map(({ id, label, desc, icon: Icon, color, bg, border }) => {
                const isActive = currentView === id;
                return (
                  <button
                    key={id}
                    onClick={() => handleItemClick(id)}
                    className="w-full flex items-center justify-between py-2.5 px-3.5 hover:bg-main/5 active:bg-main/10 transition-colors text-left border-b last:border-b-0 border-main/5 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isActive ? bg : 'bg-main/5'
                        } border ${isActive ? border : 'border-main/5'}`}
                      >
                        <Icon size={16} strokeWidth={2.0} className={isActive ? color : 'text-muted/70'} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold leading-tight ${isActive ? color : 'text-main/90'}`}>
                          {label}
                        </p>
                        <p className="text-[9px] text-muted/50 truncate mt-0.5 font-normal">{desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted/30 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group: Configuration */}
          <div className="space-y-1.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted/40 px-1">Settings & Config</p>
            <div className="bg-card/20 border border-main/5 rounded-2xl overflow-hidden shadow-sm">
              {[
                {
                  id: 'profile',
                  label: 'Profile Details',
                  desc: 'Manage displayName and limits',
                  icon: UserCircle,
                  color: 'text-amber-400',
                  bg: 'bg-amber-400/10',
                  border: 'border-amber-400/10',
                },
                {
                  id: 'appearance',
                  label: 'Appearance & Themes',
                  desc: 'Color accents, light & dark switcher',
                  icon: Palette,
                  color: 'text-rose-400',
                  bg: 'bg-rose-400/10',
                  border: 'border-rose-400/10',
                },
                {
                  id: 'backup',
                  label: 'Data & Backups',
                  desc: 'Export ledger CSV and import JSON',
                  icon: Database,
                  color: 'text-teal-400',
                  bg: 'bg-teal-400/10',
                  border: 'border-teal-400/10',
                },
                {
                  id: 'security',
                  label: 'Security Settings',
                  desc: 'Alert toggles, system log out actions',
                  icon: ShieldAlert,
                  color: 'text-violet-400',
                  bg: 'bg-violet-400/10',
                  border: 'border-violet-400/10',
                },
                {
                  id: 'privacy',
                  label: 'Zero-Bullshit Privacy',
                  desc: 'Our terms, zero-pixel guarantee details',
                  icon: Fingerprint,
                  color: 'text-pink-400',
                  bg: 'bg-pink-400/10',
                  border: 'border-pink-400/10',
                },
              ].map(({ id, label, desc, icon: Icon, color, bg, border }) => {
                return (
                  <button
                    key={id}
                    onClick={() => {
                      Haptics.light();
                      setActiveSubView(id as SubView);
                    }}
                    className="w-full flex items-center justify-between py-2.5 px-3.5 hover:bg-main/5 active:bg-main/10 transition-colors text-left border-b last:border-b-0 border-main/5 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-main/5 border border-main/5`}>
                        <Icon size={16} strokeWidth={2.0} className={color} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight text-main/90">{label}</p>
                        <p className="text-[9px] text-muted/50 truncate mt-0.5 font-normal">{desc}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted/30 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 text-center">
            <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-muted/20">TrackXpense v4.0.0</p>
          </div>
        </div>

        {/* 2. PROFILE EDIT PANEL */}
        <div
          className={`absolute inset-0 flex flex-col overflow-y-auto no-scrollbar px-4 pt-4 pb-[calc(76px+env(safe-area-inset-bottom))] space-y-4 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            activeSubView === 'profile' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
          }`}
        >
          <div className="p-4 rounded-2xl bg-card/15 border border-main/5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-bold text-muted/50 tracking-[0.15em]">Display Name</label>
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder="Enter display name..."
                className="w-full bg-[#09090b]/80 rounded-xl px-3.5 py-2.5 text-xs text-main border border-main/5 focus:border-primary/40 outline-none transition-all font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-bold text-muted/50 tracking-[0.15em]">
                Monthly Spending Limit
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/30 font-bold text-[10px] font-mono">
                  {walletSymbol}
                </span>
                <input
                  type="number"
                  value={localMonthlyGoal || ''}
                  onChange={(e) => setLocalMonthlyGoal(parseFloat(e.target.value) || 0)}
                  placeholder="No limit..."
                  className="w-full bg-[#09090b]/80 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-main border border-main/5 focus:border-primary/40 outline-none transition-all font-semibold animate-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] uppercase font-bold text-muted/50 tracking-[0.15em]">
                Daily Spending Cap
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/30 font-bold text-[10px] font-mono">
                  {walletSymbol}
                </span>
                <input
                  type="number"
                  value={localDailyGoal || ''}
                  onChange={(e) => setLocalDailyGoal(parseFloat(e.target.value) || 0)}
                  placeholder="No limit..."
                  className="w-full bg-[#09090b]/80 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-main border border-main/5 focus:border-primary/40 outline-none transition-all font-semibold animate-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              if (updateData) {
                Haptics.success();
                updateData({
                  profile: {
                    ...data.profile,
                    name: localName,
                    monthlyGoal: localMonthlyGoal,
                    dailyGoal: localDailyGoal,
                  },
                });
                setProfileSaved(true);
                setTimeout(() => setProfileSaved(false), 2000);
              }
            }}
            className="w-full py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-primary/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {profileSaved ? (
              <>
                <Check size={14} strokeWidth={2.5} className="text-white" />
                <span>Changes Saved Successfully</span>
              </>
            ) : (
              <span>Save Profile Changes</span>
            )}
          </button>
        </div>

        {/* 3. APPEARANCE PANEL */}
        <div
          className={`absolute inset-0 flex flex-col overflow-y-auto no-scrollbar px-4 pt-4 pb-[calc(76px+env(safe-area-inset-bottom))] space-y-5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            activeSubView === 'appearance' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
          }`}
        >
          {/* Dark Mode toggle (Theme Picker removed from settings) */}
          <div className="p-4 rounded-2xl bg-card/15 border border-main/5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {data.settings.darkMode ? (
                <Moon size={16} className="text-primary" />
              ) : (
                <Sun size={16} className="text-amber-500" />
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-main leading-tight">Dark Mode Interface</span>
                <span className="text-[9px] text-muted/50 font-normal">Switch between light and dark visuals</span>
              </div>
            </div>
            <button
              onClick={() => {
                if (updateData) {
                  Haptics.light();
                  updateData({ settings: { ...data.settings, darkMode: !data.settings.darkMode } });
                }
              }}
              className={`w-9 h-5 rounded-full relative transition-all duration-300 border ${
                data.settings.darkMode
                  ? 'bg-primary border-primary/20 shadow-[0_0_12px_rgba(var(--color-primary),0.35)]'
                  : 'bg-main/5 border-main/10'
              }`}
            >
              <div
                className={`absolute top-[2px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${
                  data.settings.darkMode ? 'left-[18px]' : 'left-[2px]'
                }`}
              />
            </button>
          </div>

          {/* Currency picker */}
          <div className="p-4 rounded-2xl bg-card/15 border border-main/5 space-y-3.5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted/40">Default Currency</span>
              <p className="text-[9px] text-muted/50 mt-0.5">Choose your primary ledger currency symbol.</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {CURRENCIES.map((curr) => {
                const isSelected = data.settings.currencySymbol === curr.symbol;
                return (
                  <button
                    key={curr.value}
                    onClick={() => {
                      if (updateData) {
                        Haptics.light();
                        updateData({ settings: { ...data.settings, currencySymbol: curr.symbol } });
                      }
                    }}
                    className={`py-2 rounded-xl flex flex-col items-center justify-center border transition-all ${
                      isSelected
                        ? 'bg-primary/10 border-primary/30 text-primary font-bold shadow-sm'
                        : 'bg-[#09090b]/80 border-main/5 text-muted hover:text-main'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider">{curr.value}</span>
                    <span className="text-xs font-bold opacity-60 mt-0.5">{curr.symbol}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. BACKUP & RESTORE PANEL */}
        <div
          className={`absolute inset-0 flex flex-col overflow-y-auto no-scrollbar px-4 pt-4 pb-[calc(76px+env(safe-area-inset-bottom))] space-y-4 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            activeSubView === 'backup' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
          }`}
        >
          <div className="p-4 rounded-2xl bg-card/15 border border-main/5 space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted/40">Data Management</span>
              <p className="text-[9px] text-muted/50 mt-0.5">
                Securely export, import, or synchronise your transaction ledger files.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* CSV Export */}
              <button
                onClick={exportToCSV}
                className="w-full p-3.5 rounded-xl bg-[#09090b]/80 hover:bg-[#09090b] border border-main/5 transition-all flex items-center justify-between group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <FileSpreadsheet size={16} />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-main leading-tight block">Export Ledger (CSV)</span>
                    <span className="text-[8px] text-muted/50 font-normal uppercase tracking-wider">
                      Spreadsheet compatible format
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-muted/30" />
              </button>

              {/* JSON Export */}
              <button
                onClick={exportToJSON}
                className="w-full p-3.5 rounded-xl bg-[#09090b]/80 hover:bg-[#09090b] border border-main/5 transition-all flex items-center justify-between group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                    <FileJson size={16} />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-main leading-tight block">Export Backup (JSON)</span>
                    <span className="text-[8px] text-muted/50 font-normal uppercase tracking-wider">
                      Full system backup profile
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-muted/30" />
              </button>

              {/* JSON Import */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-3.5 rounded-xl bg-[#09090b]/80 hover:bg-[#09090b] border border-main/5 transition-all flex items-center justify-between group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Upload size={16} />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-main leading-tight block">Import JSON Backup</span>
                    <span className="text-[8px] text-muted/50 font-normal uppercase tracking-wider">
                      Smart deduplication active
                    </span>
                  </div>
                </div>
                <ChevronRight size={14} className="text-muted/30" />
                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
              </button>
            </div>
          </div>
        </div>

        {/* 5. SECURITY & ALERTS PANEL */}
        <div
          className={`absolute inset-0 flex flex-col overflow-y-auto no-scrollbar px-4 pt-4 pb-[calc(76px+env(safe-area-inset-bottom))] space-y-5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            activeSubView === 'security' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
          }`}
        >
          <div className="p-4 rounded-2xl bg-card/15 border border-main/5 space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted/40">
                Notification Alerts
              </span>
              <p className="text-[9px] text-muted/50 mt-0.5">
                Configure automated alert reminders to keep your balance synced.
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: 'expense' as const,
                  label: 'Expense Reminders',
                  icon: Bell,
                  active: data.settings.expenseReminders,
                  desc: 'Daily log prompts',
                },
                {
                  id: 'debt' as const,
                  label: 'Debt Reminders',
                  icon: AlertTriangle,
                  active: data.settings.debtReminders,
                  desc: 'Outstanding liability warnings',
                },
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => handleToggleReminder(sub.id)}
                  className="w-full p-3 bg-[#09090b]/80 rounded-xl border border-main/5 flex items-center justify-between group hover:border-primary/30 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
                        sub.active
                          ? 'bg-primary/10 border-primary/20 text-primary'
                          : 'bg-main/5 border-main/5 text-muted/40'
                      }`}
                    >
                      <sub.icon size={14} />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-main leading-tight block">{sub.label}</span>
                      <span className="text-[8px] text-muted/50 font-normal uppercase tracking-wider">{sub.desc}</span>
                    </div>
                  </div>
                  <div
                    className={`w-9 h-5 rounded-full relative transition-colors ${
                      sub.active
                        ? 'bg-primary border-primary/20 shadow-[0_0_12px_rgba(var(--color-primary),0.35)]'
                        : 'bg-main/5 border-main/10'
                    }`}
                  >
                    <div
                      className={`absolute top-[2px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${
                        sub.active ? 'left-[18px]' : 'left-[2px]'
                      }`}
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card/15 border border-main/5 space-y-3.5">
            <div>
              <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.15em]">Danger Zone</span>
              <p className="text-[9px] text-muted/50 mt-0.5">Irreversible actions regarding your account state.</p>
            </div>

            <div className="flex gap-3">
              {onLogout && (
                <button
                  onClick={() => {
                    Haptics.light();
                    if (confirm('Are you sure you want to log out?')) {
                      onLogout();
                    }
                  }}
                  className="flex-1 py-3 px-4 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all group"
                >
                  <LogOut size={16} className="text-primary" />
                  <span className="text-[9px] font-black text-white uppercase tracking-wider">Log Out</span>
                </button>
              )}
              <button
                onClick={() => {
                  Haptics.light();
                  if (confirm('Are you sure you want to PERMANENTLY delete your account? This is irreversible.')) {
                    alert('Account deletion triggered.');
                    if (onLogout) onLogout();
                  }
                }}
                className="flex-1 py-3 px-4 flex flex-col items-center justify-center gap-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all group"
              >
                <Trash2 size={16} className="text-red-500 animate-pulse" />
                <span className="text-[9px] font-black text-white uppercase tracking-wider">Delete Account</span>
              </button>
            </div>
          </div>
        </div>

        {/* 6. PRIVACY POLICY PANEL */}
        <div
          className={`absolute inset-0 flex flex-col overflow-y-auto no-scrollbar px-4 pt-4 pb-[calc(76px+env(safe-area-inset-bottom))] space-y-4 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            activeSubView === 'privacy' ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
          }`}
        >
          <div className="p-4 rounded-2xl bg-card/15 border border-main/5 space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted/40">
                Trust & Privacy
              </span>
              <p className="text-[9px] text-muted/50 mt-0.5">
                We design tools that respect your intelligence and data rights.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-[#09090b]/80 border border-main/5">
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.15em] mb-1">
                  Rule #1: Complete Anonymity
                </p>
                <p className="text-[10px] text-muted leading-relaxed font-medium">
                  We don't track your identity. Your ledger records are saved as isolated secure rows. No personalized
                  advertisement tracking, ever.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#09090b]/80 border border-main/5">
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.15em] mb-1">
                  Rule #2: Real-time Control
                </p>
                <p className="text-[10px] text-muted leading-relaxed font-medium">
                  Any data you clear is permanently expunged. Export options are free, complete, and require no premium
                  tier.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#09090b]/80 border border-main/5">
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.15em] mb-1">
                  Rule #3: Locally Encrypted Bits
                </p>
                <p className="text-[10px] text-muted leading-relaxed font-medium">
                  All computations, predictive spend trends, and streak tracking occur securely on your device, not
                  remote trackers.
                </p>
              </div>
            </div>

            <p className="text-[8px] text-muted/30 text-center uppercase font-black tracking-widest pt-2">
              TrackXpense v4.0.0 • Privacy Zero-Bullshit
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
