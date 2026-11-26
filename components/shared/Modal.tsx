import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X
} from '@phosphor-icons/react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string; // e.g. 'max-w-[440px]'
  className?: string;
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-[440px]',
  className = '',
  showCloseButton = true,
}) => {
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[var(--z-modal,600)] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Responsive Dialog: Bottom Sheet on Mobile, Centered on Desktop */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidth} bg-[var(--bg-surface)] border border-[var(--border-default)] ring-1 ring-white/5 rounded-t-[14px] rounded-b-none sm:rounded-[8px] px-5 sm:px-6 pt-3 sm:py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] max-h-[90dvh] overflow-y-auto space-y-4 sm:space-y-5 animate-in zoom-in-95 duration-150 text-[var(--text-primary)] z-10 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-9 h-1 rounded-full bg-[var(--border-active)] mx-auto" />
        {/* Header (No bottom divider) */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between gap-4">
            {title ? (
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                {title}
              </h3>
            ) : <div />}

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="w-7 h-7 rounded-[6px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer shrink-0"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            )}
          </div>
        )}

        {/* Modal Body & Actions (No horizontal separators) */}
        <div>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
