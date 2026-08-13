import React from 'react';
import {
  Home,
  Plus,
  Clock,
  HandCoins,
  AlignJustify,
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

  const handleNavClick = (view: ViewState | null, onClick: () => void) => {
    Haptics.light();
    onClick();
  };

  const NavBtn = ({
    icon: Icon,
    onClick,
    active,
  }: {
    icon: React.ElementType;
    onClick: () => void;
    active: boolean;
  }) => (
    <button
      onClick={() => handleNavClick(null, onClick)}
      className={`flex flex-col items-center justify-center flex-1 h-full transition-colors relative select-none z-10 border-t-2 ${
        active 
          ? 'border-[var(--text-primary)] text-[var(--text-primary)] font-medium' 
          : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      }`}
    >
      <Icon 
        size={18} 
        strokeWidth={1.5} 
        className="transition-colors" 
      />
    </button>
  );

  return (
    <div className="fixed bottom-0 left-0 w-full bg-[var(--bg-surface)] z-[4000] border-t border-[var(--border-default)] pb-safe shadow-none">
      <div 
        className="h-[44px] flex items-stretch px-4 max-w-md mx-auto gap-0.5 relative"
      >

        {/* Left 1: Home */}
        <NavBtn
          icon={Home}
          onClick={() => onChangeView('dashboard')}
          active={currentView === 'dashboard'}
        />

        {/* Left 2: History */}
        <NavBtn
          icon={Clock}
          onClick={() => onChangeView('history')}
          active={currentView === 'history'}
        />

        {/* Center: Action */}
        <div className="flex items-center justify-center px-2 flex-shrink-0 relative z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              Haptics.light();
              onAddClick(e);
            }}
            className="flex items-center justify-center bg-[var(--accent-solid)] text-[var(--accent-text)] rounded-[6px] transition-colors hover:opacity-90"
            style={{ width: 32, height: 32 }}
          >
            <Plus size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Right 1: Debts */}
        <NavBtn
          icon={HandCoins}
          onClick={() => onChangeView('debts')}
          active={currentView === 'debts'}
        />

        {/* Right 2 (rightmost): Menu */}
        <NavBtn
          icon={AlignJustify}
          onClick={() => onChangeView('menu')}
          active={isMenuActive}
        />

      </div>
    </div>
  );
};
