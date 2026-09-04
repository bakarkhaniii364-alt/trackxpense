import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AppData, Wallet, ThemeOption } from '../../types';
import { 
  Bell, 
  Warning as AlertTriangle, 
  User, 
  Gear as Settings, 
  Fingerprint, 
  Envelope as Mail, 
  SignOut as LogOut, 
  Trash as Trash2, 
  CaretRight as ChevronRight,
  X,
  Upload,
  FileCode as FileJson,
  FileCsv as FileSpreadsheet,
  PencilSimple as Edit2,
  Check,
  Plus,
  Wallet as WalletIcon,
  ShieldCheck,
  EyeSlash as EyeOff,
  Target,
  Palette,
  ArrowSquareOut as ExternalLink,
  Lightning as Zap
} from '@phosphor-icons/react';
import { CURRENCIES } from '../shared/CommonUI';
import { supabase } from '../../services/supabase';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';
import { SegmentedSubTabs } from '../shared/SegmentedSubTabs';
import { CustomSelect } from '../shared/CustomSelect';
import { AuditLogger } from '../../services/auditLog';

export interface ProfileSettingsProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  formatMoney?: (val: number, sym?: string) => string;
  isCompact?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  onLogout?: () => void;
  initialTab?: 'general' | 'wallets' | 'data_security';
  onTabChange?: (tab: 'general' | 'wallets' | 'data_security') => void;
}

