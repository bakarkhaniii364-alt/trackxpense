import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDownRight,
  Calendar,
  Gear,
  HandCoins,
  Pulse,
  SignOut,
  Sliders,
  TrendUp,
  X
} from '@phosphor-icons/react';
import { AppData, ViewState } from '../../types';
import { Haptics } from '../../services/haptics';

interface MobileMoreSheetProps {
  isOpen: boolean;
  currentView: ViewState;
  data: AppData;
  onClose: () => void;
  onSelectView: (view: ViewState, subTab?: string) => void;
  onLogout?: () => void;
}

export const MobileMoreSheet: React.FC<MobileMoreSheetProps> = ({
  isOpen,
  currentView,
  data,
  onClose,
  onSelectView,
  onLogout
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items: { id: ViewState; label: string; icon: React.ComponentType<any>; subTab?: string }[] = [
    { id: 'debts', label: 'Debts & IOUs', icon: HandCoins },
    { id: 'analytics', label: 'Analytics', icon: Pulse },
    { id: 'control', label: 'Budgets & Categories', icon: Sliders },
    { id: 'provisions', label: 'Upcoming Expenses', icon: Calendar },
    { id: 'subscriptions', label: 'Subscriptions', icon: TrendUp },
    { id: 'identity', label: 'Profile & Settings', icon: Gear, subTab: 'general' }
  ];

  const handleSelect = (view: ViewState, subTab?: string) => {
    Haptics.light();
    onSelectView(view, subTab);
    onClose();
  };

  return createPortal(
    <div style={{ zIndex: 9999 }} className="fixed inset-0 flex items-end justify-center">
      <div
        className="fixed inset-0 bg-black/75 transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="More navigation"
        style={{ backgroundColor: 'var(--bg-surface)', borderTopLeftRadius: '14px', borderTopRightRadius: '14px' }}
        className="relative z-10 w-full max-w-2xl border-t border-x border-[var(--border-default)] px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] space-y-3 animate-in fade-in duration-150"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full bg-[var(--border-active)] mx-auto" />

        {/* Account Header */}
        <div className="flex items-center justify-between px-1 pb-2 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[13px] font-medium text-[var(--text-primary)] shrink-0">
              {data.profile?.name ? data.profile.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-medium text-[var(--text-primary)] truncate">
                {data.profile?.name || 'User'}
              </div>
              <div className="text-[12px] text-[var(--text-muted)] truncate">
                {data.wallets.find(w => w.id === data.currentWalletId)?.name || 'Active Wallet'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="w-8 h-8 rounded-[6px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-2 gap-2">
          {items.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id, item.subTab)}
                className={`h-[48px] px-3 rounded-[8px] border flex items-center gap-2.5 text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--bg-surface-hover)] border-[var(--border-active)] text-[var(--text-primary)] font-medium'
                    : 'bg-[var(--bg-page)] border-[var(--border-default)] hover:border-[var(--border-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon size={17} strokeWidth={1.5} className="shrink-0" />
                <span className="text-[13px] truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {onLogout && (
          <div className="pt-1 border-t border-[var(--border-default)]">
            <button
              type="button"
              onClick={() => {
                Haptics.light();
                onClose();
                onLogout();
              }}
              className="w-full h-[42px] px-3 rounded-[8px] flex items-center justify-between text-[13px] font-medium text-[var(--status-error-fg)] hover:bg-[var(--status-error-bg)] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <SignOut size={16} strokeWidth={1.5} />
                <span>Log out</span>
              </span>
              <ArrowDownRight size={13} className="opacity-60 -rotate-45" />
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
