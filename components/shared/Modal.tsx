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
    <div className="fixed inset-0 z-[var(--z-modal,600)] flex items-center justify-center p-4">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Centered Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidth} bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150 text-[var(--text-primary)] z-10 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (No bottom divider) */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between gap-4">
            {title ? (
              <h3 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">
                {title}
              </h3>
            ) : <div />}

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="w-7 h-7 rounded-[6px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors shrink-0"
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
