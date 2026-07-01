import React, { useState, useEffect, useRef } from 'react';
import { AppData, Transaction, TransactionType } from '../../types';
import { 
  Bell, 
  AlertTriangle, 
  User, 
  Settings, 
  Fingerprint, 
  Mail, 
  LogOut, 
  Trash2, 
  ChevronRight,
  X,
  AlertCircle,
  Download,
  Upload,
  Activity,
  FileJson,
  FileSpreadsheet
} from 'lucide-react';
import { CURRENCIES, GlassSelect } from '../shared/CommonUI';
import { FieldHelp } from '../pc/FieldHelp';
import { supabase } from '../../services/supabase';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';

interface PersonnelRegionalManagerProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  isCompact?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
  onLogout?: () => void;
}

export const PersonnelRegionalManager: React.FC<PersonnelRegionalManagerProps> = ({ 
  data, 
  updateData, 
  isCompact = false,
  onDirtyChange,
  onLogout
}) => {
  const [localProfile, setLocalProfile] = useState(data.profile);
  const [localSettings, setLocalSettings] = useState(data.settings);
  const [confirmAction, setConfirmAction] = useState<'logout' | 'delete' | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProfileDirty = JSON.stringify(localProfile) !== JSON.stringify(data.profile);
  const isSettingsDirty = JSON.stringify(localSettings) !== JSON.stringify(data.settings);
  const isDirty = isProfileDirty || isSettingsDirty;

  useEffect(() => {
    if (onDirtyChange) onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSaveProfile = () => {
    updateData({ profile: localProfile });
  };

  const handleSaveSettings = () => {
    updateData({ settings: localSettings });
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
    const currentVal =
      type === 'expense' ? localSettings.expenseReminders : localSettings.debtReminders;
    
    setLocalSettings((prev) => ({
      ...prev,
      [type === 'expense' ? 'expenseReminders' : 'debtReminders']: !currentVal,
    }));
  };

  // --- Data Transmission Logic ---
  const exportToJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `trackxpense_backup_${new Date().toISOString().split('T')[0]}.json`);
  };

  const exportToCSV = () => {
    const txs = data.transactions.map(t => ({
      Date: t.date,
      Type: t.type,
      Category: t.category,
      Amount: t.amount,
      Note: t.note || '',
      Wallet: data.wallets.find(w => w.id === t.walletId)?.name || 'Default',
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
        if (!importedData.transactions || !Array.isArray(importedData.transactions)) {
          alert("Invalid data format. Transaction array missing.");
          return;
        }

        // Smart merge
        const existingIds = new Set(data.transactions.map(t => t.id));
        const existingSignatures = new Set(data.transactions.map(t => `${t.date}_${t.amount}_${t.category}`));

        const newTransactions = importedData.transactions.filter((t: Transaction) => {
          if (existingIds.has(t.id)) return false;
          const sig = `${t.date}_${t.amount}_${t.category}`;
          if (existingSignatures.has(sig)) return false;
          return true;
        });

        if (newTransactions.length === 0) {
          alert("No new unique transactions found in import file.");
          return;
        }

        // Also merge wallets/categories if they don't exist
        const updatedWallets = [...data.wallets];
        importedData.wallets?.forEach((w: any) => {
            if (!updatedWallets.find(ew => ew.id === w.id)) updatedWallets.push(w);
        });

        const updatedCategories = [...data.categories];
        importedData.categories?.forEach((c: any) => {
            if (!updatedCategories.find(ec => ec.id === c.id)) updatedCategories.push(c);
        });

        updateData({
          transactions: [...data.transactions, ...newTransactions],
          wallets: updatedWallets,
          categories: updatedCategories
        });

        alert(`Successfully imported ${newTransactions.length} unique records.`);
      } catch (err) {
        alert("Failed to parse import file. Ensure it is a valid TrackXpense JSON backup.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const ConfirmationOverlay = ({ action }: { action: 'logout' | 'delete' }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setConfirmAction(null)} />
      <div className="relative liquid-glass p-8 rounded-sm w-full max-w-[320px] border border-white/10 shadow-2xl">
        <div className="flex flex-col items-center text-center">
            <div className={`w-14 h-14 rounded-md flex items-center justify-center mb-4 ${action === 'delete' ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
                {action === 'delete' ? <Trash2 size={28} /> : <LogOut size={28} />}
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{action === 'delete' ? 'Delete Account?' : 'Log Out?'}</h3>
            <p className="text-xs text-white/40 font-medium mb-8">
                {action === 'delete' ? 'Your account and all associated data will be permanently deleted.' : 'Your financial data will remain safely stored in the cloud.'}
            </p>
            <div className="flex gap-3 w-full">
                <button onClick={() => setConfirmAction(null)} className="flex-1 py-4 rounded-sm bg-white/5 text-white/60 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                <button onClick={action === 'delete' ? handleDeleteAccount : handleLogout} className={`flex-1 py-4 rounded-sm text-white text-[10px] font-black uppercase tracking-widest transition-all ${action === 'delete' ? 'bg-red-600 shadow-lg shadow-red-600/20' : 'bg-primary shadow-lg shadow-primary/20'}`}>Confirm</button>
            </div>
        </div>
      </div>
    </div>
  );

  const PrivacyModal = () => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowPrivacy(false)} />
      <div className="relative liquid-glass p-8 rounded-lg w-full max-w-lg border border-white/10 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-main tracking-tight">Privacy Policy</h2>
            <button onClick={() => setShowPrivacy(false)} className="p-2 bg-white/5 rounded-full text-muted hover:text-main transition-colors"><X size={20}/></button>
        </div>
        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
            <p className="text-sm text-white/60 leading-relaxed font-medium italic">"We like your money, but we don't like your business."</p>
            <div className="space-y-4">
                <div className="p-5 rounded-sm bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Rule #1: You are the Ghost</p>
                    <p className="text-xs text-white/40 leading-relaxed">We don't know who you are. We don't want to. Your transactions are end-to-end encrypted bits. If you buy 14 ducks at midnight, that's between you and the ducks.</p>
                </div>
                <div className="p-5 rounded-sm bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Rule #2: Zero Tracking</p>
                    <p className="text-xs text-white/40 leading-relaxed">No pixels. No cookies (except the ones you eat while looking at your balance). No "personalized ads" trying to sell you a duck-feeder.</p>
                </div>
                <div className="p-5 rounded-sm bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Rule #3: Your Data is Yours</p>
                    <p className="text-xs text-white/40 leading-relaxed">Want to delete everything? We do it for real. Your data leaves our cloud faster than your money leaves your wallet on payday.</p>
                </div>
            </div>
            <p className="text-[10px] text-white/20 text-center uppercase font-black tracking-widest pt-4">TrackXpense v4.0 • Zero Bullshit Edition</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${isCompact ? '' : 'max-w-5xl mx-auto pb-6 overflow-x-hidden'}`}>

      {/* Profile Section */}
      <div className="liquid-glass p-6 rounded-sm shadow-xl space-y-6">
        <div className="flex items-center gap-2 mb-2">
            <p className="text-[9px] uppercase font-black text-muted tracking-[0.2em]">Profile Details</p>
        </div>
        <div className={`grid grid-cols-1 ${isCompact ? 'gap-4' : 'md:grid-cols-3 gap-6'}`}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[9px] uppercase font-black text-muted/40 tracking-[0.2em]">Full Name</label>
              <FieldHelp text="Your display name." />
            </div>
            <input
              type="text"
              value={localProfile.name}
              onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
              className="w-full bg-black/20 rounded-sm px-4 py-3 text-xs text-main border border-white/5 focus:border-primary/40 outline-none transition-all font-bold"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[9px] uppercase font-black text-muted/40 tracking-[0.2em]">Monthly Budget</label>
              <FieldHelp text="Your target monthly spending limit." />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 font-black text-[9px]">
                {data.settings.currencySymbol}
              </span>
              <input
                type="number"
                value={localProfile.monthlyGoal}
                onChange={(e) =>
                  setLocalProfile({ ...localProfile, monthlyGoal: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-black/20 rounded-sm pl-10 pr-4 py-3 text-xs text-main border border-white/5 focus:border-primary/40 outline-none transition-all font-bold"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[9px] uppercase font-black text-muted/40 tracking-[0.2em]">Daily Limit</label>
              <FieldHelp text="Alerts when daily spending goes over this limit." />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 font-black text-[9px]">
                {data.settings.currencySymbol}
              </span>
              <input
                type="number"
                placeholder="No limit..."
                value={localProfile.dailyGoal || ''}
                onChange={(e) =>
                  setLocalProfile({ ...localProfile, dailyGoal: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-black/20 rounded-sm pl-10 pr-4 py-3 text-xs text-main border border-white/5 focus:border-primary/40 outline-none transition-all font-bold"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSaveProfile}
            disabled={!isProfileDirty}
            className="bg-primary/20 text-primary border border-primary/20 px-6 py-2 rounded-sm text-xs font-bold hover:bg-primary hover:text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Update Profile
          </button>
        </div>
      </div>

      {/* Preferences Section */}
      <div className={`grid grid-cols-1 ${isCompact ? 'gap-4' : 'md:grid-cols-2 gap-5'}`}>
        <div className="liquid-glass p-6 rounded-sm shadow-xl space-y-5">
          <div className="flex items-center gap-2">
            <p className="text-[9px] uppercase font-black text-muted tracking-[0.2em]">Preferences</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {CURRENCIES.map((curr) => (
              <button
                key={curr.value}
                onClick={() => setLocalSettings({ ...localSettings, currencySymbol: curr.symbol })}
                className={`p-3 rounded-sm flex items-center justify-between border transition-all ${
                  localSettings.currencySymbol === curr.symbol
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : 'bg-black/20 border-transparent text-muted hover:border-white/10'
                }`}
              >
                <span className="text-[11px] font-bold">{curr.value}</span>
                <span className="font-mono text-xs opacity-50">{curr.symbol}</span>
              </button>
            ))}
          </div>
          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={!isSettingsDirty}
              className="bg-primary/20 text-primary border border-primary/20 px-6 py-2 rounded-sm text-xs font-bold hover:bg-primary hover:text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Update Preferences
            </button>
          </div>
        </div>

        <div className="liquid-glass p-6 rounded-sm shadow-xl space-y-6">
          <div className="flex items-center gap-2">
            <p className="text-[9px] uppercase font-black text-muted tracking-[0.2em]">Notifications</p>
          </div>

          <div className="space-y-3">
            {[
              { id: 'expense' as const, label: 'Expense Reminders', icon: Bell, active: localSettings.expenseReminders },
              {
                id: 'debt' as const,
                label: 'Debt Reminders',
                icon: AlertTriangle,
                active: localSettings.debtReminders,
              },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => toggleNotification(sub.id)}
                className="w-full p-4 bg-black/20 rounded-md border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-sm transition-colors border ${
                      sub.active
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-white/5 border-white/5 text-muted/40'
                    }`}
                  >
                    <sub.icon size={14} />
                  </div>
                  <span className="text-[11px] font-bold text-main">{sub.label}</span>
                </div>
                <div
                  className={`w-8 h-4 rounded-full relative transition-colors ${
                    sub.active ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                      sub.active ? 'left-4.5' : 'left-0.5'
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={!isSettingsDirty}
              className="bg-primary/20 text-primary border border-primary/20 px-6 py-2 rounded-sm text-xs font-bold hover:bg-primary hover:text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Update Alerts
            </button>
          </div>
        </div>
      </div>

      {/* Data Backup (Export/Import) */}
      {!isCompact && (
        <div className="liquid-glass p-6 rounded-sm shadow-xl space-y-6">
            <div className="flex items-center gap-2">
                <p className="text-[9px] uppercase font-black text-muted tracking-[0.2em]">Data Management</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={exportToCSV} className="p-5 rounded-md bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 transition-all flex flex-col items-center gap-3 group">
                    <FileSpreadsheet size={24} className="text-muted group-hover:text-primary transition-colors" />
                    <div className="text-center">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest block">Export Ledger</span>
                        <span className="text-[8px] text-muted uppercase font-bold tracking-tighter">Format: CSV (Excel Compatible)</span>
                    </div>
                </button>
                <button onClick={exportToJSON} className="p-5 rounded-md bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 transition-all flex flex-col items-center gap-3 group">
                    <FileJson size={24} className="text-muted group-hover:text-primary transition-colors" />
                    <div className="text-center">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest block">Export Backup</span>
                        <span className="text-[8px] text-muted uppercase font-bold tracking-tighter">Format: JSON (Full Backup)</span>
                    </div>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="p-5 rounded-md bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/20 transition-all flex flex-col items-center gap-3 group">
                    <Upload size={24} className="text-muted group-hover:text-emerald-500 transition-colors" />
                    <div className="text-center">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest block">Import Data</span>
                        <span className="text-[8px] text-muted uppercase font-bold tracking-tighter">Smart Deduplication Active</span>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
                </button>
            </div>
        </div>
      )}

      {/* Security & Support (Desktop Only) */}
      {!isCompact && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="liquid-glass p-6 rounded-sm shadow-xl space-y-5">
                <div className="flex items-center gap-2">
                    <p className="text-[9px] uppercase font-black text-muted tracking-[0.2em]">Trust & Legal</p>
                </div>
                <div className="space-y-2">
                    <button onClick={() => setShowPrivacy(true)} className="w-full px-4 py-3 flex items-center justify-between rounded-sm hover:bg-white/5 transition-all group border border-white/5">
                        <div className="flex items-center gap-4">
                            <Fingerprint size={16} className="text-muted group-hover:text-primary transition-colors" />
                            <span className="text-xs font-bold text-main">View Privacy Policy</span>
                        </div>
                        <ChevronRight size={14} className="text-muted/20" />
                    </button>
                    <a href="mailto:dev@trackxpense.app" className="w-full px-4 py-3 flex items-center justify-between rounded-sm hover:bg-white/5 transition-all group border border-white/5">
                        <div className="flex items-center gap-4">
                            <Mail size={16} className="text-muted group-hover:text-primary transition-colors" />
                            <span className="text-xs font-bold text-main">Contact Developer</span>
                        </div>
                        <ChevronRight size={14} className="text-muted/20" />
                    </a>
                </div>
            </div>

            <div className="liquid-glass p-6 rounded-sm shadow-xl space-y-5">
                <div className="flex items-center gap-2">
                    <p className="text-[9px] uppercase font-black text-red-500 tracking-[0.2em]">Account Actions</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setConfirmAction('logout')} className="flex-1 px-4 py-3 flex flex-col items-center justify-center gap-2 rounded-md bg-white/5 hover:bg-primary/10 border border-white/5 hover:border-primary/20 transition-all group">
                        <LogOut size={20} className="text-primary" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Log Out</span>
                        <p className="text-[7px] font-black text-primary/40 uppercase tracking-widest">Keep data</p>
                    </button>
                    <button onClick={() => setConfirmAction('delete')} className="flex-1 px-4 py-3 flex flex-col items-center justify-center gap-2 rounded-md bg-white/5 hover:bg-red-500/10 border border-white/5 hover:border-red-500/20 transition-all group">
                        <Trash2 size={20} className="text-red-500" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Delete account</span>
                        <p className="text-[7px] font-black text-red-500/40 uppercase tracking-widest">Permanent</p>
                    </button>
                </div>
            </div>
        </div>
      )}

      {confirmAction && <ConfirmationOverlay action={confirmAction} />}
      {showPrivacy && <PrivacyModal />}
    </div>
  );
};
