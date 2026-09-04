import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppData, TransactionType } from '../../types';
import {
  Download,
  Upload,
  Trash as Trash2,
  ShieldCheck,
  Database,
  FileText,
  Code,
  Warning as AlertTriangle,
  X
} from '@phosphor-icons/react';
import { generateCSV, downloadFile } from '../../utils/dataExport';
import { wipeAllSiteData } from '../../services/storage';

interface DataManagementProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  isCompact?: boolean;
}

export const DataManagement: React.FC<DataManagementProps> = ({ 
  data, 
  updateData, 
  isCompact = false 
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [confirmNameInput, setConfirmNameInput] = useState('');
  const [exportFormat, setExportFormat] = useState<'JSON' | 'CSV'>('JSON');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetUserName = (data.profile?.name || 'User').trim();
  const isNameMatched = confirmNameInput.trim().toLowerCase() === targetUserName.toLowerCase();

  const handleExport = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    if (exportFormat === 'JSON') {
      const content = JSON.stringify(data, null, 2);
      downloadFile(content, `trackxpense_vault_${timestamp}.json`, 'application/json');
    } else {
      const csvContent = generateCSV(data.transactions, data.settings.currencySymbol);
      downloadFile(csvContent, `trackxpense_ledger_${timestamp}.csv`, 'text/csv');
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const restoredData = JSON.parse(ev.target?.result as string);
          updateData(restoredData);
        } catch (err) {
          alert('Import Failed: Invalid backup file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleConfirmWipe = () => {
    if (!isNameMatched) return;
    wipeAllSiteData();
  };

  return (
    <div className={`space-y-6 ${isCompact ? '' : 'w-full mx-auto pb-10'}`}>
      {!isCompact && (
        <div className="flex items-center gap-3">
          <Database size={22} strokeWidth={1.5} className="text-[var(--accent)]" />
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Data Storage</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Backup, restore and local ledger controls.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Export Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[10px] p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download size={16} strokeWidth={1.5} className="text-[var(--accent)]" />
              <p className="text-[11px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em]">Export Data</p>
            </div>
            <div className="tabs">
              {(['JSON', 'CSV'] as const).map(f => (
                <button 
                  key={f}
                  onClick={() => setExportFormat(f)}
                  className={`tab ${exportFormat === f ? 'is-active' : ''}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex-1">
             <h3 className="text-base font-semibold text-[var(--text-primary)] tracking-tight mb-1">Export Backup Snapshot</h3>
             <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Generate a {exportFormat} backup file of all wallets, transactions, and categories. 
                Recommended for secure local backup or device migration.
             </p>
          </div>

          <button
            onClick={handleExport}
            className="btn btn--primary w-full h-[32px] text-[12px] flex items-center justify-center gap-1.5"
          >
            {exportFormat === 'JSON' ? <Code size={14} strokeWidth={1.5} /> : <FileText size={14} strokeWidth={1.5} />}
            <span>Export as {exportFormat}</span>
          </button>
        </div>

        {/* Import Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[10px] p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <Upload size={16} strokeWidth={1.5} className="text-emerald-400" />
            <p className="text-[11px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em]">Import Data</p>
          </div>

          <div className="flex-1">
             <h3 className="text-base font-semibold text-[var(--text-primary)] tracking-tight mb-1">Restore from Backup</h3>
             <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Select a previously exported JSON backup file to restore your wallets and transactions with automated deduplication.
             </p>
          </div>

          <div className="relative">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn btn--secondary w-full h-[32px] text-[12px] flex items-center justify-center gap-1.5"
            >
              <ShieldCheck size={15} strokeWidth={1.5} className="text-emerald-400" />
              <span>Select File & Import</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".json"
              onChange={handleRestore}
            />
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-[var(--bg-surface)] border border-rose-500/20 rounded-[10px] p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Trash2 size={16} strokeWidth={1.5} className="text-rose-400" />
              <p className="text-[11px] uppercase font-medium text-rose-400 tracking-[0.06em]">Danger Zone</p>
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">Erase All Site Data</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Permanently delete all transactions, wallets, debts, and settings from this device.</p>
          </div>
          <button
            onClick={() => {
              setConfirmNameInput('');
              setShowResetConfirm(true);
            }}
            className="btn btn--danger h-[32px] px-3.5 text-[12px] shrink-0"
          >
            Delete All Data
          </button>
        </div>
      </div>

      {/* Username Confirmed Delete All Data Modal */}
      {showResetConfirm && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150" 
            onClick={() => setShowResetConfirm(false)} 
          />

          <div className="relative w-full max-w-[440px] bg-[var(--bg-surface)] rounded-[12px] p-6 border border-rose-500/30 shadow-2xl z-10 text-[var(--text-primary)] animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="text-rose-500 shrink-0">
                  <AlertTriangle size={24} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">Delete All Site Data?</h3>
                  <p className="text-[11px] text-[var(--status-error-fg)] font-medium">Warning: This action is permanent and cannot be undone.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="btn btn--outline btn--icon-sm shrink-0"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              This will permanently delete all your wallets, transactions, debts, categories, and chat records from this device.
            </p>

            <div className="space-y-2 bg-[var(--bg-subtle)] p-3.5 rounded-[8px] border border-[var(--border-default)]">
              <label className="text-[12px] font-medium text-[var(--text-primary)] block">
                Type your user name <span className="font-bold text-rose-400">"{targetUserName}"</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmNameInput}
                onChange={(e) => setConfirmNameInput(e.target.value)}
                placeholder={`Type "${targetUserName}"...`}
                className="w-full h-[36px] px-3 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[12px] text-[var(--text-primary)] focus:border-rose-500 outline-none font-semibold placeholder:font-normal"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2.5 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="btn btn--outline h-[30px] px-3 text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmWipe}
                disabled={confirmNameInput.trim().toLowerCase() !== targetUserName.toLowerCase()}
                className="btn btn--danger h-[30px] px-3.5 text-[12px]"
              >
                Permanently Wipe Data
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

