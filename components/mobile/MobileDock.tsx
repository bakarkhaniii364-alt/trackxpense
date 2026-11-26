import React from 'react';
import {
  ClockCounterClockwise,
  List,
  Plus,
  Sliders,
  SquaresFour
} from '@phosphor-icons/react';
import { ViewState } from '../../types';
import { AiStarIcon } from '../shared/AiStarIcon';
import { Haptics } from '../../services/haptics';

interface MobileDockProps {
  currentView: ViewState;
  enableAi?: boolean;
  isDrawerOpen: boolean;
  onSelectView: (view: ViewState) => void;
  onAddTransaction: () => void;
  onOpenDrawer: () => void;
}

export const MobileDock: React.FC<MobileDockProps> = ({
  currentView,
  enableAi = false,
  isDrawerOpen,
  onSelectView,
  onAddTransaction,
  onOpenDrawer
}) => {
  const isMoreActive =
    isDrawerOpen ||
    ['debts', 'analytics', 'provisions', 'subscriptions', 'identity'].includes(currentView) ||
    (enableAi && currentView === 'control');

  const navItemClass = (active: boolean) =>
    `flex-1 flex items-center justify-center min-h-[44px] py-1.5 rounded-[8px] transition-colors cursor-pointer select-none ${
      active
        ? 'text-[var(--text-primary)]'
        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
    }`;

  return (
    <nav
      aria-label="Mobile navigation"
      className="flex-none w-full bg-[var(--bg-page)] border-t border-[var(--border-default)] px-3.5 pb-[env(safe-area-inset-bottom,0px)] z-40 select-none"
    >
      <div className="w-full max-w-2xl mx-auto h-[52px] flex items-center justify-between gap-1">
        {/* 1. Home */}
        <button
          type="button"
          aria-label="Home"
          title="Home"
          onClick={() => {
            Haptics.light();
            onSelectView('dashboard');
          }}
          className={navItemClass(currentView === 'dashboard' && !isDrawerOpen)}
        >
          <SquaresFour size={21} weight={currentView === 'dashboard' && !isDrawerOpen ? 'fill' : 'regular'} />
        </button>

        {/* 2. Ledger */}
        <button
          type="button"
          aria-label="Ledger"
          title="Ledger"
          onClick={() => {
            Haptics.light();
            onSelectView('history');
          }}
          className={navItemClass(currentView === 'history' && !isDrawerOpen)}
        >
          <ClockCounterClockwise size={21} weight={currentView === 'history' && !isDrawerOpen ? 'bold' : 'regular'} />
        </button>

        {/* 3. Center Quick Log */}
        <div className="flex-1 flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              Haptics.light();
              onAddTransaction();
            }}
            aria-label="Add transaction"
            title="Add transaction"
            style={{ padding: 0 }}
            className="btn btn--primary btn--icon !w-12 !h-9 rounded-[8px] flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
          >
            <Plus size={18} weight="bold" className="shrink-0" />
          </button>
        </div>

        {/* 4. RabbAi (if enabled) or Budgets */}
        {enableAi ? (
          <button
            type="button"
            aria-label="RabbAi"
            title="RabbAi"
            onClick={() => {
              Haptics.light();
              onSelectView('rabbai');
            }}
            className={navItemClass(currentView === 'rabbai' && !isDrawerOpen)}
          >
            <AiStarIcon size={21} strokeWidth={1.6} />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Budgets"
            title="Budgets"
            onClick={() => {
              Haptics.light();
              onSelectView('control');
            }}
            className={navItemClass(currentView === 'control' && !isDrawerOpen)}
          >
            <Sliders size={21} weight={currentView === 'control' && !isDrawerOpen ? 'fill' : 'regular'} />
          </button>
        )}

        {/* 5. More (Drawer) */}
        <button
          type="button"
          aria-label="More"
          title="More"
          onClick={() => {
            Haptics.light();
            onOpenDrawer();
          }}
          className={navItemClass(isMoreActive)}
        >
          <List size={21} weight={isMoreActive ? 'bold' : 'regular'} />
        </button>
      </div>
    </nav>
  );
};
