import React, { useRef, useState } from 'react';
import { AppData, TransactionType } from '../../types';
import { Download, Upload, Trash2, ShieldCheck, Database, FileText, Code } from 'lucide-react';
import { CustomConfirmModal } from '../shared/CommonUI';
import { generateCSV, downloadFile } from '../../utils/dataExport';

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
  const [exportFormat, setExportFormat] = useState<'JSON' | 'CSV'>('JSON');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className={`space-y-6 ${isCompact ? '' : 'w-full mx-auto pb-10'}`}>
      {!isCompact && (
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/20 text-primary rounded-sm border border-primary/20">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-main tracking-tight">Data Storage</h2>
            <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Backup & Restore Center</p>
          </div>
        </div>
      )}

      <div className="bento-grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Export Card */}
        <div className="glass-card bento-card p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download size={16} className="text-primary" />
              <p className="text-[9px] uppercase font-black text-muted tracking-[0.2em]">Export Settings</p>
            </div>
            <div className="flex bg-black/40 p-1 rounded-sm border border-white/5">
                {(['JSON', 'CSV'] as const).map(f => (
                    <button 
                        key={f}
                        onClick={() => setExportFormat(f)}
                        className={`px-3 py-1 rounded-md text-[9px] font-black transition-all ${exportFormat === f ? 'bg-primary text-white shadow-lg' : 'text-muted/40 hover:text-muted'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>
          </div>
          
          <div className="flex-1">
             <h3 className="text-lg font-bold text-main tracking-tight mb-2">Export Backup</h3>
             <p className="text-[10px] text-muted leading-relaxed">
                Generate a {exportFormat} backup file of all wallets, transactions, and categories. 
                Recommended for backup or transfer.
             </p>
          </div>

          <button
            onClick={handleExport}
            className="w-full py-4 bg-primary text-white rounded-sm font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {exportFormat === 'JSON' ? <Code size={14} /> : <FileText size={14} />}
            Export as {exportFormat}
          </button>
        </div>

        {/* Import Card */}
        <div className="glass-card bento-card p-6 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Upload size={16} className="text-emerald-400" />
            <p className="text-[9px] uppercase font-black text-muted tracking-[0.2em]">Import Settings</p>
          </div>

          <div className="flex-1">
             <h3 className="text-lg font-bold text-main tracking-tight mb-2">Restore from Backup</h3>
             <p className="text-[10px] text-muted leading-relaxed">
                Select a previously exported JSON backup file to override current local storage. 
                Warning: This process will replace existing local data.
             </p>
          </div>

          <div className="relative">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-sm font-bold text-[10px] uppercase tracking-[0.2em] transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              <ShieldCheck size={14} />
              Select File & Import
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
      <div className="glass-card bento-card p-6 border-rose-500/20 bg-rose-500/5">
        <div className="flex items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 size={16} className="text-rose-500" />
              <p className="text-[9px] uppercase font-black text-rose-500 tracking-[0.2em]">Danger Zone</p>
            </div>
            <h3 className="text-sm font-bold text-main tracking-tight">Erase All Data</h3>
            <p className="text-[10px] text-muted">Permanently delete all transactions, wallets, and settings from this device.</p>
          </div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-8 py-3 bg-rose-500 text-white rounded-md font-bold text-[9px] uppercase tracking-[0.2em] shadow-lg shadow-rose-500/20 transition-all active:scale-[0.95]"
          >
            Delete All Data
          </button>
        </div>
      </div>

      <CustomConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleReset}
        title="Delete All Data?"
        message="This will permanently delete all local data and settings. This action cannot be undone."
        isDanger={true}
      />
    </div>
  );
};
