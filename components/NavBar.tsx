import React from 'react';
import {
  SquaresFour as LayoutGrid,
  Clock,
  Plus,
  Sparkle,
  List as Menu
} from '@phosphor-icons/react';
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
  const MENU_VIEW_IDS: ViewState[] = ['analytics', 'debts', 'provisions', 'subscriptions', 'control', 'identity', 'menu'];
  const isMenuActive = MENU_VIEW_IDS.includes(currentView);

  const handleNavClick = (view: ViewState) => {
    Haptics.light();
    onChangeView(view);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[var(--bg-surface)] z-[var(--z-header,200)] border-t border-[var(--border-default)] pb-[env(safe-area-inset-bottom,0px)] select-none">
      <div className="h-[52px] flex items-center justify-around px-2 max-w-md mx-auto relative">
        
        {/* 1. Home / Dashboard */}
        <button
          onClick={() => handleNavClick('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 h-[48px] gap-1 transition-colors min-w-[44px] cursor-pointer ${
            currentView === 'dashboard'
              ? 'text-[var(--text-primary)] font-medium'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <div className="relative flex flex-col items-center">
            <LayoutGrid size={17} strokeWidth={1.5} />
            {currentView === 'dashboard' && (
              <span className="absolute -bottom-1 w-3 h-[2px] rounded-full bg-[var(--text-primary)]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight leading-none mt-0.5">Home</span>
        </button>

        {/* 2. History / Ledger */}
        <button
          onClick={() => handleNavClick('history')}
          className={`flex flex-col items-center justify-center flex-1 h-[48px] gap-1 transition-colors min-w-[44px] cursor-pointer ${
            currentView === 'history'
              ? 'text-[var(--text-primary)] font-medium'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <div className="relative flex flex-col items-center">
            <Clock size={17} strokeWidth={1.5} />
            {currentView === 'history' && (
              <span className="absolute -bottom-1 w-3 h-[2px] rounded-full bg-[var(--text-primary)]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight leading-none mt-0.5">Ledger</span>
        </button>

        {/* 3. Center Quick Add */}
        <div className="flex items-center justify-center px-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              Haptics.light();
              onAddClick(e);
            }}
            className="w-[34px] h-[34px] rounded-[6px] bg-[var(--accent-solid)] text-[var(--accent-text)] flex items-center justify-center hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            title="Add Transaction"
          >
            <Plus size={17} strokeWidth={1.75} />
          </button>
        </div>

        {/* 4. RabbAi Assistant */}
        <button
          onClick={() => handleNavClick('rabbai')}
          className={`flex flex-col items-center justify-center flex-1 h-[48px] gap-1 transition-colors min-w-[44px] cursor-pointer ${
            currentView === 'rabbai'
              ? 'text-[var(--ds-accent)] font-medium'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <div className="relative flex flex-col items-center">
            <Sparkle size={17} strokeWidth={1.5} className={currentView === 'rabbai' ? 'text-[var(--ds-accent)]' : ''} />
            {currentView === 'rabbai' && (
              <span className="absolute -bottom-1 w-3 h-[2px] rounded-full bg-[var(--ds-accent)]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight leading-none mt-0.5">RabbAi</span>
        </button>

        {/* 5. Menu */}
        <button
          onClick={() => handleNavClick('menu')}
          className={`flex flex-col items-center justify-center flex-1 h-[48px] gap-1 transition-colors min-w-[44px] cursor-pointer ${
            isMenuActive
              ? 'text-[var(--text-primary)] font-medium'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
          }`}
        >
          <div className="relative flex flex-col items-center">
            <Menu size={17} strokeWidth={1.5} />
            {isMenuActive && (
              <span className="absolute -bottom-1 w-3 h-[2px] rounded-full bg-[var(--text-primary)]" />
            )}
          </div>
          <span className="text-[10px] tracking-tight leading-none mt-0.5">Menu</span>
        </button>

      </div>
    </nav>
  );
};

