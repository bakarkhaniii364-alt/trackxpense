import React from 'react';
import {
  LayoutGrid,
  Clock,
  Plus,
  HandCoins,
  Menu,
} from 'lucide-react';
import { ViewState } from '../types';
import { Haptics } from '../services/haptics';

interface NavBarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  onAddClick: (e: React.MouseEvent) => void;
}

export const NavBar: React.FC<NavBarProps> = ({
  currentView,
  onChangeView,
  onAddClick,
}) => {
  // Views that belong to the menu section
  const MENU_VIEW_IDS: ViewState[] = ['analytics', 'provisions', 'subscriptions', 'control', 'identity', 'menu'];
  const isMenuActive = MENU_VIEW_IDS.includes(currentView);

  const handleNavClick = (view: ViewState) => {
    Haptics.light();
    onChangeView(view);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-surface)] z-[4000] border-t border-[var(--border-default)] pb-[calc(6px+env(safe-area-inset-bottom,0px))] select-none shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="h-[54px] flex items-center justify-around px-3 max-w-md mx-auto relative">
        
        {/* 1. Home / Dashboard */}
        <button
          onClick={() => handleNavClick('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${
            currentView === 'dashboard'
              ? 'text-[var(--text-primary)] font-semibold scale-[1.02]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] active:scale-95'
          }`}
        >
          <div className="relative">
            <LayoutGrid size={18} strokeWidth={1.5} />
            {currentView === 'dashboard' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent-solid)]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Home</span>
        </button>

        {/* 2. History / Ledger */}
        <button
          onClick={() => handleNavClick('history')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${
            currentView === 'history'
              ? 'text-[var(--text-primary)] font-semibold scale-[1.02]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] active:scale-95'
          }`}
        >
          <div className="relative">
            <Clock size={18} strokeWidth={1.5} />
            {currentView === 'history' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent-solid)]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Ledger</span>
        </button>

        {/* 3. Center Floating Quick Add */}
        <div className="flex items-center justify-center px-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              Haptics.light();
              onAddClick(e);
            }}
            className="btn btn--primary !w-[40px] !h-[40px] !p-0 !rounded-[10px] flex items-center justify-center shadow-lg transition-transform active:scale-90"
            title="Add Transaction"
          >
            <Plus size={20} strokeWidth={2.2} />
          </button>
        </div>

        {/* 4. Debts */}
        <button
          onClick={() => handleNavClick('debts')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${
            currentView === 'debts'
              ? 'text-[var(--text-primary)] font-semibold scale-[1.02]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] active:scale-95'
          }`}
        >
          <div className="relative">
            <HandCoins size={18} strokeWidth={1.5} />
            {currentView === 'debts' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent-solid)]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Debts</span>
        </button>

        {/* 5. Menu */}
        <button
          onClick={() => handleNavClick('menu')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all ${
            isMenuActive
              ? 'text-[var(--text-primary)] font-semibold scale-[1.02]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] active:scale-95'
          }`}
        >
          <div className="relative">
            <Menu size={18} strokeWidth={1.5} />
            {isMenuActive && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--accent-solid)]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight">Menu</span>
        </button>

      </div>
    </div>
  );
};

