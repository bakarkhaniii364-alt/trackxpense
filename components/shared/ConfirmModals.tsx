import React from 'react';
import { createPortal } from 'react-dom';
import { Trash as Trash2, WarningCircle as AlertCircle } from '@phosphor-icons/react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemDetails?: {
    title?: string;
    amount?: string | number;
    category?: string;
    date?: string;
  };
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemDetails
}) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal,600)] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity" onClick={onClose} aria-hidden="true" />
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="delete-dialog-title"
        className="relative bg-[var(--bg-surface)] w-full max-w-sm rounded-[10px] p-5 border border-[var(--border-default)] animate-in zoom-in-95 duration-150 text-[var(--text-primary)] z-10"
      >
        <div className="flex flex-col items-center text-center">
          <Trash2 size={22} className="stroke-[1.5px] text-[var(--status-error-fg)] mb-2.5" />
          <h3 id="delete-dialog-title" className="text-[15px] font-medium text-[var(--text-primary)] mb-1">Delete Item?</h3>
          <p className="text-[13px] text-[var(--text-secondary)] mb-4">
            Are you sure you want to delete this record? This action cannot be undone.
          </p>

          {itemDetails && (
            <div className="w-full bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] p-2.5 mb-4 text-left flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-medium text-[var(--text-primary)] truncate">
                  {itemDetails.title || 'Untitled Transaction'}
                </div>
                <div className="text-[11px] text-[var(--text-muted)] truncate">
                  {itemDetails.category || 'General'}{itemDetails.date ? ` • ${itemDetails.date.split('T')[0]}` : ''}
                </div>
              </div>
              {itemDetails.amount !== undefined && (
                <div className="text-[13px] font-semibold text-[var(--text-primary)] shrink-0 tabular-nums">
                  {itemDetails.amount}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 w-full">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn btn--outline flex-1 h-[34px] rounded-[6px] text-[12px] font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={onConfirm} 
              className="flex-1 h-[34px] rounded-[6px] text-[12px] font-medium cursor-pointer transition-colors bg-[var(--status-error-bg)] text-[var(--status-error-fg)] border border-[var(--status-error-fg)]/30 hover:bg-[var(--status-error-fg)] hover:text-white flex items-center justify-center"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal,600)] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity" onClick={onClose} aria-hidden="true" />
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="unsaved-dialog-title"
        className="relative bg-[var(--bg-surface)] w-full max-w-xs rounded-[8px] p-6 border border-[var(--border-default)] shadow-2xl animate-in zoom-in-95 duration-150 text-[var(--text-primary)] z-10"
      >
        <div className="flex flex-col items-center text-center">
          <AlertCircle size={24} className="stroke-[1.5px] text-[var(--status-warning-fg)] mb-3" />
          <h3 id="unsaved-dialog-title" className="text-[15px] font-semibold text-[var(--text-primary)] mb-1">Unsaved Changes</h3>
          <p className="text-[13px] text-[var(--text-secondary)] mb-5">You have unsaved modifications. Do you want to discard them and proceed?</p>
          <div className="flex flex-col gap-2 w-full">
            <button onClick={onConfirm} className="btn btn--primary w-full h-[34px] rounded-[6px] text-[12px] font-medium cursor-pointer">Discard & Continue</button>
            <button onClick={onClose} className="btn btn--outline w-full h-[34px] rounded-[6px] text-[12px] font-medium cursor-pointer">Stay & Save</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
