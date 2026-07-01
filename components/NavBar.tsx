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
      className={`flex flex-col items-center justify-center flex-1 h-full transition-all duration-300 active:scale-[0.85] relative select-none z-10 ${
        active 
          ? 'text-primary drop-shadow-[0_0_8px_rgba(var(--color-primary),0.35)]' 
          : 'text-muted/50 hover:text-muted'
      }`}
    >
      <Icon 
        size={22} 
        strokeWidth={active ? 2.8 : 2.0} 
        fill="none"
        className={`transition-all duration-300 transform active:scale-95 ${active ? 'animate-active-spring' : ''}`} 
      />
    </button>
  );

  return (
    <div className="fixed bottom-0 left-0 w-full bg-card rounded-none z-[4000] border-t border-main/10 pb-safe shadow-none">
      <div 
        className="h-[48px] flex items-stretch px-4 max-w-md mx-auto gap-0.5 relative"
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

        {/* Center: FAB */}
        <div className="flex items-center justify-center px-2 flex-shrink-0 relative z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              Haptics.light();
              onAddClick(e);
            }}
            className="flex items-center justify-center bg-primary text-white rounded-full active:scale-[0.88] transition-all border border-white/20 hover:brightness-110"
            style={{ width: 40, height: 40 }}
          >
            <Plus size={20} strokeWidth={2.5} />
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