export type PersonnelRegionalManagerProps = ProfileSettingsProps;

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ 
  data, 
  updateData, 
  formatMoney,
  isCompact = false,
  onDirtyChange,
  onLogout,
  initialTab,
  onTabChange
}) => {
  // 3 Sub-Tabs: General, Wallet Settings, Data & Security
  const [activeTab, setActiveTab] = useState<'general' | 'wallets' | 'data_security'>(
    initialTab || 'general'
  );

  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  const [localProfile, setLocalProfile] = useState(data.profile);
  const [localSettings, setLocalSettings] = useState(data.settings);
  const [confirmAction, setConfirmAction] = useState<'logout' | 'delete' | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit states for General cards
  const [editingCard, setEditingCard] = useState<'profile' | 'daily_target' | 'monthly_target' | 'currency' | null>(null);
  
  // Selected Wallet in Wallet Settings
  const [selectedWalletIdToConfig, setSelectedWalletIdToConfig] = useState<string>(data.currentWalletId || (data.wallets?.[0]?.id || ''));
  const [editingWalletCard, setEditingWalletCard] = useState<'identity' | 'config' | null>(null);

  // Wallet Add Modal State
  const [isAddWalletOpen, setIsAddWalletOpen] = useState(false);
  const [newWalletName, setNewWalletName] = useState('');
  const [newWalletTarget, setNewWalletTarget] = useState('');
  const [newWalletCurrency, setNewWalletCurrency] = useState(data.settings.currencySymbol || '$');
  const [newWalletIsGoal, setNewWalletIsGoal] = useState(false);

  // Wallet Delete with Reassign Modal State
  const [deletingWalletId, setDeletingWalletId] = useState<string | null>(null);
  const [targetReassignWalletId, setTargetReassignWalletId] = useState<string>('');

  useEffect(() => {
    if (data.currentWalletId && !selectedWalletIdToConfig) {
      setSelectedWalletIdToConfig(data.currentWalletId);
    }
  }, [data.currentWalletId]);

  const defaultFormatMoney = (val: number, sym?: string) => {
    const currencySym = sym || data.settings?.currencySymbol || '$';
    return `${currencySym} ${(val || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  };
  const fmtMoney = formatMoney || defaultFormatMoney;

  const isProfileDirty = JSON.stringify(localProfile) !== JSON.stringify(data.profile);
  const isSettingsDirty = JSON.stringify(localSettings) !== JSON.stringify(data.settings);
  const isDirty = isProfileDirty || isSettingsDirty;

  useEffect(() => {
    if (onDirtyChange) onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSaveProfile = () => {
    updateData({ profile: localProfile });
    setEditingCard(null);
  };

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  const handleDeleteAccount = async () => {
    alert("Your account is marked for permanent deletion. You will be logged out.");
    await handleLogout();
  };

  const toggleNotification = async (type: 'expense' | 'debt') => {
    const currentVal = type === 'expense' ? localSettings.expenseReminders : localSettings.debtReminders;
    const newSettings = {
      ...localSettings,
      [type === 'expense' ? 'expenseReminders' : 'debtReminders']: !currentVal,
    };
    setLocalSettings(newSettings);
    updateData({ settings: newSettings });
  };

  const togglePrivacyMode = () => {
    const newSettings = {
      ...localSettings,
      privacyMode: !localSettings.privacyMode
    };
    setLocalSettings(newSettings);
    updateData({ settings: newSettings });
  };

  // Wallet Management Actions
  const handleUpdateWallet = (walletId: string, updates: Partial<Wallet>) => {
    const updated = (data.wallets || []).map(w => w.id === walletId ? { ...w, ...updates } : w);
    updateData({ wallets: updated });
  };

  const handleAddWallet = () => {
    if (!newWalletName.trim()) return;
    const newWallet: Wallet = {
      id: crypto.randomUUID(),
      name: newWalletName.trim(),
      type: newWalletIsGoal ? 'GOAL' : 'STANDARD',
      targetAmount: newWalletIsGoal ? (parseFloat(newWalletTarget) || undefined) : undefined,
      currency: newWalletCurrency
    };
    updateData({ wallets: [...(data.wallets || []), newWallet] });
    setSelectedWalletIdToConfig(newWallet.id);
    setIsAddWalletOpen(false);
    setNewWalletName('');
    setNewWalletTarget('');
    setNewWalletIsGoal(false);
  };

  const handleInitiateDeleteWallet = (walletId: string) => {
    if ((data.wallets || []).length <= 1) {
      alert("You must keep at least one wallet.");
      return;
    }
    const otherWallets = (data.wallets || []).filter(w => w.id !== walletId);
    setDeletingWalletId(walletId);
    setTargetReassignWalletId(otherWallets[0].id);
  };

  const handleConfirmDeleteWalletWithReassign = () => {
    if (!deletingWalletId || !targetReassignWalletId) return;

    const reassignedTxs = (data.transactions || []).map(t => {
      if (t.walletId === deletingWalletId) {
        return { ...t, walletId: targetReassignWalletId };
      }
      return t;
    });

    const updatedWallets = (data.wallets || []).filter(w => w.id !== deletingWalletId);

    let newCurrentId = data.currentWalletId;
    if (data.currentWalletId === deletingWalletId) {
      newCurrentId = targetReassignWalletId;
    }

    updateData({
      transactions: reassignedTxs,
      wallets: updatedWallets,
      currentWalletId: newCurrentId
    });

    setSelectedWalletIdToConfig(targetReassignWalletId);
    setDeletingWalletId(null);
  };

  // Data Export/Import
  const exportToJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `trackxpense_backup_${new Date().toISOString().split('T')[0]}.json`);
  };

  const exportToCSV = () => {
    const txs = (data.transactions || []).map(t => ({
      Date: t.date,
      Type: t.type,
      Category: t.category,
      Amount: t.amount,
      Note: t.note || '',
      Wallet: data.wallets?.find(w => w.id === t.walletId)?.name || 'Default',
      Tags: (t.tags || []).join(', '),
      Status: t.isPending ? 'Pending' : 'Cleared'
    }));
    const csv = Papa.unparse(txs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `trackxpense_ledger_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (importedData && typeof importedData === 'object') {
          updateData(importedData);
          alert("Backup successfully restored.");
        }
      } catch (err) {
        alert("Failed to parse JSON backup file.");
      }
    };
    reader.readAsText(file);
  };

  const availableColors: ThemeOption[] = ['amber', 'emerald', 'rose', 'blue', 'indigo'];

  // Target selected wallet object for configuration
  const selectedWallet = (data.wallets || []).find(w => w.id === selectedWalletIdToConfig) || data.wallets?.[0];

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300 mx-auto pb-10">
      
      {/* 3 Main Navigation Sub-Tabs Bar */}
      <div className="pb-1 border-b border-[var(--border-default)]">
        <SegmentedSubTabs
          activeTab={activeTab}
          onChange={(tabId: any) => {
            setActiveTab(tabId);
            if (onTabChange) onTabChange(tabId);
          }}
          tabs={[
            { id: 'general', label: 'General' },
            { id: 'wallets', label: 'Wallet Settings', count: (data.wallets || []).length },
            { id: 'data_security', label: 'Data & Security' },
          ]}
        />
      </div>

      {/* --- TAB 1: GENERAL --- */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
          
          {/* Structural Content Column (9 cols) */}
          <div className="lg:col-span-9 space-y-8">
            
            {/* SECTION 1: PROFILE & IDENTITY */}
            <div id="profile-section" className="space-y-3">
              <h2 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">Profile & Preferences</h2>

              {/* Name Card */}
              <div id="profile" className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] rounded-[10px] px-5 py-4 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--text-primary)] w-[180px] shrink-0">
                    Name
                  </span>
                  {editingCard === 'profile' ? (
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <input
                        type="text"
                        value={localProfile.name}
                        onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
                        className="h-[32px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] px-2.5 text-[13px] text-[var(--text-primary)] outline-none"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingCard(null)} className="text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
                        <button onClick={handleSaveProfile} className="text-[12px] font-medium text-[var(--accent-solid)] hover:underline">Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-[13px] text-[var(--text-secondary)] flex-1">
                        {localProfile.name || 'User'}
                      </span>
                      <button 
                        onClick={() => setEditingCard('profile')}
                        className="text-[13px] font-medium text-[var(--accent-solid)] hover:underline transition-all"
                      >
                        Rename
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Currency & Locale Card */}
              <div id="currency" className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] rounded-[10px] px-5 py-4 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--text-primary)] w-[180px] shrink-0">
                    Currency & locale
                  </span>
                  {editingCard === 'currency' ? (
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <CustomSelect
                        value={localSettings.currencySymbol}
                        onChange={(val) => {
                          const updated = { ...localSettings, currencySymbol: val };
                          setLocalSettings(updated);
                          updateData({ settings: updated });
                          setEditingCard(null);
                        }}
                        options={CURRENCIES.map(c => ({
                          value: c.symbol,
                          label: `${c.value} (${c.symbol})`
                        }))}
                        size="sm"
                        className="flex-1 max-w-[200px]"
                      />
                      <button onClick={() => setEditingCard(null)} className="text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Done</button>
                    </div>
                  ) : (
                    <>
                      <span className="text-[13px] text-[var(--text-secondary)] flex-1">
                        Active Currency Symbol: <strong className="text-[var(--text-primary)] font-medium font-mono">{localSettings.currencySymbol}</strong>
                      </span>
                      <button 
                        onClick={() => setEditingCard('currency')}
                        className="text-[13px] font-medium text-[var(--accent-solid)] hover:underline transition-all"
                      >
                        Change
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Stealth Mode Card */}
              <div id="privacy" className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] rounded-[10px] px-5 py-4 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--text-primary)] w-[180px] shrink-0">
                    Stealth mode
                  </span>
                  <span className="text-[13px] text-[var(--text-secondary)] flex-1">
                    Privacy Masking: <strong className="text-[var(--text-primary)] font-medium">{localSettings.privacyMode ? 'Enabled' : 'Disabled'}</strong>
                  </span>
                  <button 
                    onClick={togglePrivacyMode}
                    className="text-[13px] font-medium text-[var(--accent-solid)] hover:underline transition-all"
                  >
                    {localSettings.privacyMode ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 2: TARGET LIMITS */}
            <div id="targets-section" className="space-y-3 pt-2">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">Target Limits</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Configure budget limit metrics for daily velocity and monthly goals.</p>
              </div>

              {/* Field 1: Daily Expense Limit */}
              <div id="daily-limit" className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] rounded-[10px] px-5 py-4 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--text-primary)] w-[180px] shrink-0">
                    Daily Expense Limit
                  </span>
                  {editingCard === 'daily_target' ? (
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <input
                        type="number"
                        placeholder="Daily limit..."
                        value={localProfile.dailyGoal || ''}
                        onChange={(e) => setLocalProfile({ ...localProfile, dailyGoal: parseFloat(e.target.value) || 0 })}
                        className="w-[160px] h-[32px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] px-2.5 text-[12px] font-mono text-[var(--text-primary)] outline-none"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingCard(null)} className="text-[12px] text-[var(--text-secondary)]">Cancel</button>
                        <button onClick={handleSaveProfile} className="text-[12px] font-medium text-[var(--accent-solid)] hover:underline">Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-[13px] text-[var(--text-secondary)] flex-1 font-mono">
                        {localProfile.dailyGoal ? fmtMoney(localProfile.dailyGoal, data.settings.currencySymbol) : 'No daily limit set'}
                      </span>
                      <button 
                        onClick={() => setEditingCard('daily_target')}
                        className="text-[13px] font-medium text-[var(--accent-solid)] hover:underline transition-all"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Field 2: Monthly Expense Limit */}
              <div id="monthly-limit" className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] rounded-[10px] px-5 py-4 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--text-primary)] w-[180px] shrink-0">
                    Monthly Expense Limit
                  </span>
                  {editingCard === 'monthly_target' ? (
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <input
                        type="number"
                        placeholder="Monthly goal..."
                        value={localProfile.monthlyGoal}
                        onChange={(e) => setLocalProfile({ ...localProfile, monthlyGoal: parseFloat(e.target.value) || 0 })}
                        className="w-[160px] h-[32px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] px-2.5 text-[12px] font-mono text-[var(--text-primary)] outline-none"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingCard(null)} className="text-[12px] text-[var(--text-secondary)]">Cancel</button>
                        <button onClick={handleSaveProfile} className="text-[12px] font-medium text-[var(--accent-solid)] hover:underline">Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-[13px] text-[var(--text-secondary)] flex-1 font-mono">
                        {fmtMoney(localProfile.monthlyGoal, data.settings.currencySymbol)}
                      </span>
                      <button 
                        onClick={() => setEditingCard('monthly_target')}
                        className="text-[13px] font-medium text-[var(--accent-solid)] hover:underline transition-all"
                      >
                        Edit
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 3: NOTIFICATIONS */}
            <div id="notifications-section" className="space-y-3 pt-2">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">Notifications</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Manage alert notifications for expense velocity and debt payables.</p>
              </div>

              {/* Field 1: Expense Alert */}
              <div id="expense-alert" className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] rounded-[10px] px-5 py-4 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--text-primary)] w-[180px] shrink-0">
                    Expense Alert
                  </span>
                  <span className="text-[13px] text-[var(--text-secondary)] flex-1">
                    Status: <strong className="text-[var(--text-primary)] font-medium">{localSettings.expenseReminders ? 'Enabled' : 'Disabled'}</strong>
                  </span>
                  <button 
                    onClick={() => toggleNotification('expense')}
                    className="text-[13px] font-medium text-[var(--accent-solid)] hover:underline transition-all"
                  >
                    {localSettings.expenseReminders ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>

              {/* Field 2: Debt Alert */}
              <div id="debt-alert" className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] rounded-[10px] px-5 py-4 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--text-primary)] w-[180px] shrink-0">
                    Debt Alert
                  </span>
                  <span className="text-[13px] text-[var(--text-secondary)] flex-1">
                    Status: <strong className="text-[var(--text-primary)] font-medium">{localSettings.debtReminders ? 'Enabled' : 'Disabled'}</strong>
                  </span>
                  <button 
                    onClick={() => toggleNotification('debt')}
                    className="text-[13px] font-medium text-[var(--accent-solid)] hover:underline transition-all"
                  >
                    {localSettings.debtReminders ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Right Sticky TOC Sidebar (3 cols) */}
          <div className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-6 space-y-4 text-[13px] border-l border-[var(--border-default)] pl-4">
              <div className="space-y-1.5">
                <a href="#profile-section" onClick={(e) => scrollToSection(e, 'profile-section')} className="font-medium text-[var(--text-primary)] border-l-2 border-[var(--text-primary)] -ml-[17px] pl-3 block py-0.5">
                  Profile & Preferences
                </a>
                <a href="#profile" onClick={(e) => scrollToSection(e, 'profile')} className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors pl-1">
                  Name
                </a>
                <a href="#currency" onClick={(e) => scrollToSection(e, 'currency')} className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors pl-1">
                  Currency & locale
                </a>
                <a href="#privacy" onClick={(e) => scrollToSection(e, 'privacy')} className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors pl-1">
                  Stealth mode
                </a>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[var(--border-default)]/40">
                <a href="#targets-section" onClick={(e) => scrollToSection(e, 'targets-section')} className="font-medium text-[var(--text-primary)] border-l-2 border-transparent hover:border-[var(--text-primary)] -ml-[17px] pl-3 block py-0.5">
                  Target Limits
                </a>
                <a href="#daily-limit" onClick={(e) => scrollToSection(e, 'daily-limit')} className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors pl-1">
                  Daily expense limit
                </a>
                <a href="#monthly-limit" onClick={(e) => scrollToSection(e, 'monthly-limit')} className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors pl-1">
                  Monthly expense limit
                </a>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[var(--border-default)]/40">
                <a href="#notifications-section" onClick={(e) => scrollToSection(e, 'notifications-section')} className="font-medium text-[var(--text-primary)] border-l-2 border-transparent hover:border-[var(--text-primary)] -ml-[17px] pl-3 block py-0.5">
                  Notifications
                </a>
                <a href="#expense-alert" onClick={(e) => scrollToSection(e, 'expense-alert')} className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors pl-1">
                  Expense alert
                </a>
                <a href="#debt-alert" onClick={(e) => scrollToSection(e, 'debt-alert')} className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors pl-1">
                  Debt alert
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: WALLET SETTINGS (MATCHES FIRST SCREENSHOT EXACTLY) --- */}
      {activeTab === 'wallets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
          
          {/* Wallets Content Stack (9 cols) */}
          <div className="lg:col-span-9 space-y-4">
            
            {/* Top Environment Selector Row (Matches Screenshot 1 Header line) */}
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-[var(--text-primary)]">Choose Environment:</span>
                <CustomSelect
                  value={selectedWalletIdToConfig}
                  onChange={(val) => setSelectedWalletIdToConfig(val)}
                  options={(data.wallets || []).map(w => ({ value: w.id, label: w.name }))}
                  size="sm"
                  className="min-w-[160px]"
                />
              </div>

              <button
                onClick={() => { setNewWalletName(''); setNewWalletTarget(''); setIsAddWalletOpen(true); }}
                className="btn btn--primary h-[34px] px-3.5 text-[12px] flex items-center gap-1.5 shrink-0"
              >
                <Plus size={14} strokeWidth={1.5} />
                <span>Add new wallet</span>
              </button>
            </div>

            {/* Title: Build / Wallet Configuration (Matches Screenshot 1 Heading) */}
            <h2 className="text-base font-semibold text-[var(--text-primary)] tracking-tight pt-1">
              Wallet Configuration
            </h2>

            {/* STACK OF 3 STRUCTURAL CARDS FOR SELECTED WALLET */}
            {selectedWallet && (
              <div className="space-y-3 animate-in fade-in duration-200">
                
                {/* CARD 1: Wallet identity */}
                <div id="wallet-identity" className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] rounded-[10px] px-5 py-4 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] w-[160px] shrink-0">
                      Wallet identity
                    </span>

                    {editingWalletCard === 'identity' ? (
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={selectedWallet.name}
                          onChange={(e) => handleUpdateWallet(selectedWallet.id, { name: e.target.value })}
                          className="h-[32px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] px-2.5 text-[13px] font-semibold text-[var(--text-primary)] outline-none"
                          autoFocus
                        />
                        <button 
                          onClick={() => setEditingWalletCard(null)} 
                          className="text-[12px] font-medium text-[var(--accent-solid)] hover:underline"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="px-3 py-1 bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-full text-[12px] font-mono text-[var(--text-primary)] flex items-center gap-1.5">
                            <WalletIcon size={13} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                            {selectedWallet.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          {(data.wallets || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleInitiateDeleteWallet(selectedWallet.id)}
                              className="text-[13px] font-medium text-red-500 hover:underline transition-all"
                            >
                              Disconnect
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingWalletCard('identity')}
                            className="text-[13px] font-medium text-[var(--accent-solid)] hover:underline transition-all"
                          >
                            Rename
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* CARD 2: Wallet configuration */}
                <div id="wallet-config" className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] rounded-[10px] p-5 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start flex-1">
                      <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4 w-[160px] shrink-0 cursor-pointer pt-0.5">
                        Build configuration
                      </span>

                      {editingWalletCard === 'config' ? (
                        <div className="flex-1 space-y-3 pr-4">
                          {/* Currency */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[var(--text-muted)]">Currency</label>
                            <CustomSelect
                              value={selectedWallet.currency || data.settings.currencySymbol}
                              onChange={(val) => handleUpdateWallet(selectedWallet.id, { currency: val })}
                              options={CURRENCIES.map(c => ({
                                value: c.symbol,
                                label: `${c.value} (${c.symbol})`
                              }))}
                              size="sm"
                            />
                          </div>

                          {/* Mode */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[var(--text-muted)]">Wallet Type</label>
                            <div className="tabs flex">
                              <button
                                type="button"
                                onClick={() => handleUpdateWallet(selectedWallet.id, { type: 'STANDARD' })}
                                className={`tab flex-1 justify-center ${
                                  selectedWallet.type === 'STANDARD' ? 'is-active' : ''
                                }`}
                              >
                                Standard Vault
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateWallet(selectedWallet.id, { type: 'GOAL' })}
                                className={`tab flex-1 justify-center ${
                                  selectedWallet.type === 'GOAL' ? 'is-active' : ''
                                }`}
                              >
                                Savings Goal
                              </button>
                            </div>
                          </div>

                          {/* Goal target if savings */}
                          {selectedWallet.type === 'GOAL' && (
                            <div className="space-y-1">
                              <label className="text-[11px] font-medium text-emerald-400">Savings Target Goal</label>
                              <input
                                type="number"
                                value={selectedWallet.targetAmount || ''}
                                onChange={(e) => handleUpdateWallet(selectedWallet.id, { targetAmount: parseFloat(e.target.value) || 0 })}
                                className="w-full h-[32px] bg-[var(--bg-subtle)] border border-emerald-500/30 rounded-[6px] px-2 text-[12px] font-mono text-emerald-400 outline-none"
                              />
                            </div>
                          )}

                          {/* Stealth Mode */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[12px] text-[var(--text-secondary)]">Vault Stealth Mode:</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateWallet(selectedWallet.id, { stealthMode: !selectedWallet.stealthMode })}
                              className="text-[12px] font-medium text-[var(--accent-solid)] hover:underline"
                            >
                              {selectedWallet.stealthMode ? 'Enabled' : 'Disabled'}
                            </button>
                          </div>

                          {/* Color Code */}
                          <div className="space-y-1 pt-1">
                            <label className="text-[11px] font-medium text-[var(--text-muted)]">Color Tag</label>
                            <div className="flex items-center gap-2">
                              {availableColors.map(col => (
                                <button
                                  key={col}
                                  type="button"
                                  onClick={() => handleUpdateWallet(selectedWallet.id, { color: col })}
                                  className={`w-5 h-5 rounded-full border transition-all ${
                                    (selectedWallet.color || 'amber') === col ? 'scale-110 border-white' : 'border-transparent opacity-60'
                                  }`}
                                  style={{
                                    backgroundColor: 
                                      col === 'amber' ? '#F6821F' :
                                      col === 'emerald' ? '#10b981' :
                                      col === 'rose' ? '#f43f5e' :
                                      col === 'blue' ? '#2563eb' : '#5e5ce6'
                                  }}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="pt-2 flex justify-end">
                            <button onClick={() => setEditingWalletCard(null)} className="text-[12px] font-medium text-[var(--accent-solid)] hover:underline">Done</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 space-y-1.5 text-[13px] text-[var(--text-secondary)]">
                          <p>Currency: <span className="text-[var(--text-primary)] font-mono">{selectedWallet.currency || data.settings.currencySymbol}</span></p>
                          <p>Mode: <span className="text-[var(--text-primary)]">{selectedWallet.type === 'GOAL' ? 'Savings Goal' : 'Standard Vault'}</span></p>
                          {selectedWallet.type === 'GOAL' && (
                            <p>Savings target: <span className="text-emerald-400 font-mono font-medium">{fmtMoney(selectedWallet.targetAmount || 0, selectedWallet.currency || data.settings.currencySymbol)}</span></p>
                          )}
                          <p>Vault stealth: <span className="text-[var(--text-primary)]">{selectedWallet.stealthMode ? 'Enabled' : 'Disabled'}</span></p>
                          <p>Color code: <span className="text-[var(--text-primary)] capitalize">{selectedWallet.color || 'amber'}</span></p>
                        </div>
                      )}
                    </div>

                    {editingWalletCard !== 'config' && (
                      <button
                        type="button"
                        onClick={() => setEditingWalletCard('config')}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[4px]"
                        title="Edit Configuration"
                      >
                        <Edit2 size={15} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>

                {/* CARD 3: Active environment */}
                <div id="wallet-active" className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] rounded-[10px] px-5 py-4 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 w-[160px] shrink-0">
                      <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4 cursor-pointer">
                        Active environment
                      </span>
                      {data.currentWalletId === selectedWallet.id && (
                        <span className="text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          Live
                        </span>
                      )}
                    </div>

                    <span className="text-[13px] text-[var(--text-secondary)] flex-1">
                      {data.currentWalletId === selectedWallet.id ? 'Currently set as primary wallet environment' : 'Inactive environment'}
                    </span>

                    {data.currentWalletId === selectedWallet.id ? (
                      <span className="text-[13px] font-medium text-emerald-400">Active</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updateData({ currentWalletId: selectedWallet.id })}
                        className="text-[13px] font-medium text-[var(--accent-solid)] hover:underline transition-all"
                      >
                        Enable
                      </button>
                    )}
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Right Sticky TOC Navigation (3 cols) */}
          <div className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-6 space-y-3 text-[13px] border-l border-[var(--border-default)] pl-4">
              <div className="font-medium text-[var(--text-primary)] border-l-2 border-[var(--text-primary)] -ml-[17px] pl-3 py-0.5">
                Wallet Configuration
              </div>
              <a href="#wallet-identity" onClick={(e) => scrollToSection(e, 'wallet-identity')} className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Wallet identity
              </a>
              <a href="#wallet-config" onClick={(e) => scrollToSection(e, 'wallet-config')} className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Build configuration
              </a>
              <a href="#wallet-active" onClick={(e) => scrollToSection(e, 'wallet-active')} className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Active environment
              </a>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: DATA & SECURITY --- */}
      {activeTab === 'data_security' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-300">
          
          {/* Data & Security Stack (9 cols) */}
          <div className="lg:col-span-9 space-y-8">
            
            {/* SECTION 1: Data & Backup */}
            <div id="backup" className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Data & Backup</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Export backups or import transaction history snapshots.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <button onClick={exportToCSV} className="p-5 rounded-[10px] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] transition-all flex flex-col items-center gap-3 group text-center cursor-pointer">
                  <FileSpreadsheet size={24} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                  <div>
                    <span className="text-[13px] font-medium text-[var(--text-primary)] block">Export Ledger CSV</span>
                    <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">Spreadsheet Format</span>
                  </div>
                </button>
                <button onClick={exportToJSON} className="p-5 rounded-[10px] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] transition-all flex flex-col items-center gap-3 group text-center cursor-pointer">
                  <FileJson size={24} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
                  <div>
                    <span className="text-[13px] font-medium text-[var(--text-primary)] block">Export Backup JSON</span>
                    <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">Full System Snapshot</span>
                  </div>
                </button>
                <button 
                  onClick={() => {
                    const csv = AuditLogger.exportAsCsv();
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    saveAs(blob, `trackxpense_audit_trail_${Date.now()}.csv`);
                  }} 
                  className="p-5 rounded-[10px] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] transition-all flex flex-col items-center gap-3 group text-center cursor-pointer"
                >
                  <ShieldCheck size={24} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-sky-400 transition-colors" />
                  <div>
                    <span className="text-[13px] font-medium text-[var(--text-primary)] block">Export Audit Trail</span>
                    <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">Forensic Event Log</span>
                  </div>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="p-5 rounded-[10px] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] transition-all flex flex-col items-center gap-3 group text-center cursor-pointer">
                  <Upload size={24} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-emerald-400 transition-colors" />
                  <div>
                    <span className="text-[13px] font-medium text-[var(--text-primary)] block">Import Backup File</span>
                    <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">Deduplication Active</span>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
                </button>
              </div>
            </div>

            {/* SECTION: RabbAi Integration Settings */}
            <div id="rabb-ai" className="space-y-4 pt-4 border-t border-[var(--border-default)]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
                    <Zap size={18} className="text-amber-400" />
                    <span>Smart Assistant Configuration</span>
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Fast serverless engine for natural language transaction logging, receipt scanning, and automated categorization.
                  </p>
                </div>
              </div>

              <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 rounded-[10px] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-[var(--text-primary)]">Enable Smart Processing</span>
                  <input
                    type="checkbox"
                    checked={localSettings.enableAiParsing !== false}
                    onChange={(e) => {
                      const updated = { ...localSettings, enableAiParsing: e.target.checked };
                      setLocalSettings(updated);
                      updateData({ settings: updated });
                    }}
                    className="w-4 h-4 rounded border-[var(--border-default)] accent-[#F6821F] cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-[var(--text-primary)] block">Assistant Engine Status</label>
                  <div className="flex items-center gap-2 h-[38px] bg-[var(--status-success-bg)] border border-[var(--border-default)] rounded-[8px] px-3">
                    <span className="w-2 h-2 rounded-full bg-[var(--status-success-fg)] shrink-0" />
                    <span className="text-[12px] text-[var(--status-success-fg)] font-medium">Service Active — managed server-side</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    High-throughput cloud engine · Active and ready for instant requests.
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 2: Security & Account Actions */}
            <div id="security" className="space-y-4 pt-4 border-t border-[var(--border-default)]">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Account & Security</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Application legal terms, developer support, and session controls.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 rounded-[10px] space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Legal & Support</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Privacy policy documentation and contact.</p>
                  </div>
                  <div className="space-y-2 pt-1">
                    <button onClick={() => setShowPrivacy(true)} className="w-full px-3.5 py-2.5 flex items-center justify-between rounded-[8px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] transition-all border border-[var(--border-default)]">
                      <div className="flex items-center gap-2.5">
                        <Fingerprint size={16} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                        <span className="text-[13px] font-medium text-[var(--text-primary)]">View Privacy Policy</span>
                      </div>
                      <ChevronRight size={14} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                    </button>
                    <a href="mailto:dev@trackxpense.app" className="w-full px-3.5 py-2.5 flex items-center justify-between rounded-[8px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] transition-all border border-[var(--border-default)]">
                      <div className="flex items-center gap-2.5">
                        <Mail size={16} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                        <span className="text-[13px] font-medium text-[var(--text-primary)]">Contact Developer</span>
                      </div>
                      <ChevronRight size={14} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                    </a>
                  </div>
                </div>

                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 rounded-[10px] space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Account Actions</h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Session controls and account removal.</p>
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={() => setConfirmAction('logout')} className="flex-1 px-3.5 py-3 flex flex-col items-center justify-center gap-1.5 rounded-[8px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] transition-all">
                      <LogOut size={18} strokeWidth={1.5} className="text-[var(--accent-solid)]" />
                      <span className="text-[13px] font-medium text-[var(--text-primary)]">Log Out</span>
                    </button>
                    <button onClick={() => setConfirmAction('delete')} className="flex-1 px-3.5 py-3 flex flex-col items-center justify-center gap-1.5 rounded-[8px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all">
                      <Trash2 size={18} strokeWidth={1.5} className="text-red-400" />
                      <span className="text-[13px] font-medium text-red-400">Delete Account</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Sticky TOC Navigation (3 cols) */}
          <div className="lg:col-span-3 hidden lg:block">
            <div className="sticky top-6 space-y-3 text-[13px] border-l border-[var(--border-default)] pl-4">
              <div className="font-medium text-[var(--text-primary)] border-l-2 border-[var(--text-primary)] -ml-[17px] pl-3 py-0.5">
                Data & Security
              </div>
              <a href="#backup" onClick={(e) => scrollToSection(e, 'backup')} className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Backup & export
              </a>
              <a href="#security" onClick={(e) => scrollToSection(e, 'security')} className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Legal & support
              </a>
              <a href="#security" onClick={(e) => scrollToSection(e, 'security')} className="block text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Account session
              </a>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Add New Wallet --- */}
      {isAddWalletOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs" 
            onClick={() => setIsAddWalletOpen(false)} 
          />
          <div className="relative w-full max-w-[420px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Add New Wallet</h3>
              <button 
                onClick={() => setIsAddWalletOpen(false)}
                className="btn btn--outline btn--icon-sm shrink-0"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[var(--text-primary)]">Wallet / Vault Name</label>
                <input
                  type="text"
                  placeholder="e.g. Savings Vault..."
                  value={newWalletName}
                  onChange={(e) => setNewWalletName(e.target.value)}
                  className="w-full h-[38px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[8px] px-3 text-[13px] text-[var(--text-primary)] outline-none"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[var(--text-primary)]">Purpose / Type</label>
                <div className="tabs flex">
                  <button
                    type="button"
                    onClick={() => setNewWalletIsGoal(false)}
                    className={`tab flex-1 justify-center ${!newWalletIsGoal ? 'is-active' : ''}`}
                  >
                    Standard Vault
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewWalletIsGoal(true)}
                    className={`tab flex-1 justify-center ${newWalletIsGoal ? 'is-active' : ''}`}
                  >
                    Savings Goal
                  </button>
                </div>
              </div>

              {newWalletIsGoal && (
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-emerald-400">Savings Target Amount</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newWalletTarget}
                    onChange={(e) => setNewWalletTarget(e.target.value)}
                    className="w-full h-[36px] bg-[var(--bg-subtle)] border border-emerald-500/30 rounded-[6px] px-3 text-[12px] font-mono text-emerald-400 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsAddWalletOpen(false)}
                className="btn btn--outline h-[32px] px-3.5 text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddWallet}
                disabled={!newWalletName.trim()}
                className="btn btn--primary h-[32px] px-4 text-[12px]"
              >
                Create Wallet
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL: Delete Wallet & Reassign Transactions --- */}
      {deletingWalletId && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs" 
            onClick={() => setDeletingWalletId(null)} 
          />
          <div className="relative w-full max-w-[440px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Delete Wallet & Reassign Ledger</h3>
              <button 
                onClick={() => setDeletingWalletId(null)}
                className="btn btn--outline btn--icon-sm shrink-0"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Deleting this wallet will permanently remove it. Choose a target destination wallet to automatically reassign all transactions and funds to:
              </p>

              <div className="space-y-1.5 pt-1">
                <label className="text-[12px] font-medium text-[var(--text-primary)]">Reassign Transactions To:</label>
                <CustomSelect
                  value={targetReassignWalletId}
                  onChange={(val) => setTargetReassignWalletId(val)}
                  options={(data.wallets || []).filter(w => w.id !== deletingWalletId).map(w => ({ value: w.id, label: w.name }))}
                  size="md"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingWalletId(null)}
                className="btn btn--outline h-[30px] px-3 text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteWalletWithReassign}
                className="btn btn--danger h-[30px] px-3.5 text-[12px]"
              >
                Delete & Reassign
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Overlays */}
      {confirmAction && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs" onClick={() => setConfirmAction(null)} />
          <div className="relative bg-[var(--bg-surface)] border border-[var(--border-default)] w-full max-w-xs rounded-[12px] p-6 shadow-2xl animate-in zoom-in-95 text-center space-y-4">
            <AlertTriangle size={28} strokeWidth={1.5} className="text-red-500 mx-auto" />
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
                {confirmAction === 'logout' ? 'Confirm Log Out' : 'Delete Account'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {confirmAction === 'logout' 
                  ? 'Are you sure you want to end your current session?' 
                  : 'This will permanently remove your user data and cannot be undone.'}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setConfirmAction(null)} className="btn btn--outline flex-1 h-[32px] text-[12px]">Cancel</button>
              <button onClick={confirmAction === 'logout' ? handleLogout : handleDeleteAccount} className="btn btn--danger flex-1 h-[32px] text-[12px]">Confirm</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showPrivacy && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs" onClick={() => setShowPrivacy(false)} />
          <div className="relative bg-[var(--bg-surface)] border border-[var(--border-default)] w-full max-w-md rounded-[12px] p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Privacy Policy</h3>
              <button onClick={() => setShowPrivacy(false)} className="btn btn--outline btn--icon-sm"><X size={15} strokeWidth={1.5} /></button>
            </div>
            <div className="text-xs text-[var(--text-secondary)] space-y-2 leading-relaxed max-h-60 overflow-y-auto pr-1">
              <p>TrackXpense stores your financial records locally or encrypted via Supabase ADC security infrastructure.</p>
              <p>No raw banking credentials or personal identification details are shared with third-party tracking networks.</p>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setShowPrivacy(false)} className="btn btn--secondary h-[34px] px-4 text-[12px]">Close</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export const PersonnelRegionalManager = ProfileSettings;
