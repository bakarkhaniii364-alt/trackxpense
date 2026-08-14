import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  User,
  Settings,
  TrendingUp,
  LayoutGrid,
  Activity,
  ArrowDownRight,
  HandCoins,
  Sliders,
  Calendar,
  Ghost,
  ChevronRight,
  ChevronDown,
  Search,
  PanelLeft,
  PanelLeftOpen,
  UserCircle,
  LogOut,
  Trash2,
  Fingerprint,
  Mail,
  X,
  AlertCircle
} from 'lucide-react';
import { AppData } from '../types';
import { PersonnelRegionalManager } from './management/PersonnelRegionalManager';
import { FinancialEnforcementManager } from './management/FinancialEnforcementManager';
import { DataManagement } from './management/DataManagement';
import { formatMoney } from '../utils/formatters';
import { supabase } from '../services/supabase';
import { Haptics } from '../services/haptics';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  onViewChange: (v: any) => void;
  isStatic?: boolean;
  currentView?: string;
  onLogout?: () => void;
  onOpenCommandPalette?: () => void;
}

const MenuHeader = ({
  title,
  isStatic,
  onBack,
}: {
  title: string;
  isStatic: boolean;
  onBack: () => void;
}) => (
  <div
    className={`pt-safe pt-6 pb-6 px-6 ${
      isStatic ? 'bg-transparent' : 'bg-surface'
    } border-b border-main/10 relative flex items-center gap-3`}
  >
    {!isStatic && (
      <button
        onClick={() => {
          Haptics.light();
          onBack();
        }}
        className="p-2 -ml-2 text-muted hover:text-main rounded-full transition-colors"
      >
        <ArrowLeft size={20} />
      </button>
    )}
    <h2 className="text-xl font-bold text-main">{title}</h2>
  </div>
);

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
  const [sidebarView, setSidebarView] = useState<'menu' | 'identity' | 'control' | 'data' | 'privacy'>('menu');
  const [confirmAction, setConfirmAction] = useState<'logout' | 'delete' | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const mainMenuContainerRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLButtonElement>(null);
  const analyticsRef = useRef<HTMLButtonElement>(null);
  const debtsRef = useRef<HTMLButtonElement>(null);
  const userButtonRef = useRef<HTMLDivElement>(null);

  const [mainIndicatorStyle, setMainIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 });
  const [dropdownPosition, setDropdownPosition] = useState<{ bottom: number; left: number }>({ bottom: 60, left: 8 });

  useEffect(() => {
    if (isOpen) {
      setSidebarView('menu');
    }
  }, [isOpen]);

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

  useEffect(() => {
    const updatePosition = () => {
      let activeRef: React.RefObject<HTMLButtonElement | null> | null = null;
      if (currentView === 'dashboard') activeRef = dashboardRef;
      else if (currentView === 'history') activeRef = historyRef;
      else if (currentView === 'analytics') activeRef = analyticsRef;
      else if (currentView === 'debts') activeRef = debtsRef;

      if (activeRef && activeRef.current && mainMenuContainerRef.current) {
        const containerRect = mainMenuContainerRef.current.getBoundingClientRect();
        const activeRect = activeRef.current.getBoundingClientRect();
        setMainIndicatorStyle({
          top: activeRect.top - containerRect.top,
          height: activeRect.height,
          opacity: 1,
        });
      } else {
        setMainIndicatorStyle(prev => ({ ...prev, opacity: 0 }));
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    const timer = setTimeout(updatePosition, 100);
    return () => {
      window.removeEventListener('resize', updatePosition);
      clearTimeout(timer);
    };
  }, [currentView]);

  const handleBack = () => {
    Haptics.light();
    setSidebarView('menu');
  };

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      await supabase.auth.signOut();
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
            <div className={`mb-3 ${action === 'delete' ? 'text-rose-500' : 'text-[#2563EB]'}`}>
                {action === 'delete' ? <Trash2 size={24} strokeWidth={1.5} /> : <LogOut size={24} strokeWidth={1.5} />}
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

  const getViewIndex = (v: typeof sidebarView) => {
    if (isStatic) return 0;
    switch (v) {
      case 'menu': return 0;
      case 'identity': return 1;
      case 'control': return 2;
      case 'data': return 3;
      case 'privacy': return 4;
      default: return 0;
    }
  };

  return (
    <>
      {!isStatic && (
        <div
          className={`fixed inset-0 bg-black/80 backdrop-blur-md z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
        />
      )}
      <div
        className={`${isStatic ? `relative ${isCollapsed ? 'w-[56px] bg-transparent border-r-0 shadow-none' : 'w-[240px] bg-[var(--bg-sidebar)] border-r border-[var(--border-default)]'} shrink-0 h-screen translate-x-0 transition-[width,background-color,border-color] duration-200` : `fixed inset-y-0 left-0 h-full ${isCollapsed ? 'w-[56px] bg-transparent border-r-0 shadow-none' : 'w-[240px] bg-[var(--bg-sidebar)] border-r border-[var(--border-default)] shadow-2xl'} shrink-0 z-[101] transform transition-[transform,width,background-color,border-color] duration-200 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`} flex flex-col overflow-hidden`}
      >
        <div className={`sidebar-slider-wrapper flex-1 ${isCollapsed ? 'bg-transparent' : 'bg-[var(--bg-sidebar)]'}`}>
          <div 
            className={`sidebar-view-container ${isCollapsed ? 'bg-transparent' : 'bg-[var(--bg-sidebar)]'}`}
            style={{ transform: `translateX(-${getViewIndex(sidebarView) * 20}%)` }}
          >
            {/* View 0: menu */}
            <div className={`sidebar-panel flex flex-col h-full ${isCollapsed ? 'bg-transparent' : 'bg-[var(--bg-sidebar)]'}`}>
              {/* Top Header: Branding + Sidebar Shrink Button */}
              <div className="h-[52px] px-2 flex items-center justify-between shrink-0">
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
                      src="icon.png" 
                      alt="Favicon" 
                      className="w-5 h-5 rounded-[4px] object-cover shrink-0 select-none pointer-events-none" 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="w-5 h-5 rounded-[4px] bg-white/10 hidden items-center justify-center text-[var(--text-primary)] font-bold text-[10px] shrink-0 select-none">
                      T
                    </div>
                  </div>
                  <div className={`flex-1 flex items-center pl-2.5 whitespace-nowrap transition-all duration-200 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                    <span className="text-[13px] font-medium text-[var(--text-primary)] tracking-tight">
                      TrackXpense
                    </span>
                  </div>
                </div>

                {!isCollapsed && (
                  <button
                    onClick={() => setIsCollapsed(true)}
                    title="Collapse sidebar"
                    className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors shrink-0 cursor-pointer"
                  >
                    <PanelLeft size={16} className="stroke-[1.5px]" />
                  </button>
                )}
              </div>

              {/* Quick Search Bar */}
              <div className="px-2 pt-1 pb-1">
                <button
                  onClick={() => {
                    if (onOpenCommandPalette) onOpenCommandPalette();
                  }}
                  title="Quick search (Ctrl+K)"
                  className={`w-full h-[32px] flex items-center gap-2.5 rounded-[6px] text-[12px] transition-all overflow-hidden ${
                    isCollapsed
                      ? 'px-1 bg-transparent border-0 hover:bg-white/5 text-[var(--text-muted)] hover:text-white'
                      : 'px-2 bg-[var(--bg-subtle)]/60 border border-[var(--border-default)] hover:border-[var(--border-active)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="w-7 h-7 flex items-center justify-center shrink-0">
                    <Search size={14} className="stroke-[1.5px]" />
                  </div>
                  <div className={`flex-1 flex items-center justify-between whitespace-nowrap transition-all duration-200 pr-1 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                    <span>Quick search...</span>
                    <kbd className="text-[9px] font-mono px-1 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-muted)]">Ctrl K</kbd>
                  </div>
                </button>
              </div>

              {/* Navigation Items (No section headings) */}
              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 no-scrollbar">
                <div 
                  ref={mainMenuContainerRef}
                  className="space-y-1 relative"
                >
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, btnRef: dashboardRef },
                    { id: 'history', label: 'Transactions', icon: Activity, btnRef: historyRef },
                    { id: 'analytics', label: 'Analytics', icon: TrendingUp, btnRef: analyticsRef },
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
                        className={`w-full h-[36px] px-1 flex items-center rounded-[6px] transition-colors text-[13px] overflow-hidden ${
                          isSelected
                            ? isCollapsed ? 'bg-transparent text-white font-medium' : 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] font-medium'
                            : 'text-[var(--text-secondary)] font-normal hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div className="w-7 h-7 flex items-center justify-center shrink-0">
                          <item.icon 
                            size={16} 
                            className={`transition-all ${
                              isSelected 
                                ? 'text-white stroke-[1.5px]' 
                                : 'text-[var(--text-secondary)] stroke-[1.5px]'
                            }`} 
                          />
                        </div>
                        <div className={`flex-1 flex items-center justify-between pl-1 whitespace-nowrap transition-all duration-200 pr-1 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                          <span>{item.label}</span>
                          <ChevronRight size={14} className="opacity-40" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bottom User Section */}
              <div className="p-2 mt-auto shrink-0 relative">
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
                    <ChevronRight size={14} className="text-[var(--text-muted)] opacity-60 shrink-0 stroke-[1.5px]" />
                  </div>
                </div>

                {/* Cloudflare-style User Profile Dropdown (Portaled to prevent clipping) */}
                {isUserMenuOpen && createPortal(
                  <div className="fixed inset-0 z-[9999] pointer-events-auto">
                    {/* Transparent backdrop overlay */}
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
                            onViewChange('identity');
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
                            onViewChange('identity');
                            if (!isStatic) onClose();
                          }}
                          className="w-full px-3 py-1.5 flex items-center justify-between rounded-[6px] text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors text-left font-normal cursor-pointer"
                        >
                          <span>Appearance</span>
                          <ChevronRight size={14} className="text-[var(--text-muted)] opacity-60 stroke-[1.5px]" />
                        </button>

                        <button 
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onViewChange('identity');
                            if (!isStatic) onClose();
                          }}
                          className="w-full px-3 py-1.5 flex items-center justify-between rounded-[6px] text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors text-left font-normal cursor-pointer"
                        >
                          <span>Language</span>
                          <ChevronRight size={14} className="text-[var(--text-muted)] opacity-60 stroke-[1.5px]" />
                        </button>

                        <button 
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            onViewChange('identity');
                            if (!isStatic) onClose();
                          }}
                          className="w-full px-3 py-1.5 flex items-center justify-between rounded-[6px] text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors text-left font-normal cursor-pointer"
                        >
                          <span>Timezone</span>
                          <ChevronRight size={14} className="text-[var(--text-muted)] opacity-60 stroke-[1.5px]" />
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
            </div>

            {/* View 1: identity */}
            <div className="sidebar-panel">
              <MenuHeader title="Profile & Settings" isStatic={isStatic} onBack={handleBack} />
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 no-scrollbar">
                  <PersonnelRegionalManager data={data} updateData={updateData} isCompact onLogout={handleLogout} />
                  
                  <div className="space-y-2">
                      <h3 className="px-4 text-[9px] uppercase font-black text-muted/40 tracking-[0.2em] mb-3">Support & Legal</h3>
                      <button onClick={() => { Haptics.light(); setSidebarView('privacy'); }} className="w-full px-4 py-3 flex items-center justify-between rounded-sm hover:bg-main/5 transition-all group">
                          <div className="flex items-center gap-4">
                              <Fingerprint size={16} className="text-muted group-hover:text-primary transition-colors" />
                              <span className="text-xs font-bold text-main">Privacy Policy</span>
                          </div>
                          <ChevronRight size={14} className="text-muted/20" />
                      </button>
                      <a href="mailto:dev@trackxpense.app" className="w-full px-4 py-3 flex items-center justify-between rounded-sm hover:bg-main/5 transition-all group">
                          <div className="flex items-center gap-4">
                               <Mail size={16} className="text-muted group-hover:text-primary transition-colors" />
                              <span className="text-xs font-bold text-main">Contact Developer</span>
                          </div>
                          <ChevronRight size={14} className="text-muted/20" />
                      </a>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-main/10">
                      <button onClick={() => { Haptics.light(); setSidebarView('data'); }} className="w-full px-4 py-3 flex items-center justify-between rounded-sm hover:bg-main/5 transition-all group">
                          <div className="flex items-center gap-4 text-muted hover:text-main">
                              <Settings size={16} />
                              <span className="text-xs font-bold">Manage Data</span>
                          </div>
                          <ChevronRight size={14} className="opacity-40" />
                      </button>
                      <button onClick={() => { Haptics.warning(); setConfirmAction('logout'); }} className="w-full px-4 py-3 flex items-center justify-between rounded-sm hover:bg-primary/10 transition-all group">
                          <div className="flex items-center gap-4 text-primary">
                              <LogOut size={16} />
                              <span className="text-xs font-bold">Log Out</span>
                          </div>
                          <p className="text-[8px] font-black text-primary/40 uppercase tracking-widest">Keep data</p>
                      </button>
                      <button onClick={() => { Haptics.error(); setConfirmAction('delete'); }} className="w-full px-4 py-3 flex items-center justify-between rounded-sm hover:bg-red-500/10 transition-all group">
                          <div className="flex items-center gap-4 text-red-500">
                              <Trash2 size={16} />
                              <span className="text-xs font-bold">Delete Account</span>
                          </div>
                          <p className="text-[8px] font-black text-red-500/40 uppercase tracking-widest">Permanent</p>
                      </button>
                  </div>
              </div>
            </div>

            {/* View 2: control */}
            <div className="sidebar-panel">
              <MenuHeader title="Budgets & Categories" isStatic={isStatic} onBack={handleBack} />
              <div className="flex-1 overflow-y-auto px-4 py-4">
                  <FinancialEnforcementManager data={data} updateData={updateData} formatMoney={formatMoney} isCompact />
              </div>
            </div>

            {/* View 3: data */}
            <div className="sidebar-panel">
              <MenuHeader title="Data Management" isStatic={isStatic} onBack={() => { Haptics.light(); setSidebarView('identity'); }} />
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <DataManagement data={data} updateData={updateData} isCompact />
              </div>
            </div>

            {/* View 4: privacy */}
            <div className="sidebar-panel">
              <MenuHeader title="Privacy Policy" isStatic={isStatic} onBack={handleBack} />
              <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6 no-scrollbar">
                  <div className="space-y-4">
                      <p className="text-xs text-white/60 leading-relaxed font-medium italic">"We like your money, but we don't like your business."</p>
                      <div className="space-y-4">
                          <div className="p-4 rounded-md bg-main/5 border border-main/10">
                              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Rule #1: You are the Ghost</p>
                              <p className="text-xs text-muted leading-relaxed">We don't know who you are. We don't want to. Your transactions are end-to-end encrypted bits. If you buy 14 ducks at midnight, that's between you and the ducks.</p>
                          </div>
                          <div className="p-4 rounded-md bg-main/5 border border-main/10">
                              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Rule #2: Zero Tracking</p>
                              <p className="text-xs text-muted leading-relaxed">No pixels. No cookies (except the ones you eat while looking at your balance). No "personalized ads" trying to sell you a duck-feeder.</p>
                          </div>
                          <div className="p-4 rounded-md bg-main/5 border border-main/10">
                              <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Rule #3: Your Data is Yours</p>
                              <p className="text-xs text-muted leading-relaxed">Want to delete everything? We do it for real. Your data leaves our cloud faster than your money leaves your wallet on payday.</p>
                          </div>
                      </div>
                  </div>
                  <p className="text-[10px] text-muted/30 text-center uppercase font-black tracking-widest pt-4">TrackXpense v4.0 • Zero Bullshit Edition</p>
              </div>
            </div>
          </div>
        </div>
        {confirmAction && <ConfirmationOverlay action={confirmAction} />}
      </div>
    </>
  );
};
