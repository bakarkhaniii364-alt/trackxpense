import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  User,
  Gear,
  TrendUp,
  SquaresFour,
  Pulse,
  ArrowDownRight,
  HandCoins,
  Sliders,
  Calendar,
  Ghost,
  CaretRight,
  CaretDown,
  MagnifyingGlass,
  Sidebar as SidebarIcon,
  UserCircle,
  SignOut,
  Trash,
  X,
  Sparkle
} from '@phosphor-icons/react';
import { AppData } from '../types';
import { Haptics } from '../services/haptics';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  onViewChange: (v: any, subTab?: string) => void;
  isStatic?: boolean;
  currentView?: string;
  onLogout?: () => void;
  onOpenCommandPalette?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  data,
  updateData,
  onViewChange,
  isStatic = false,
  currentView = 'dashboard',
  onLogout,
  onOpenCommandPalette
}) => {
  const [confirmAction, setConfirmAction] = useState<'logout' | 'delete' | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const mainMenuContainerRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLButtonElement>(null);
  const analyticsRef = useRef<HTMLButtonElement>(null);
  const debtsRef = useRef<HTMLButtonElement>(null);
  const userButtonRef = useRef<HTMLDivElement>(null);

  const [dropdownPosition, setDropdownPosition] = useState<{ bottom: number; left: number }>({ bottom: 60, left: 8 });

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const updateCoords = () => {
      if (userButtonRef.current) {
        const rect = userButtonRef.current.getBoundingClientRect();
        const bottomDistance = Math.max(12, window.innerHeight - rect.top + 8);
        const leftPos = Math.max(8, Math.min(rect.left, window.innerWidth - 230));
        setDropdownPosition({
          bottom: bottomDistance,
          left: leftPos,
        });
      }
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      window.location.reload();
    }
  };

  const handleDeleteAccount = async () => {
    alert("Your account is marked for permanent deletion. You will be logged out.");
    await handleLogout();
  };

  const ConfirmationOverlay = ({ action }: { action: 'logout' | 'delete' }) => createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-xs" onClick={() => setConfirmAction(null)} />
      <div className="relative bg-[var(--bg-surface)] p-6 rounded-[12px] w-full max-w-[320px] border border-[var(--border-default)] shadow-2xl z-10 text-[var(--text-primary)]">
        <div className="flex flex-col items-center text-center">
            <div className={`mb-3 ${action === 'delete' ? 'text-rose-500' : 'text-[var(--accent)]'}`}>
                {action === 'delete' ? <Trash size={24} weight="regular" /> : <SignOut size={24} weight="regular" />}
            </div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{action === 'delete' ? 'Delete Account?' : 'Log Out?'}</h3>
            <p className="text-[12px] text-[var(--text-secondary)] mb-5 leading-relaxed">
                {action === 'delete' ? 'Your account and all associated data will be permanently deleted.' : 'Your financial data will remain safely stored in the cloud.'}
            </p>
            <div className="flex gap-2.5 w-full">
                <button onClick={() => setConfirmAction(null)} className="btn btn--outline flex-1 h-[36px] text-[12px]">Cancel</button>
                <button onClick={action === 'delete' ? handleDeleteAccount : handleLogout} className={`btn flex-1 h-[36px] text-[12px] ${action === 'delete' ? 'btn--danger' : 'btn--primary'}`}>Confirm</button>
            </div>
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {!isStatic && (
        <div
          className={`fixed inset-0 bg-black/80 backdrop-blur-md z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
        />
      )}
      <aside
        className={`${
          isStatic
            ? `relative ${isCollapsed ? 'w-[56px] bg-transparent border-r-0 shadow-none' : 'w-[280px] bg-[var(--bg-sidebar)] border-r border-[var(--border-default)]'} shrink-0 h-screen translate-x-0 transition-[width,background-color,border-color] duration-200`
            : `fixed inset-y-0 left-0 h-full ${isCollapsed ? 'w-[56px] bg-transparent border-r-0 shadow-none' : 'w-[280px] bg-[var(--bg-sidebar)] border-r border-[var(--border-default)] shadow-2xl'} shrink-0 z-[101] transform transition-[transform,width,background-color,border-color] duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
        } flex flex-col overflow-hidden select-none`}
      >
        {/* Top Header: Branding + Sidebar Shrink Button */}
        <div className="h-[52px] px-3 flex items-center justify-between shrink-0">
          <div
            onClick={() => {
              if (isCollapsed) {
                Haptics.light();
                setIsCollapsed(false);
              }
            }}
            title={isCollapsed ? "Expand sidebar" : undefined}
            className={`h-8 px-1 flex items-center text-left select-none overflow-hidden ${isCollapsed ? 'cursor-pointer' : ''}`}
          >
            <div className="w-7 h-7 flex items-center justify-center shrink-0">
              <img 
                src="/icon.png" 
                alt="TrackXpense" 
                className="w-6 h-6 rounded-full object-contain shrink-0 select-none pointer-events-none" 
              />
            </div>
            <div className={`flex-1 flex items-center pl-2.5 whitespace-nowrap transition-all duration-200 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
              <span className="text-[13px] font-medium text-[var(--text-primary)] tracking-tight">
                TrackXpense
              </span>
            </div>
          </div>

          {isStatic ? (
            !isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                title="Collapse sidebar"
                className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
              >
                <SidebarIcon size={16} weight="regular" />
              </button>
            )
          ) : (
            <button
              onClick={onClose}
              title="Close drawer"
              className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Quick Search Bar */}
        <div className="px-3 pt-1 pb-1">
          <button
            onClick={() => {
              if (onOpenCommandPalette) onOpenCommandPalette();
              if (!isStatic) onClose();
            }}
            title="Quick search (Ctrl+K)"
            className={`w-full h-[32px] flex items-center gap-2.5 rounded-[6px] text-[12px] transition-all overflow-hidden ${
              isCollapsed
                ? 'px-1 bg-transparent border-0 hover:bg-white/5 text-[var(--text-muted)] hover:text-white'
                : 'px-2 bg-[var(--bg-subtle)]/60 border border-[var(--border-default)] hover:border-[var(--border-active)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <div className="w-7 h-7 flex items-center justify-center shrink-0">
              <MagnifyingGlass size={14} weight="regular" />
            </div>
            <div className={`flex-1 flex items-center justify-between whitespace-nowrap transition-all duration-200 pr-1 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <span>Quick search...</span>
              <kbd className="text-[9px] font-mono px-1 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-muted)]">Ctrl K</kbd>
            </div>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 no-scrollbar">
          <div ref={mainMenuContainerRef} className="space-y-1 relative">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: SquaresFour, btnRef: dashboardRef },
              ...(isStatic ? [{ id: 'rabbai', label: 'RabbAi Assistant', icon: Sparkle }] : []),
              { id: 'history', label: 'Transactions', icon: Pulse, btnRef: historyRef },
              { id: 'analytics', label: 'Analytics', icon: TrendUp, btnRef: analyticsRef },
              { id: 'debts', label: 'Debts & Loans', icon: HandCoins, btnRef: debtsRef },
              { id: 'control', label: 'Budgets & Categories', icon: Sliders },
              { id: 'provisions', label: 'Upcoming Expenses', icon: Calendar },
              { id: 'subscriptions', label: 'Subscriptions', icon: Ghost },
              { id: 'identity', label: 'Profile & Settings', icon: UserCircle },
            ].map((item) => {
              const isSelected = currentView === item.id;
              return (
                <button
                  key={item.id}
                  ref={item.btnRef}
                  title={isCollapsed ? item.label : undefined}
                  onClick={() => {
                    Haptics.light();
                    onViewChange(item.id);
                    if (!isStatic) onClose();
                  }}
                  className={`w-full h-[36px] px-1 flex items-center rounded-[6px] transition-colors text-[13px] overflow-hidden cursor-pointer ${
                    isSelected
                      ? isCollapsed ? 'bg-transparent text-white font-medium' : 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] font-medium'
                      : 'hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] font-normal'
                  }`}
                >
                  <div className="w-7 h-7 flex items-center justify-center shrink-0">
                    {item.icon && <item.icon size={16} weight="regular" className={isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'} />}
                  </div>
                  <div className={`flex-1 flex items-center pl-2 whitespace-nowrap transition-all duration-200 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom User Section */}
        <div className="p-3 mt-auto shrink-0 relative">
          {/* User Trigger Button */}
          <div 
            ref={userButtonRef}
            onClick={() => { 
              Haptics.light(); 
              setIsUserMenuOpen(!isUserMenuOpen); 
            }}
            title={data.profile.name}
            className="p-1 rounded-[8px] hover:bg-white/5 cursor-pointer transition-colors group flex items-center gap-2 overflow-hidden"
          >
            <div className={`w-7 h-7 rounded-[6px] ${isCollapsed ? 'bg-transparent text-white border-0 font-bold' : 'bg-white/10 text-[var(--text-primary)] font-semibold'} flex items-center justify-center text-xs shrink-0 transition-colors`}>
              {data.profile.name ? data.profile.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className={`flex-1 flex items-center justify-between min-w-0 whitespace-nowrap transition-all duration-200 pr-1 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
              <div className="flex flex-col min-w-0">
                <h2 className="text-[12px] font-medium text-[var(--text-primary)] leading-tight truncate">{data.profile.name}</h2>
                <span className="text-[10px] text-[var(--text-muted)] font-normal truncate">Standard Account</span>
              </div>
              <CaretRight size={13} weight="regular" className="text-[var(--text-muted)] opacity-60 shrink-0" />
            </div>
          </div>

          {/* User Profile Dropdown Popover */}
          {isUserMenuOpen && createPortal(
            <div className="fixed inset-0 z-[9999] pointer-events-auto">
              {/* Transparent backdrop */}
              <div 
                className="fixed inset-0 bg-transparent" 
                onClick={() => setIsUserMenuOpen(false)} 
              />

              {/* Anchored Popover Menu */}
              <div 
                style={{ 
                  position: 'fixed',
                  bottom: `${dropdownPosition.bottom}px`, 
                  left: `${dropdownPosition.left}px` 
                }}
                className="w-[220px] bg-[var(--bg-surface)] rounded-[10px] border border-[var(--border-default)] shadow-[0_16px_40px_rgba(0,0,0,0.65),0_2px_8px_rgba(0,0,0,0.4)] p-1.5 text-[var(--text-primary)] animate-in fade-in zoom-in-95 duration-150 select-none z-[10000]"
              >
                {/* Pointer Nudge */}
                <div 
                  className="absolute -bottom-[6px] w-2.5 h-2.5 bg-[var(--bg-surface)] border-b border-r border-[var(--border-default)] rotate-45 z-20" 
                  style={{ left: '18px' }}
                />

                {/* Email Header */}
                <div className="px-3 py-2 text-[12px] text-[var(--text-muted)] border-b border-[var(--border-default)]/60 truncate font-normal relative z-10">
                  {data.profile.email || data.profile.name || 'user@trackxpense.app'}
                </div>

                {/* Options List */}
                <div className="py-1 space-y-0.5 relative z-10">
                  <button 
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onViewChange('identity', 'general');
                      if (!isStatic) onClose();
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between rounded-[6px] text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors text-left font-normal cursor-pointer"
                  >
                    <span>Profile</span>
                  </button>

                  <button 
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onViewChange('control');
                      if (!isStatic) onClose();
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between rounded-[6px] text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors text-left font-normal cursor-pointer"
                  >
                    <span>Billing</span>
                  </button>

                  <button 
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onViewChange('identity', 'data_security');
                      if (!isStatic) onClose();
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between rounded-[6px] text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors text-left font-normal cursor-pointer"
                  >
                    <span>Data & Security</span>
                    <CaretRight size={13} weight="regular" className="text-[var(--text-muted)] opacity-60" />
                  </button>
                </div>

                {/* Logout Option */}
                <div className="border-t border-[var(--border-default)]/60 pt-1 mt-0.5 relative z-10">
                  <button 
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      if (onLogout) onLogout();
                      else handleLogout();
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between rounded-[6px] text-[13px] text-[#ef4444] hover:bg-red-500/10 transition-colors text-left font-medium cursor-pointer"
                  >
                    <span>Log out</span>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>
        {confirmAction && <ConfirmationOverlay action={confirmAction} />}
      </aside>
    </>
  );
};
