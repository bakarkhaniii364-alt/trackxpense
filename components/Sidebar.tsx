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
import { AiStarIcon } from './shared/AiStarIcon';
import { SpotifyIcon } from './shared/SpotifyIcon';
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
          className={`fixed inset-0 bg-black/60 z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
        />
      )}
      <aside
        style={{
          borderRightColor: isCollapsed ? 'transparent' : 'var(--border-default)',
        }}
        className={`${
          isStatic
            ? `relative ${isCollapsed ? 'w-[60px]' : 'w-[260px]'} bg-[var(--bg-sidebar)] border-r shrink-0 h-screen translate-x-0 transition-[width,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`
            : `fixed inset-y-0 left-0 h-full ${isCollapsed ? 'w-[60px]' : 'w-[280px]'} bg-[var(--bg-sidebar)] border-r shadow-2xl shrink-0 z-[101] transform transition-[transform,width,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
        } flex flex-col overflow-hidden select-none`}
      >
        {/* Top Header: Branding + Sidebar Collapse/Expand Button */}
        <div className="h-[52px] px-3 flex items-center shrink-0 overflow-hidden">
          {isCollapsed ? (
            <button
              onClick={() => {
                Haptics.light();
                setIsCollapsed(false);
              }}
              title="Expand sidebar"
              className="w-9 h-9 rounded-[6px] flex items-center justify-center hover:bg-white/5 cursor-pointer relative group transition-colors shrink-0"
            >
              <img 
                src="/icon.png" 
                alt="TrackXpense" 
                className="w-6 h-6 rounded-full object-contain pointer-events-none transition-opacity duration-200 group-hover:opacity-0 absolute" 
              />
              <SidebarIcon 
                size={16} 
                weight="regular" 
                className="text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
              />
            </button>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center min-w-0 overflow-hidden">
                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                  <img 
                    src="/icon.png" 
                    alt="TrackXpense" 
                    className="w-6 h-6 rounded-full object-contain shrink-0 select-none pointer-events-none" 
                  />
                </div>
                <span className="text-[13px] font-medium text-[var(--text-primary)] tracking-tight whitespace-nowrap pl-2">
                  TrackXpense
                </span>
              </div>

              {isStatic ? (
                <button
                  onClick={() => {
                    Haptics.light();
                    setIsCollapsed(true);
                  }}
                  title="Collapse sidebar"
                  className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all shrink-0 cursor-pointer"
                >
                  <SidebarIcon size={16} weight="regular" />
                </button>
              ) : (
                <button
                  onClick={onClose}
                  title="Close drawer"
                  className="w-8 h-8 rounded-[6px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-all shrink-0 cursor-pointer"
                >
                  <div className="relative w-4 h-4 flex items-center justify-center pointer-events-none">
                    <span
                      className={`absolute h-[1.5px] w-3.5 bg-current rounded-full transition-all duration-300 ease-in-out ${
                        isOpen ? 'rotate-45 translate-y-0' : '-translate-y-1.5'
                      }`}
                    />
                    <span
                      className={`absolute h-[1.5px] w-3.5 bg-current rounded-full transition-all duration-200 ease-in-out ${
                        isOpen ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
                      }`}
                    />
                    <span
                      className={`absolute h-[1.5px] w-3.5 bg-current rounded-full transition-all duration-300 ease-in-out ${
                        isOpen ? '-rotate-45 translate-y-0' : 'translate-y-1.5'
                      }`}
                    />
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Quick Search Bar */}
        <div className="px-3 pt-1 pb-1 overflow-hidden">
          <button
            onClick={() => {
              if (onOpenCommandPalette) onOpenCommandPalette();
              if (!isStatic) onClose();
            }}
            title="Quick search (Ctrl+K)"
            className="w-full h-[32px] flex items-center rounded-[6px] text-[12px] bg-[var(--bg-subtle)]/60 border border-[var(--border-default)] hover:border-[var(--border-active)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer overflow-hidden"
          >
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <MagnifyingGlass size={14} weight="regular" />
            </div>
            <div className={`flex-1 flex items-center justify-between whitespace-nowrap pr-2 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              <span>Quick search...</span>
              <kbd className="text-[9px] font-mono px-1 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-muted)]">Ctrl K</kbd>
            </div>
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1 no-scrollbar overflow-x-hidden">
          <div ref={mainMenuContainerRef} className="space-y-1 relative w-full">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: SquaresFour, btnRef: dashboardRef },
              ...(isStatic ? [{ id: 'rabbai', label: 'RabbAi Assistant', icon: AiStarIcon }] : []),
              { id: 'history', label: 'Transactions', icon: Pulse, btnRef: historyRef },
              { id: 'analytics', label: 'Analytics', icon: TrendUp, btnRef: analyticsRef },
              { id: 'debts', label: 'Debts & Loans', icon: HandCoins, btnRef: debtsRef },
              { id: 'control', label: 'Budgets & Categories', icon: Sliders },
              { id: 'provisions', label: 'Upcoming Expenses', icon: Calendar },
              { id: 'subscriptions', label: 'Subscriptions', icon: SpotifyIcon },
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
                  className={`w-full h-[36px] flex items-center rounded-[6px] transition-colors text-[13px] cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] font-medium'
                      : 'hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] font-normal'
                  }`}
                >
                  <div className="w-9 h-9 flex items-center justify-center shrink-0">
                    {item.icon && (
                      <item.icon
                        size={16}
                        weight="regular"
                        className={isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}
                      />
                    )}
                  </div>
                  <span
                    className={`truncate whitespace-nowrap pl-2 transition-opacity duration-200 ${
                      isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom User Section */}
        <div className="p-3 mt-auto shrink-0 relative overflow-hidden">
          {/* User Trigger Button */}
          <div 
            ref={userButtonRef}
            onClick={() => { 
              Haptics.light(); 
              setIsUserMenuOpen(!isUserMenuOpen); 
            }}
            title={data.profile.name}
            className="w-full h-[36px] rounded-[6px] hover:bg-white/5 cursor-pointer transition-colors group flex items-center overflow-hidden"
          >
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <div className="w-7 h-7 rounded-[6px] bg-white/10 text-[var(--text-primary)] font-semibold flex items-center justify-center text-xs shrink-0 transition-colors">
                {data.profile.name ? data.profile.name.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
            <div className={`flex-1 flex items-center justify-between min-w-0 whitespace-nowrap pl-2 pr-1 transition-opacity duration-200 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
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
