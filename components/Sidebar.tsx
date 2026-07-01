import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  User,
  Settings,
  TrendingUp,
  LayoutGrid,
  Activity,
  ArrowDownRight,
  Calendar,
  Ghost,
  ChevronRight,
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
  onLogout
}) => {
  const [sidebarView, setSidebarView] = useState<'menu' | 'identity' | 'control' | 'data' | 'privacy'>('menu');
  const [confirmAction, setConfirmAction] = useState<'logout' | 'delete' | null>(null);

  const mainMenuContainerRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLButtonElement>(null);
  const historyRef = useRef<HTMLButtonElement>(null);
  const analyticsRef = useRef<HTMLButtonElement>(null);
  const debtsRef = useRef<HTMLButtonElement>(null);

  const [mainIndicatorStyle, setMainIndicatorStyle] = useState({ top: 0, height: 0, opacity: 0 });

  useEffect(() => {
    if (isOpen) {
      setSidebarView('menu');
    }
  }, [isOpen]);

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

  const ConfirmationOverlay = ({ action }: { action: 'logout' | 'delete' }) => (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setConfirmAction(null)} />
      <div className="relative liquid-glass p-6 rounded-sm w-full max-w-[280px] border border-main/10 shadow-2xl">
        <div className="flex flex-col items-center text-center">
            <div className={`w-12 h-12 rounded-md flex items-center justify-center mb-4 ${action === 'delete' ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
                {action === 'delete' ? <Trash2 size={24} /> : <LogOut size={24} />}
            </div>
            <h3 className="text-lg font-bold text-main mb-2">{action === 'delete' ? 'Delete Account?' : 'Log Out?'}</h3>
            <p className="text-xs text-muted font-medium mb-6">
                {action === 'delete' ? 'Your account and all associated data will be permanently deleted.' : 'Your financial data will remain safely stored in the cloud.'}
            </p>
            <div className="flex gap-3 w-full">
                <button onClick={() => setConfirmAction(null)} className="flex-1 py-3 rounded-sm bg-main/5 text-main/60 text-[10px] font-black uppercase tracking-widest hover:bg-main/10 transition-all">Cancel</button>
                <button onClick={action === 'delete' ? handleDeleteAccount : handleLogout} className={`flex-1 py-3 rounded-sm text-white text-[10px] font-black uppercase tracking-widest transition-all ${action === 'delete' ? 'bg-red-600 shadow-lg shadow-red-600/20' : 'bg-primary shadow-lg shadow-primary/20'}`}>Confirm</button>
            </div>
        </div>
      </div>
    </div>
  );

  const getViewIndex = (v: typeof sidebarView) => {
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
        className={`${isStatic ? 'relative w-80 h-screen translate-x-0 liquid-glass border-r border-main/10 rounded-none' : `fixed inset-y-0 left-0 h-full w-[85%] max-w-xs z-[101] transform transition-transform duration-300 shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'} rounded-r-none`} flex flex-col bg-dark overflow-hidden`}
      >
        <div className="sidebar-slider-wrapper flex-1">
          <div 
            className="sidebar-view-container"
            style={{ transform: `translateX(-${getViewIndex(sidebarView) * 20}%)` }}
          >
            {/* View 0: menu */}
            <div className="sidebar-panel">
              <div className={`pt-8 pb-8 px-6 ${isStatic ? 'bg-main/5' : 'bg-surface'} border-b border-main/10 relative`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-sidebar bg-gradient-to-tr from-primary to-purple-600 p-[1px]">
                    <div className={`w-full h-full rounded-sidebar ${isStatic ? 'bg-black/40' : 'bg-dark'} flex items-center justify-center text-main overflow-hidden shadow-inner`}>
                      <span className="text-lg font-bold">{data.profile.name.charAt(0).toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-sm font-bold text-main leading-tight">{data.profile.name}</h2>
                    <span className="text-[9px] font-black uppercase tracking-widest mt-0.5 text-muted/40">
                      Standard Account
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 no-scrollbar">
                {isStatic && (
                  <div 
                    ref={mainMenuContainerRef}
                    className="space-y-1.5 pb-6 mb-6 border-b border-main/10 relative"
                  >
                    <h3 className="px-4 text-[9px] uppercase font-black text-muted/40 tracking-[0.2em] mb-4">Dashboard Menu</h3>
                    
                    {/* Sliding active item backdrop for main menu items */}
                    <div 
                      className={`absolute left-0 right-0 rounded-sidebar border transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none z-0 ${
                        currentView === 'dashboard' ? 'bg-primary/10 border-primary/20 shadow-lg shadow-primary/5' :
                        currentView === 'history' ? 'bg-purple-500/10 border-purple-500/20 shadow-lg shadow-purple-500/5' :
                        currentView === 'analytics' ? 'bg-blue-500/10 border-blue-500/20 shadow-lg shadow-blue-500/5' :
                        currentView === 'debts' ? 'bg-amber-500/10 border-amber-500/20 shadow-lg shadow-amber-500/5' :
                        'opacity-0'
                      }`}
                      style={{
                        top: mainIndicatorStyle.top,
                        height: mainIndicatorStyle.height,
                        opacity: mainIndicatorStyle.opacity,
                      }}
                    />

                    {[
                      { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, color: 'primary', btnRef: dashboardRef },
                      { id: 'history', label: 'Transactions', icon: Activity, color: 'purple-500', btnRef: historyRef },
                      { id: 'analytics', label: 'Analytics', icon: TrendingUp, color: 'blue-500', btnRef: analyticsRef },
                      { id: 'debts', label: 'Debts & Loans', icon: ArrowDownRight, color: 'amber-500', btnRef: debtsRef },
                    ].map((item) => {
                      const isSelected = currentView === item.id;
                      let styleClasses = 'hover:bg-surface/50 border border-transparent text-main';
                      let iconClasses = 'text-muted group-hover:text-main';
                      let textClasses = 'text-main';
                      let chevronClasses = 'text-muted/20';

                      if (isSelected) {
                        styleClasses = 'border border-transparent';
                        if (item.color === 'primary') {
                          iconClasses = 'text-primary';
                          textClasses = 'text-primary';
                          chevronClasses = 'text-primary/40';
                        } else if (item.color === 'purple-500') {
                          iconClasses = 'text-purple-500';
                          textClasses = 'text-purple-500';
                          chevronClasses = 'text-purple-500/40';
                        } else if (item.color === 'blue-500') {
                          iconClasses = 'text-blue-500';
                          textClasses = 'text-blue-500';
                          chevronClasses = 'text-blue-500/40';
                        } else if (item.color === 'amber-500') {
                          iconClasses = 'text-amber-500';
                          textClasses = 'text-amber-500';
                          chevronClasses = 'text-amber-500/40';
                        }
                      }

                      return (
                        <button
                          key={item.id}
                          ref={item.btnRef}
                          onClick={() => {
                            Haptics.light();
                            onViewChange(item.id);
                          }}
                          className={`w-full px-4 py-3 flex items-center justify-between rounded-sidebar transition-all group active:scale-[0.98] z-10 relative bg-transparent ${styleClasses}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`${iconClasses} transition-colors`}>
                              <item.icon size={18} />
                            </div>
                            <span className={`text-xs font-bold ${textClasses}`}>{item.label}</span>
                          </div>
                          <ChevronRight size={14} className={chevronClasses} />
                        </button>
                      );
                    })}
                  </div>
                )}

                <h3 className="px-4 text-[9px] uppercase font-black text-muted/40 tracking-[0.2em] mb-4">Tools</h3>
                
                <button
                  onClick={() => { Haptics.light(); onViewChange('control'); if (!isStatic) onClose(); }}
                  className={`w-full px-4 py-3 flex items-center justify-between rounded-sidebar transition-all group active:scale-[0.98] ${currentView === 'control' ? 'bg-emerald-400/10 border border-emerald-400/20' : 'hover:bg-surface/50 border border-transparent'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`${currentView === 'control' ? 'text-emerald-400' : 'text-muted group-hover:text-emerald-400'} transition-colors`}><TrendingUp size={18} /></div>
                    <span className={`text-xs font-bold ${currentView === 'control' ? 'text-emerald-400' : 'text-main'}`}>Budgets & Categories</span>
                  </div>
                  <ChevronRight size={14} className={currentView === 'control' ? 'text-emerald-400/40' : 'text-muted/20'} />
                </button>

                <button
                  onClick={() => { Haptics.light(); onViewChange('provisions'); if (!isStatic) onClose(); }}
                  className={`w-full px-4 py-3 flex items-center justify-between rounded-sidebar transition-all group active:scale-[0.98] ${currentView === 'provisions' ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface/50 border border-transparent'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`${currentView === 'provisions' ? 'text-primary' : 'text-muted group-hover:text-primary'} transition-colors`}><Calendar size={18} /></div>
                    <span className={`text-xs font-bold ${currentView === 'provisions' ? 'text-primary' : 'text-main'}`}>Upcoming Expenses</span>
                  </div>
                  <ChevronRight size={14} className={currentView === 'provisions' ? 'text-primary/40' : 'text-muted/20'} />
                </button>

                <button
                  onClick={() => { Haptics.light(); onViewChange('subscriptions'); if (!isStatic) onClose(); }}
                  className={`w-full px-4 py-3 flex items-center justify-between rounded-sidebar transition-all group active:scale-[0.98] ${currentView === 'subscriptions' ? 'bg-primary/10 border border-primary/20' : 'hover:bg-surface/50 border border-transparent'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`${currentView === 'subscriptions' ? 'text-primary' : 'text-muted group-hover:text-primary'} transition-colors`}><Ghost size={18} /></div>
                    <span className={`text-xs font-bold ${currentView === 'subscriptions' ? 'text-primary' : 'text-main'}`}>Subscriptions</span>
                  </div>
                  <ChevronRight size={14} className={currentView === 'subscriptions' ? 'text-primary/40' : 'text-muted/20'} />
                </button>

                <div className="pt-4 mt-4 border-t border-main/10">
                  <h3 className="px-4 text-[9px] uppercase font-black text-muted/40 tracking-[0.2em] mb-4">Settings</h3>
                  <button
                      onClick={() => { Haptics.light(); setSidebarView('identity'); }}
                      className="w-full px-4 py-3 flex items-center justify-between rounded-sidebar hover:bg-surface/50 border border-transparent transition-all group active:scale-[0.98]"
                  >
                      <div className="flex items-center gap-4">
                          <div className="text-muted group-hover:text-main transition-colors">
                              <UserCircle size={18} />
                          </div>
                          <span className="text-xs font-bold text-main">Profile & Settings</span>
                      </div>
                      <ChevronRight size={14} className="text-muted/20" />
                  </button>
                </div>
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
