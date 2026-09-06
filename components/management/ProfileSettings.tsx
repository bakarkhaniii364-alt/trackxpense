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
  Lightning as Zap,
  Sparkle,
  FileText
} from '@phosphor-icons/react';
import { Haptics } from '../../services/haptics';
import { navigateTo } from '../../src/services/router';
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

const SETTINGS_SECTIONS = [
  { id: 'profile-section', label: 'Profile & Preferences' },
  { id: 'targets-section', label: 'Spending Limits' },
  { id: 'notifications-section', label: 'Notifications' },
  { id: 'wallets-section', label: 'Wallets & Vaults' },
  { id: 'backup-section', label: 'Data & Backup' },
  { id: 'rabb-ai-section', label: 'RabbAi Assistant' },
  { id: 'legal-section', label: 'Legal & Support' },
  { id: 'account-actions-section', label: 'Account Actions' }
];

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
  // Active section for sticky TOC & mobile quick-jump
  const [activeSection, setActiveSection] = useState<string>('profile-section');

  // Fixed right navigation positioning
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [navPos, setNavPos] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const updateNavPosition = () => {
      if (navContainerRef.current) {
        const rect = navContainerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setNavPos({ left: rect.left, width: rect.width });
        }
      }
    };

    updateNavPosition();
    const raf = requestAnimationFrame(updateNavPosition);

    window.addEventListener('resize', updateNavPosition);
    let resizeObserver: ResizeObserver | null = null;
    if (navContainerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateNavPosition);
      resizeObserver.observe(navContainerRef.current);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateNavPosition);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  const scrollToSection = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  };

  // Scroll to initial section if provided via initialTab
  useEffect(() => {
    if (initialTab) {
      const sectionMap: Record<string, string> = {
        general: 'profile-section',
        wallets: 'wallets-section',
        data_security: 'backup-section'
      };
      const targetId = sectionMap[initialTab];
      if (targetId) {
        setActiveSection(targetId);
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'auto', block: 'start' });
      }
    }
  }, [initialTab]);

  // Track active section as user scrolls
  useEffect(() => {
    const sectionIds = [
      'profile-section',
      'targets-section',
      'notifications-section',
      'wallets-section',
      'backup-section',
      'rabb-ai-section',
      'legal-section',
      'account-actions-section'
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-15% 0px -65% 0px' }
    );

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
  
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
    <div className="w-full space-y-6 mx-auto pb-10">
      
      {/* Main Continuous Layout: 9-Col Content + 3-Col Navigation Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Continuous Settings Stack (9 cols) */}
        <div className="lg:col-span-9 space-y-12">
          
          {/* SECTION 1: PROFILE & PREFERENCES */}
          <div id="profile-section" className="space-y-3 scroll-mt-28">
            <div>
              <h2 className="text-[16px] font-medium text-[var(--text-primary)] tracking-tight">Profile & Preferences</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Your profile name, default currency, and balance privacy.</p>
            </div>

            <div className="space-y-3">
              {/* Card 1: Name */}
              <div className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">
                      Name
                    </span>
                    <div className="sm:hidden">
                      {editingCard !== 'profile' && (
                        <button 
                          onClick={() => setEditingCard('profile')}
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[4px] cursor-pointer transition-colors"
                          title="Edit Name"
                        >
                          <Edit2 size={15} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </div>

                  {editingCard === 'profile' ? (
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <input
                        type="text"
                        value={localProfile.name}
                        onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
                        className="h-[32px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] px-2.5 text-[13px] text-[var(--text-primary)] outline-none w-full max-w-[200px]"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingCard(null)} className="text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">Cancel</button>
                        <button onClick={handleSaveProfile} className="text-[12px] font-medium text-[var(--text-primary)] hover:underline cursor-pointer">Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 text-[13px] text-[var(--text-secondary)]">
                        {localProfile.name || 'User'}
                      </div>
                      <div className="hidden sm:block shrink-0">
                        <button 
                          onClick={() => setEditingCard('profile')}
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[4px] cursor-pointer transition-colors"
                          title="Edit Name"
                        >
                          <Edit2 size={15} strokeWidth={1.5} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Card 2: Default currency */}
              <div className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4 cursor-help" title="Default currency symbol used across expenses and reports">
                      Default currency
                    </span>
                    <div className="sm:hidden">
                      {editingCard !== 'currency' && (
                        <button 
                          onClick={() => setEditingCard('currency')}
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[4px] cursor-pointer transition-colors"
                          title="Change Currency"
                        >
                          <Edit2 size={15} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </div>

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
                      <div className="flex-1 text-[13px] text-[var(--text-secondary)]">
                        Default Currency: <span className="font-mono text-[var(--text-primary)]">{localSettings.currencySymbol}</span>
                      </div>
                      <div className="hidden sm:block shrink-0">
                        <button 
                          onClick={() => setEditingCard('currency')}
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[4px] cursor-pointer transition-colors"
                          title="Change Currency"
                        >
                          <Edit2 size={15} strokeWidth={1.5} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Card 3: Privacy mode */}
              <div className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">
                      Privacy mode
                    </span>
                    <div className="sm:hidden">
                      <button 
                        onClick={togglePrivacyMode}
                        className="text-[13px] text-[var(--text-primary)] hover:underline cursor-pointer"
                      >
                        {localSettings.privacyMode ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 text-[13px] text-[var(--text-secondary)]">
                    Hide account balances: <span className="text-[var(--text-primary)]">{localSettings.privacyMode ? 'Enabled' : 'Disabled'}</span>
                  </div>

                  <div className="hidden sm:block shrink-0">
                    <button 
                      onClick={togglePrivacyMode}
                      className="text-[13px] text-[var(--text-primary)] hover:underline cursor-pointer"
                    >
                      {localSettings.privacyMode ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: TARGET LIMITS */}
          <div id="targets-section" className="space-y-3 scroll-mt-28">
            <div>
              <h2 className="text-[16px] font-medium text-[var(--text-primary)] tracking-tight">Spending Limits</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Set daily and monthly spending limits to keep your budget on track.</p>
            </div>

            <div className="space-y-3">
              {/* Card 1: Daily Expense Limit */}
              <div className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4 cursor-help" title="Target spending limit per day">
                      Daily Expense Limit
                    </span>
                    <div className="sm:hidden">
                      {editingCard !== 'daily_target' && (
                        <button 
                          onClick={() => setEditingCard('daily_target')}
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[4px] cursor-pointer transition-colors"
                          title="Edit Daily Limit"
                        >
                          <Edit2 size={15} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </div>

                  {editingCard === 'daily_target' ? (
                    <div className="flex-1 flex flex-wrap items-center justify-between gap-3">
                      <input
                        type="number"
                        placeholder="Daily limit..."
                        value={localProfile.dailyGoal || ''}
                        onChange={(e) => setLocalProfile({ ...localProfile, dailyGoal: parseFloat(e.target.value) || 0 })}
                        className="w-[160px] h-[32px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] px-2.5 text-[12px] font-mono text-[var(--text-primary)] outline-none"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingCard(null)} className="text-[12px] text-[var(--text-secondary)] cursor-pointer">Cancel</button>
                        <button onClick={handleSaveProfile} className="text-[12px] font-medium text-[var(--text-primary)] hover:underline cursor-pointer">Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 text-[13px] text-[var(--text-secondary)] font-mono">
                        {localProfile.dailyGoal ? fmtMoney(localProfile.dailyGoal, data.settings.currencySymbol) : 'No daily limit set'}
                      </div>
                      <div className="hidden sm:block shrink-0">
                        <button 
                          onClick={() => setEditingCard('daily_target')}
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[4px] cursor-pointer transition-colors"
                          title="Edit Daily Limit"
                        >
                          <Edit2 size={15} strokeWidth={1.5} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Card 2: Monthly Expense Limit */}
              <div className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4 cursor-help" title="Target spending limit per month">
                      Monthly Expense Limit
                    </span>
                    <div className="sm:hidden">
                      {editingCard !== 'monthly_target' && (
                        <button 
                          onClick={() => setEditingCard('monthly_target')}
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[4px] cursor-pointer transition-colors"
                          title="Edit Monthly Limit"
                        >
                          <Edit2 size={15} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </div>

                  {editingCard === 'monthly_target' ? (
                    <div className="flex-1 flex flex-wrap items-center justify-between gap-3">
                      <input
                        type="number"
                        placeholder="Monthly goal..."
                        value={localProfile.monthlyGoal}
                        onChange={(e) => setLocalProfile({ ...localProfile, monthlyGoal: parseFloat(e.target.value) || 0 })}
                        className="w-[160px] h-[32px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] px-2.5 text-[12px] font-mono text-[var(--text-primary)] outline-none"
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditingCard(null)} className="text-[12px] text-[var(--text-secondary)] cursor-pointer">Cancel</button>
                        <button onClick={handleSaveProfile} className="text-[12px] font-medium text-[var(--text-primary)] hover:underline cursor-pointer">Save</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 text-[13px] text-[var(--text-secondary)] font-mono">
                        {fmtMoney(localProfile.monthlyGoal, data.settings.currencySymbol)}
                      </div>
                      <div className="hidden sm:block shrink-0">
                        <button 
                          onClick={() => setEditingCard('monthly_target')}
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[4px] cursor-pointer transition-colors"
                          title="Edit Monthly Limit"
                        >
                          <Edit2 size={15} strokeWidth={1.5} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: NOTIFICATIONS */}
          <div id="notifications-section" className="space-y-3 scroll-mt-28">
            <div>
              <h2 className="text-[16px] font-medium text-[var(--text-primary)] tracking-tight">Notifications</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Manage reminders for daily expenses and upcoming debt due dates.</p>
            </div>

            <div className="space-y-3">
              {/* Card 1: Daily Expense Reminder */}
              <div className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">
                      Daily Expense Reminder
                    </span>
                    <div className="sm:hidden">
                      <button 
                        onClick={() => toggleNotification('expense')}
                        className="text-[13px] text-[var(--text-primary)] hover:underline cursor-pointer"
                      >
                        {localSettings.expenseReminders ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 text-[13px] text-[var(--text-secondary)]">
                    Reminder status: <span className="text-[var(--text-primary)]">{localSettings.expenseReminders ? 'Enabled' : 'Disabled'}</span>
                  </div>

                  <div className="hidden sm:block shrink-0">
                    <button 
                      onClick={() => toggleNotification('expense')}
                      className="text-[13px] text-[var(--text-primary)] hover:underline cursor-pointer"
                    >
                      {localSettings.expenseReminders ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Debt Due Reminder */}
              <div className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">
                      Debt Due Reminder
                    </span>
                    <div className="sm:hidden">
                      <button 
                        onClick={() => toggleNotification('debt')}
                        className="text-[13px] text-[var(--text-primary)] hover:underline cursor-pointer"
                      >
                        {localSettings.debtReminders ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 text-[13px] text-[var(--text-secondary)]">
                    Reminder status: <span className="text-[var(--text-primary)]">{localSettings.debtReminders ? 'Enabled' : 'Disabled'}</span>
                  </div>

                  <div className="hidden sm:block shrink-0">
                    <button 
                      onClick={() => toggleNotification('debt')}
                      className="text-[13px] text-[var(--text-primary)] hover:underline cursor-pointer"
                    >
                      {localSettings.debtReminders ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: WALLETS & ACCOUNTS */}
          <div id="wallets-section" className="space-y-4 scroll-mt-28">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-medium text-[var(--text-primary)] tracking-tight">Wallets & Vaults</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Manage your personal wallets, currency preferences, and savings goals.</p>
              </div>

              <button
                onClick={() => { setNewWalletName(''); setNewWalletTarget(''); setIsAddWalletOpen(true); }}
                className="btn btn--outline h-[32px] px-3 text-[12px] flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <Plus size={14} strokeWidth={1.5} />
                <span>Add new wallet</span>
              </button>
            </div>

            {/* Wallet Selector Row */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-[13px] font-medium text-[var(--text-primary)] whitespace-nowrap">Select Wallet:</span>
              <CustomSelect
                value={selectedWalletIdToConfig}
                onChange={(val) => setSelectedWalletIdToConfig(val)}
                options={(data.wallets || []).map(w => ({ value: w.id, label: `${w.name} (${w.currency || data.settings.currencySymbol || '$'})` }))}
                size="sm"
                className="w-full sm:w-auto min-w-[200px]"
              />
            </div>

            {/* INDIVIDUAL CARDS FOR SELECTED WALLET */}
            {selectedWallet && (
              <div className="space-y-3">
                
                {/* CARD 1: Wallet name */}
                <div id="wallet-identity" className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                    <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                      <span className="text-[13px] font-medium text-[var(--text-primary)]">
                        Wallet name
                      </span>
                      {/* Mobile action */}
                      <div className="sm:hidden flex items-center gap-3">
                        {editingWalletCard !== 'identity' && (
                          <>
                            {(data.wallets || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleInitiateDeleteWallet(selectedWallet.id)}
                                className="text-[12px] text-red-500 hover:underline transition-colors cursor-pointer"
                              >
                                Delete wallet
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setEditingWalletCard('identity')}
                              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[4px] cursor-pointer transition-colors"
                              title="Rename Wallet"
                            >
                              <Edit2 size={15} strokeWidth={1.5} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {editingWalletCard === 'identity' ? (
                      <div className="flex-1 flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={selectedWallet.name}
                          onChange={(e) => handleUpdateWallet(selectedWallet.id, { name: e.target.value })}
                          className="h-[32px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] px-2.5 text-[13px] font-semibold text-[var(--text-primary)] outline-none flex-1 sm:max-w-[220px]"
                          autoFocus
                        />
                        <button 
                          onClick={() => setEditingWalletCard(null)} 
                          className="text-[12px] font-medium text-[var(--text-primary)] hover:underline cursor-pointer shrink-0"
                        >
                          Done
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-full text-[12px] font-mono text-[var(--text-primary)] inline-flex items-center gap-1.5 whitespace-nowrap">
                            <WalletIcon size={13} strokeWidth={1.5} className="text-[var(--text-muted)] shrink-0" />
                            {selectedWallet.name}
                          </span>
                        </div>

                        {/* Desktop action */}
                        <div className="hidden sm:flex items-center gap-3 shrink-0">
                          {(data.wallets || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleInitiateDeleteWallet(selectedWallet.id)}
                              className="text-[13px] text-red-500 hover:underline transition-colors cursor-pointer"
                            >
                              Delete wallet
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingWalletCard('identity')}
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[4px] cursor-pointer transition-colors"
                            title="Rename Wallet"
                          >
                            <Edit2 size={15} strokeWidth={1.5} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* CARD 2: Wallet settings */}
                <div id="wallet-config" className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-4">
                    <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0 sm:pt-0.5">
                      <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4 cursor-help" title="Currency, wallet type, and preferences">
                        Wallet settings
                      </span>
                      {/* Mobile action */}
                      <div className="sm:hidden">
                        {editingWalletCard !== 'config' && (
                          <button
                            type="button"
                            onClick={() => setEditingWalletCard('config')}
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[4px] cursor-pointer transition-colors"
                            title="Edit Wallet Settings"
                          >
                            <Edit2 size={15} strokeWidth={1.5} />
                          </button>
                        )}
                      </div>
                    </div>

                    {editingWalletCard === 'config' ? (
                      <div className="flex-1 w-full space-y-3">
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
                            className="w-full sm:max-w-[240px]"
                          />
                        </div>

                        {/* Mode */}
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-[var(--text-muted)]">Wallet Type</label>
                          <div className="tabs flex w-full sm:max-w-[280px]">
                            <button
                              type="button"
                              onClick={() => handleUpdateWallet(selectedWallet.id, { type: 'STANDARD' })}
                              className={`tab flex-1 justify-center whitespace-nowrap ${
                                selectedWallet.type === 'STANDARD' ? 'is-active' : ''
                              }`}
                            >
                              Standard Wallet
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateWallet(selectedWallet.id, { type: 'GOAL' })}
                              className={`tab flex-1 justify-center whitespace-nowrap ${
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
                              className="w-full sm:max-w-[240px] h-[32px] bg-[var(--bg-subtle)] border border-emerald-500/30 rounded-[6px] px-2 text-[12px] font-mono text-emerald-400 outline-none"
                            />
                          </div>
                        )}

                        {/* Stealth Mode */}
                        <div className="flex items-center justify-between pt-1 sm:max-w-[280px]">
                          <span className="text-[12px] text-[var(--text-secondary)]">Stealth Mode (Hide balance):</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateWallet(selectedWallet.id, { stealthMode: !selectedWallet.stealthMode })}
                            className="text-[12px] font-medium text-[var(--text-primary)] hover:underline"
                          >
                            {selectedWallet.stealthMode ? 'Enabled' : 'Disabled'}
                          </button>
                        </div>

                        {/* Color Code */}
                        <div className="space-y-1 pt-1">
                          <label className="text-[11px] font-medium text-[var(--text-muted)]">Accent Color</label>
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
                          <button onClick={() => setEditingWalletCard(null)} className="text-[12px] font-medium text-[var(--text-primary)] hover:underline cursor-pointer">Done</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 space-y-1 text-[13px] text-[var(--text-secondary)]">
                          <p>Currency: <span className="text-[var(--text-primary)] font-mono">{selectedWallet.currency || data.settings.currencySymbol}</span></p>
                          <p>Type: <span className="text-[var(--text-primary)]">{selectedWallet.type === 'GOAL' ? 'Savings Goal' : 'Standard Wallet'}</span></p>
                          {selectedWallet.type === 'GOAL' && (
                            <p>Savings target: <span className="text-emerald-400 font-mono">{fmtMoney(selectedWallet.targetAmount || 0, selectedWallet.currency || data.settings.currencySymbol)}</span></p>
                          )}
                          <p>Stealth mode: <span className="text-[var(--text-primary)]">{selectedWallet.stealthMode ? 'Enabled (Hidden)' : 'Disabled'}</span></p>
                          <p>Accent color: <span className="text-[var(--text-primary)] capitalize">{selectedWallet.color || 'amber'}</span></p>
                        </div>

                        {/* Desktop action */}
                        <div className="hidden sm:block shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingWalletCard('config')}
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-[4px] cursor-pointer transition-colors"
                            title="Edit Wallet Settings"
                          >
                            <Edit2 size={15} strokeWidth={1.5} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* CARD 3: Default wallet */}
                <div id="wallet-active" className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                    <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                      <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4 cursor-help" title="Primary wallet used for new transactions">
                        Default wallet
                      </span>
                      {/* Mobile action */}
                      <div className="sm:hidden">
                        {data.currentWalletId === selectedWallet.id ? (
                          <span className="text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            Default
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateData({ currentWalletId: selectedWallet.id })}
                            className="text-[12px] text-[var(--text-primary)] hover:underline cursor-pointer"
                          >
                            Set as default
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 text-[13px] text-[var(--text-secondary)]">
                      {data.currentWalletId === selectedWallet.id ? 'Currently set as your default wallet for new expenses' : 'Secondary wallet'}
                    </div>

                    {/* Desktop action */}
                    <div className="hidden sm:block shrink-0">
                      {data.currentWalletId === selectedWallet.id ? (
                        <span className="text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateData({ currentWalletId: selectedWallet.id })}
                          className="text-[13px] text-[var(--text-primary)] hover:underline cursor-pointer"
                        >
                          Set as default
                        </button>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* SECTION 5: DATA & BACKUP */}
          <div id="backup-section" className="space-y-3 scroll-mt-28">
            <div>
              <h2 className="text-[16px] font-medium text-[var(--text-primary)] tracking-tight">Data Management & Backup</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Export transaction spreadsheets, download complete backups, or restore your data.</p>
            </div>

            <div className="space-y-3">
              {/* Card 1: Ledger CSV */}
              <div className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4 cursor-help" title="Download transaction history spreadsheet">
                      Transactions (CSV)
                    </span>
                    <div className="sm:hidden">
                      <button 
                        onClick={exportToCSV}
                        className="text-[12px] text-[var(--text-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Export CSV</span>
                        <ExternalLink size={12} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                      </button>
                    </div>
                  </div>
                  <span className="flex-1 text-[13px] text-[var(--text-secondary)]">
                    Download your complete transaction history formatted as a CSV spreadsheet
                  </span>
                  <div className="hidden sm:block shrink-0">
                    <button 
                      onClick={exportToCSV}
                      className="text-[13px] text-[var(--text-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Export CSV</span>
                      <ExternalLink size={13} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Backup JSON */}
              <div className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4 cursor-help" title="Complete backup of all wallets, transactions, and settings">
                      Full Backup (JSON)
                    </span>
                    <div className="sm:hidden">
                      <button 
                        onClick={exportToJSON}
                        className="text-[12px] text-[var(--text-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Export JSON</span>
                        <ExternalLink size={12} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                      </button>
                    </div>
                  </div>
                  <span className="flex-1 text-[13px] text-[var(--text-secondary)]">
                    Export a complete backup file containing all wallets, transactions, and preferences
                  </span>
                  <div className="hidden sm:block shrink-0">
                    <button 
                      onClick={exportToJSON}
                      className="text-[13px] text-[var(--text-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Export JSON</span>
                      <ExternalLink size={13} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 3: Audit Trail */}
              <div className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4 cursor-help" title="Security and change history log">
                      Activity Log (CSV)
                    </span>
                    <div className="sm:hidden">
                      <button 
                        onClick={() => {
                          const csv = AuditLogger.exportAsCsv();
                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                          saveAs(blob, `trackxpense_activity_log_${Date.now()}.csv`);
                        }}
                        className="text-[12px] text-[var(--text-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Export Log</span>
                        <ExternalLink size={12} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                      </button>
                    </div>
                  </div>
                  <span className="flex-1 text-[13px] text-[var(--text-secondary)]">
                    Export a chronological log of recent account actions, logins, and settings updates
                  </span>
                  <div className="hidden sm:block shrink-0">
                    <button 
                      onClick={() => {
                        const csv = AuditLogger.exportAsCsv();
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        saveAs(blob, `trackxpense_activity_log_${Date.now()}.csv`);
                      }}
                      className="text-[13px] text-[var(--text-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Export Log</span>
                      <ExternalLink size={13} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 4: Restore Backup */}
              <div className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4 cursor-help" title="Restore wallets and transactions from a backup file">
                      Restore Backup
                    </span>
                    <div className="sm:hidden">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[12px] text-[var(--text-primary)] hover:underline cursor-pointer"
                      >
                        Import Backup
                      </button>
                    </div>
                  </div>
                  <span className="flex-1 text-[13px] text-[var(--text-secondary)]">
                    Import an existing TrackXpense backup file with automatic duplicate prevention
                  </span>
                  <div className="hidden sm:block shrink-0">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[13px] text-[var(--text-primary)] hover:underline cursor-pointer"
                    >
                      Import Backup
                    </button>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 6: RABBAI ASSISTANT */}
          <div id="rabb-ai-section" className="space-y-3 scroll-mt-28">
            <div>
              <h2 className="text-[16px] font-medium text-[var(--text-primary)] tracking-tight">RabbAi Assistant</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Fast AI assistant for natural language expense logging, receipt scanning, and budget insights.</p>
            </div>

            <div className="space-y-3">
              {/* Card 1: Enable RabbAi */}
              <div className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">
                      AI Assistant
                    </span>
                    <div className="sm:hidden">
                      <input
                        type="checkbox"
                        checked={Boolean(localSettings.enableAiParsing)}
                        onChange={(e) => {
                          const updated = { ...localSettings, enableAiParsing: e.target.checked };
                          setLocalSettings(updated);
                          updateData({ settings: updated });
                          Haptics.light();
                        }}
                        className="w-4 h-4 rounded border-[var(--border-default)] accent-white cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex-1 text-[13px] text-[var(--text-secondary)]">
                    {Boolean(localSettings.enableAiParsing)
                      ? 'Active — Smart expense entry, voice logging, and receipt scanning are enabled.' 
                      : 'Disabled — App runs in manual entry mode without AI processing.'}
                  </div>
                  <div className="hidden sm:block shrink-0">
                    <input
                      type="checkbox"
                      checked={Boolean(localSettings.enableAiParsing)}
                      onChange={(e) => {
                        const updated = { ...localSettings, enableAiParsing: e.target.checked };
                        setLocalSettings(updated);
                        updateData({ settings: updated });
                        Haptics.light();
                      }}
                      className="w-4 h-4 rounded border-[var(--border-default)] accent-white cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Status */}
              <div className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4 cursor-help" title="Operational status of the AI assistant">
                      Assistant Status
                    </span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    {Boolean(localSettings.enableAiParsing) ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Online — Ready to assist
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] font-medium">
                        <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
                        Turned Off — Pure manual mode active
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                    Private & secure · No data sold
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 7: LEGAL & SUPPORT */}
          <div id="legal-section" className="space-y-3 scroll-mt-28">
            <div>
              <h2 className="text-[16px] font-medium text-[var(--text-primary)] tracking-tight">Legal & Support</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Privacy policy, security information, terms of service, and developer support.</p>
            </div>

            <div className="space-y-3">
              {/* Card 1: Privacy Policy */}
              <a 
                href="/privacy" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group block"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4">
                      Privacy Policy
                    </span>
                    <ExternalLink size={13} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors sm:hidden" />
                  </div>
                  <span className="flex-1 text-[13px] text-[var(--text-secondary)]">
                    How TrackXpense safeguards your financial data and maintains privacy
                  </span>
                  <ExternalLink size={14} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors hidden sm:block shrink-0" />
                </div>
              </a>

              {/* Card 2: Security Policy */}
              <a 
                href="/security" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group block"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4">
                      Security Policy
                    </span>
                    <ExternalLink size={13} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors sm:hidden" />
                  </div>
                  <span className="flex-1 text-[13px] text-[var(--text-secondary)]">
                    Details on encryption, local-first data protection, and security practices
                  </span>
                  <ExternalLink size={14} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors hidden sm:block shrink-0" />
                </div>
              </a>

              {/* Card 3: Terms of Service */}
              <a 
                href="/terms" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group block"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4">
                      Terms of Service
                    </span>
                    <ExternalLink size={13} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors sm:hidden" />
                  </div>
                  <span className="flex-1 text-[13px] text-[var(--text-secondary)]">
                    Terms of use and service guidelines for TrackXpense
                  </span>
                  <ExternalLink size={14} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors hidden sm:block shrink-0" />
                </div>
              </a>

              {/* Card 4: Contact Developer */}
              <a 
                href="mailto:bakarkhaniii364@gmail.com" 
                className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group block"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] underline decoration-dotted underline-offset-4">
                      Contact Support
                    </span>
                    <ChevronRight size={14} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors sm:hidden" />
                  </div>
                  <span className="flex-1 text-[13px] text-[var(--text-secondary)] font-mono">
                    bakarkhaniii364@gmail.com
                  </span>
                  <ChevronRight size={14} strokeWidth={1.5} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors hidden sm:block shrink-0" />
                </div>
              </a>
            </div>
          </div>

          {/* SECTION 8: ACCOUNT ACTIONS */}
          <div id="account-actions-section" className="space-y-3 scroll-mt-28">
            <div>
              <h2 className="text-[16px] font-medium text-[var(--text-primary)] tracking-tight">Account Actions</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Sign out of your active session or delete your account.</p>
            </div>

            <div className="space-y-3">
              {/* Card 1: Log Out */}
              <div className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">
                      Log Out
                    </span>
                    <div className="sm:hidden">
                      <button 
                        onClick={() => setConfirmAction('logout')}
                        className="btn btn--outline h-[30px] px-3 text-[11px] cursor-pointer"
                      >
                        Log Out
                      </button>
                    </div>
                  </div>
                  <span className="flex-1 text-[13px] text-[var(--text-secondary)]">
                    Sign out of TrackXpense on this device
                  </span>
                  <div className="hidden sm:block shrink-0">
                    <button 
                      onClick={() => setConfirmAction('logout')}
                      className="btn btn--outline h-[32px] px-3.5 text-[12px] cursor-pointer"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              </div>

              {/* Card 2: Delete Account */}
              <div className="rounded-[8px] border border-[var(--border-default)] bg-transparent p-4 sm:px-5 sm:py-4 hover:bg-[var(--bg-surface-hover)] transition-colors group">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
                  <div className="flex items-center justify-between sm:w-[220px] sm:shrink-0">
                    <span className="text-[13px] font-medium text-red-400">
                      Delete Account
                    </span>
                    <div className="sm:hidden">
                      <button 
                        onClick={() => setConfirmAction('delete')}
                        className="btn btn--danger h-[30px] px-3 text-[11px] cursor-pointer"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                  <span className="flex-1 text-[13px] text-[var(--text-secondary)]">
                    Permanently delete your account and all associated transactions
                  </span>
                  <div className="hidden sm:block shrink-0">
                    <button 
                      onClick={() => setConfirmAction('delete')}
                      className="btn btn--danger h-[32px] px-3.5 text-[12px] cursor-pointer"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Navigation Column Anchor (3 cols in grid flow) */}
        <div ref={navContainerRef} className="lg:col-span-3 hidden lg:block select-none min-h-[280px]">
          {/* Static fallback before first client measurement */}
          {!navPos && (
            <div className="space-y-4 text-[13px] pl-4 pt-10">
              {SETTINGS_SECTIONS.map(sec => {
                const isActive = activeSection === sec.id;
                return (
                  <a
                    key={sec.id}
                    href={`#${sec.id}`}
                    onClick={(e) => scrollToSection(e, sec.id)}
                    className={`relative flex items-center py-0.5 text-[13px] select-none ${
                      isActive
                        ? 'text-white font-medium'
                        : 'text-[#8A8D93] hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <span 
                        aria-hidden="true"
                        className="absolute -left-4 w-[3px] h-[18px] bg-white rounded-full" 
                      />
                    )}
                    <span>{sec.label}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Truly Fixed Navigation on Document Body (Completely immune to page scrolling) */}
      {navPos && createPortal(
        <div 
          style={{
            position: 'fixed',
            top: '112px',
            left: `${navPos.left}px`,
            width: `${navPos.width}px`,
            zIndex: 30
          }}
          className="hidden lg:block select-none pointer-events-auto"
        >
          <div className="space-y-4 text-[13px] pl-4">
            {SETTINGS_SECTIONS.map(sec => {
              const isActive = activeSection === sec.id;
              return (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  onClick={(e) => scrollToSection(e, sec.id)}
                  className={`relative flex items-center py-0.5 text-[13px] select-none ${
                    isActive
                      ? 'text-white font-medium'
                      : 'text-[#8A8D93] hover:text-white'
                  }`}
                >
                  {isActive && (
                    <span 
                      aria-hidden="true"
                      className="absolute -left-4 w-[3px] h-[18px] bg-white rounded-full" 
                    />
                  )}
                  <span>{sec.label}</span>
                </a>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL: Add New Wallet --- */}
      {isAddWalletOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/75" 
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
            className="fixed inset-0 bg-black/75" 
            onClick={() => setDeletingWalletId(null)} 
          />
          <div className="relative w-full max-w-[440px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Delete Wallet & Transfer Transactions</h3>
              <button 
                onClick={() => setDeletingWalletId(null)}
                className="btn btn--outline btn--icon-sm shrink-0"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Deleting this wallet will permanently remove it. Select a destination wallet to transfer all existing transactions and funds to:
              </p>

              <div className="space-y-1.5 pt-1">
                <label className="text-[12px] font-medium text-[var(--text-primary)]">Transfer Transactions To:</label>
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
                Delete & Transfer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Confirmation Overlays */}
      {confirmAction && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/75" onClick={() => setConfirmAction(null)} />
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
          <div className="fixed inset-0 bg-black/75" onClick={() => setShowPrivacy(false)} />
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
