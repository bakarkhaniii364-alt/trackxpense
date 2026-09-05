import React from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, Lock, FileText } from '@phosphor-icons/react';

export type LegalModalType = 'privacy' | 'terms' | 'security' | null;

interface LegalModalProps {
  type: LegalModalType;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-stealth,9999)] flex items-center justify-center p-4 selection:bg-[var(--accent-subtle)] selection:text-[var(--accent-solid)]">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Dialog */}
      <div className="relative bg-[var(--bg-surface)] border border-[var(--border-default)] w-full max-w-lg rounded-[12px] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 select-none text-left">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            {type === 'privacy' && <ShieldCheck size={18} strokeWidth={1.5} className="text-[var(--status-success-fg)]" />}
            {type === 'terms' && <FileText size={18} strokeWidth={1.5} className="text-[var(--text-primary)]" />}
            {type === 'security' && <Lock size={18} strokeWidth={1.5} className="text-[var(--status-warning-fg)]" />}
            <h3 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">
              {type === 'privacy' && 'Privacy Policy'}
              {type === 'terms' && 'Terms of Service'}
              {type === 'security' && 'Security Architecture'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-[6px] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content Body */}
        <div className="text-[13px] text-[var(--text-secondary)] space-y-3 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
          {type === 'privacy' && (
            <>
              <p className="text-[var(--text-primary)] font-medium">Your financial life belongs strictly to you.</p>
              <p>
                TrackXpense is architected offline-first. Your transactions, categories, budgets, and wallet notes are saved directly to your browser or device storage via IndexedDB.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">Zero Bank Aggregators:</strong> We never ask for your online banking logins or connect to third-party bank scrapers.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">Zero Data Selling:</strong> We do not sell transaction records to brokers or run behavioral tracking scripts.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">AI Off by Default:</strong> The optional RabbAi assistant makes zero network calls unless you explicitly turn it on in Settings.
              </p>
            </>
          )}

          {type === 'terms' && (
            <>
              <p className="text-[var(--text-primary)] font-medium">Simple, honest terms.</p>
              <p>
                TrackXpense is a personal expense tracking and budgeting utility designed to give you clarity and control over your personal cash flow.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">Data Ownership:</strong> You retain complete ownership of all data you input into TrackXpense. You may export your entire transaction history to CSV at any time.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">No Financial Advice:</strong> TrackXpense is an informational tool for personal ledger management and does not constitute licensed accounting or investment advisory services.
              </p>
            </>
          )}

          {type === 'security' && (
            <>
              <p className="text-[var(--text-primary)] font-medium">Hardened local security.</p>
              <p>
                <strong className="text-[var(--text-primary)]">Offline-First Storage:</strong> Primary records live on-device in sandboxed browser databases.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">Encrypted Sync:</strong> If you choose to sign in to sync across devices, sync payloads are transmitted over TLS with strict row-level security.
              </p>
              <p>
                <strong className="text-[var(--text-primary)]">Stealth &amp; Passcode Vault:</strong> Built-in passcode locking and emergency privacy modes allow you to obscure balances instantly when working in public spaces.
              </p>
            </>
          )}
        </div>

        {/* Footer Action */}
        <div className="flex justify-end pt-3 border-t border-[var(--border-default)]">
          <button
            type="button"
            onClick={onClose}
            className="h-[32px] px-4 rounded-[6px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] text-[12px] font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
