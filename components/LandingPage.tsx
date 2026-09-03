import React, { useState } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Database,
  ArrowsClockwise as RefreshCw,
  CaretDown as ChevronDown,
  Check,
  TrendUp as TrendingUp,
  Lock,
  Pulse as Activity,
  SquaresFour as LayoutGrid,
  HandCoins,
  Wallet as WalletIcon,
  Tag,
  Clock,
  Eye,
  EyeSlash as EyeOff,
  MagnifyingGlass as Search,
  Download,
  Plus,
  SlidersHorizontal,
  FileText,
  Calendar as CalendarIcon,
  ChartPie as PieChart,
  Shuffle,
  Sparkle,
  ArrowDownRight,
  ArrowUpRight
} from '@phosphor-icons/react';

interface LandingPageProps {
  onContinueAsGuest: () => void;
  onOpenAuth: (isSignUp: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onContinueAsGuest, onOpenAuth }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [previewTab, setPreviewTab] = useState<'dashboard' | 'ledger' | 'debts'>('dashboard');
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);

  const faqs = [
    {
      q: "How does the offline-first architecture work?",
      a: "TrackXpense writes all transactions, budgets, and debts directly into your device's local IndexedDB store first. It runs without an active internet connection. When online, the background SyncEngine reconciles local operations with your secure personal database."
    },
    {
      q: "How is my financial data protected?",
      a: "Guest mode operates in full data isolation—no telemetry, no tracking cookies, and zero server network requests. For authenticated accounts, data in transit is protected via TLS 1.3 and database tables are locked with strict PostgreSQL Row Level Security (RLS)."
    },
    {
      q: "What is the Smart Advisor & Runway Engine?",
      a: "The predictive engine computes real-time daily burn rate, financial health scores, and future runway days directly in your browser. It calculates how many days your balance will sustain your current expenditure without requiring third-party data processing."
    },
    {
      q: "Can I export or migrate my data anytime?",
      a: "Yes. You have complete data sovereignty. Export your complete ledger in standard CSV format or a full JSON snapshot from Settings at any time with one click."
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent-subtle)] selection:text-[var(--accent-solid)] relative overflow-x-hidden flex flex-col no-scrollbar">
      
      {/* TOP HEADER / WORKSTATION BAR */}
      <header className="sticky top-0 z-50 w-full h-[54px] bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-default)] select-none">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          
          {/* Real Logo / Title */}
          <div className="flex items-center gap-2.5">
            <img 
              src="/icon.png" 
              alt="TrackXpense Logo" 
              className="w-6 h-6 rounded-[5px] object-contain shrink-0" 
            />
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold tracking-tight text-[var(--text-primary)]">
                TrackXpense
              </span>
              <span className="hidden sm:inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-default)]">
                v4.2
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-[12px] font-medium text-[var(--text-secondary)]">
            <a href="#preview" className="hover:text-[var(--text-primary)] transition-colors">Workstation Preview</a>
            <a href="#features" className="hover:text-[var(--text-primary)] transition-colors">Architecture</a>
            <a href="#security" className="hover:text-[var(--text-primary)] transition-colors">Security</a>
            <a href="#faq" className="hover:text-[var(--text-primary)] transition-colors">FAQ</a>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onOpenAuth(false)}
              className="h-[32px] px-3 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-[6px] border border-[var(--border-default)] transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={() => onOpenAuth(true)}
              className="h-[32px] px-3.5 text-[12px] font-medium text-[var(--accent-text)] bg-[var(--accent-solid)] hover:opacity-90 active:scale-95 rounded-[6px] transition-all cursor-pointer font-sans"
            >
              Create Account
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-14 pb-10 sm:pt-20 sm:pb-14 px-4 sm:px-6 max-w-4xl mx-auto text-center flex flex-col items-center">
        
        {/* Micro Kicker */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[11px] font-medium text-[var(--text-secondary)] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success-fg)]" />
          <span className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)] font-medium">System Active</span>
          <span className="text-[var(--border-default)]">|</span>
          <span>Local-First Financial Workstation</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[var(--text-primary)] leading-[1.15] max-w-2xl mb-5">
          High-density expense intelligence. Zero trackers.
        </h1>

        {/* Hero Subtitle */}
        <p className="text-[13px] sm:text-[15px] text-[var(--text-secondary)] font-normal max-w-xl leading-relaxed mb-8">
          An offline-first financial ledger engineered with instant IndexedDB persistence, client-side cryptographic security, and automated cloud sync. Designed for speed, precision, and complete data sovereignty.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-center">
          <button 
            onClick={onContinueAsGuest}
            className="w-full sm:w-auto h-[40px] px-6 text-[13px] font-medium text-[var(--accent-text)] bg-[var(--accent-solid)] hover:opacity-90 active:scale-95 rounded-[6px] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Launch Workstation (Guest Mode)</span>
            <ArrowRight size={14} weight="regular" />
          </button>
          
          <button 
            onClick={() => onOpenAuth(false)}
            className="w-full sm:w-auto h-[40px] px-4.5 text-[13px] font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] rounded-[6px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock size={14} weight="regular" className="text-[var(--text-muted)]" />
            <span>Sign In to Cloud Sync</span>
          </button>
        </div>

        {/* Micro Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-8 text-[11px] text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <Check size={13} className="text-[var(--status-success-fg)]" /> 100% Offline Capable
          </span>
          <span className="flex items-center gap-1.5">
            <Check size={13} className="text-[var(--status-success-fg)]" /> Zero Telemetry or Ads
          </span>
          <span className="flex items-center gap-1.5">
            <Check size={13} className="text-[var(--status-success-fg)]" /> WebCrypto AES-GCM-256
          </span>
        </div>
      </section>

      {/* INTERACTIVE WORKSTATION PREVIEW FRAME */}
      <section id="preview" className="px-4 sm:px-6 max-w-5xl mx-auto w-full mb-20">
        
        {/* Outer Browser/App Window Frame */}
        <div className="rounded-[12px] bg-[var(--bg-surface)] border border-[var(--border-default)] overflow-hidden shadow-2xl">
          
          {/* Window Chrome Titlebar */}
          <div className="h-[38px] px-4 bg-[var(--bg-subtle)] border-b border-[var(--border-default)] flex items-center justify-between text-[11px] select-none">
            
            {/* macOS Window Controls */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/80 border border-[#EF4444]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/80 border border-[#F59E0B]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]/80 border border-[#22C55E]" />
              <span className="ml-2 font-mono text-[10px] text-[var(--text-muted)] hidden sm:inline">
                https://app.trackxpense.internal
              </span>
            </div>

            {/* Window Title & Live Status */}
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success-fg)] animate-pulse" />
              <span className="font-medium text-[var(--text-primary)] text-[11px]">
                TrackXpense Workstation
              </span>
              <span className="text-[var(--text-muted)] text-[10px] font-mono hidden md:inline">
                [IndexedDB Connected]
              </span>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center p-0.5 rounded-[5px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[10px]">
              <button
                onClick={() => setPreviewTab('dashboard')}
                className={`px-2 py-0.5 rounded-[3px] font-medium transition-all cursor-pointer ${
                  previewTab === 'dashboard'
                    ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setPreviewTab('ledger')}
                className={`px-2 py-0.5 rounded-[3px] font-medium transition-all cursor-pointer ${
                  previewTab === 'ledger'
                    ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Ledger
              </button>
              <button
                onClick={() => setPreviewTab('debts')}
                className={`px-2 py-0.5 rounded-[3px] font-medium transition-all cursor-pointer ${
                  previewTab === 'debts'
                    ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Liabilities
              </button>
            </div>

          </div>

          {/* Workstation App Canvas (Sidebar + Main View) */}
          <div className="flex min-h-[480px]">
            
            {/* Left Desktop Sidebar (Authentic Technical Rail) */}
            <aside className="w-[190px] border-r border-[var(--border-default)] bg-[var(--bg-surface)] p-3 hidden md:flex flex-col justify-between shrink-0 select-none">
              <div className="space-y-4">
                
                {/* User / Workspace Switcher */}
                <div className="flex items-center justify-between p-2 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src="/icon.png" alt="Logo" className="w-4 h-4 rounded-[3px] shrink-0" />
                    <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                      Main Vault
                    </span>
                  </div>
                  <ChevronDown size={12} className="text-[var(--text-muted)]" />
                </div>

                {/* Sidebar Navigation Links */}
                <nav className="space-y-1">
                  <button 
                    onClick={() => setPreviewTab('dashboard')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[5px] text-[12px] font-medium transition-colors cursor-pointer ${
                      previewTab === 'dashboard'
                        ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={14} strokeWidth={1.5} className={previewTab === 'dashboard' ? 'text-[var(--accent-solid)]' : ''} />
                      <span>Dashboard</span>
                    </div>
                    {previewTab === 'dashboard' && <span className="w-1 h-1 rounded-full bg-[var(--accent-solid)]" />}
                  </button>

                  <button 
                    onClick={() => setPreviewTab('ledger')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[5px] text-[12px] font-medium transition-colors cursor-pointer ${
                      previewTab === 'ledger'
                        ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={14} strokeWidth={1.5} className={previewTab === 'ledger' ? 'text-[var(--accent-solid)]' : ''} />
                      <span>Ledger</span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">148</span>
                  </button>

                  <button 
                    onClick={() => setPreviewTab('debts')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[5px] text-[12px] font-medium transition-colors cursor-pointer ${
                      previewTab === 'debts'
                        ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <HandCoins size={14} strokeWidth={1.5} className={previewTab === 'debts' ? 'text-[var(--accent-solid)]' : ''} />
                      <span>Debts</span>
                    </div>
                  </button>

                  <div className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[5px] text-[12px] font-medium text-[var(--text-muted)] opacity-60">
                    <TrendingUp size={14} strokeWidth={1.5} />
                    <span>Analytics</span>
                  </div>

                  <div className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[5px] text-[12px] font-medium text-[var(--text-muted)] opacity-60">
                    <Lock size={14} strokeWidth={1.5} />
                    <span>Device Vault</span>
                  </div>
                </nav>
              </div>

              {/* Bottom Sidebar Status */}
              <div className="pt-2 border-t border-[var(--border-default)] text-[10px] text-[var(--text-muted)] font-mono flex items-center justify-between">
                <span>TLS 1.3 AES-GCM</span>
                <span className="text-[var(--status-success-fg)]">ONLINE</span>
              </div>
            </aside>

            {/* Main Application Content Area */}
            <div className="flex-1 bg-[var(--bg-page)] p-3 sm:p-5 overflow-x-hidden">
              
              {/* Workstation Top Control Bar */}
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[var(--border-default)] text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="h-[28px] px-2.5 rounded-[5px] bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
                    <CalendarIcon size={12} strokeWidth={1.5} />
                    <span>Last 30 Days</span>
                    <ChevronDown size={11} className="text-[var(--text-muted)]" />
                  </div>

                  <div className="h-[28px] px-2.5 rounded-[5px] bg-[var(--bg-surface)] border border-[var(--border-default)] hidden sm:flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <WalletIcon size={12} strokeWidth={1.5} />
                    <span>Primary Checking ($)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="h-[28px] px-2.5 rounded-[5px] bg-[var(--status-success-bg)] border border-[var(--border-default)] flex items-center gap-1 text-[var(--status-success-fg)] font-mono font-medium">
                    <Activity size={12} />
                    <span>Runway: 342 Days</span>
                  </div>

                  <button 
                    onClick={onContinueAsGuest}
                    className="h-[28px] px-2.5 rounded-[5px] bg-[var(--accent-solid)] text-[var(--accent-text)] font-medium flex items-center gap-1 hover:opacity-90 transition-opacity cursor-pointer font-sans"
                  >
                    <Plus size={12} strokeWidth={2} />
                    <span className="hidden sm:inline">Add Transaction</span>
                  </button>
                </div>
              </div>

              {/* VIEW 1: REAL DASHBOARD PREVIEW */}
              {previewTab === 'dashboard' && (
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  
                  {/* Natural Language AI Prompt Bar */}
                  <div className="p-2 rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center gap-2 text-[11px]">
                    <Sparkle size={14} className="text-[var(--accent-solid)] shrink-0" />
                    <span className="text-[var(--text-muted)] font-mono truncate">
                      Ask RabbAi: "Spent $18 on coffee & lunch with team..."
                    </span>
                    <span className="ml-auto px-2 py-0.5 rounded-[4px] bg-[var(--bg-subtle)] text-[10px] font-mono text-[var(--text-muted)] border border-[var(--border-default)] shrink-0">
                      Press ⏎
                    </span>
                  </div>

                  {/* 2-Column Responsive Dashboard Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    {/* Balance Hero Card */}
                    <div className="md:col-span-2 p-4 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em]">
                          Total Balance
                        </span>
                        <button 
                          onClick={() => setPrivacyMode(!privacyMode)}
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                          title="Toggle Privacy Mask"
                        >
                          {privacyMode ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                        </button>
                      </div>

                      <div className="mb-3">
                        <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-[var(--text-primary)]">
                          {privacyMode ? '••••••••' : '$4,850.00'}
                        </span>
                        <div className="text-[11px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
                          <span>Adjusted Safe Runway:</span>
                          <span className="text-[var(--text-secondary)] font-mono font-medium">
                            {privacyMode ? '••••' : '$4,520.00'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[var(--border-default)] grid grid-cols-3 gap-2 text-[11px] font-mono">
                        <div>
                          <span className="text-[9px] uppercase text-[var(--text-muted)] block">Inflow</span>
                          <span className="text-[var(--status-success-fg)] font-medium">
                            {privacyMode ? '••••' : '+$3,250.00'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-[var(--text-muted)] block">Outflow</span>
                          <span className="text-[var(--text-primary)] font-medium">
                            {privacyMode ? '••••' : '-$1,420.00'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-[var(--text-muted)] block">Monthly Savings</span>
                          <span className="text-[var(--accent-solid)] font-medium">
                            {privacyMode ? '••%' : '56.3%'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Daily Budget Velocity & Stability Widgets */}
                    <div className="space-y-3">
                      
                      {/* Daily Budget Pace */}
                      <div className="p-3.5 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em]">
                            Daily Budget Pace
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            Cap: $80/day
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className="text-[15px] font-semibold font-mono text-[var(--text-primary)]">$28.50</span>
                          <span className="text-[10px] font-mono text-[var(--status-success-fg)]">35% used</span>
                        </div>
                        <div className="w-full h-[3px] bg-[var(--border-default)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--accent-solid)] rounded-full" style={{ width: '35%' }} />
                        </div>
                      </div>

                      {/* Financial Health Score */}
                      <div className="p-3.5 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em] block">
                            Health Score
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-[18px] font-bold font-mono text-[var(--text-primary)]">94</span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">/ 100</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-[var(--status-success-bg)] text-[var(--status-success-fg)] text-[11px] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success-fg)]" />
                          <span>Optimum</span>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* Spending Trajectory SVG Graph */}
                  <div className="p-3.5 sm:p-4 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)]">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em] block">
                          Spending Trajectory
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[16px] font-bold font-mono text-[var(--text-primary)]">
                            $1,420.00
                          </span>
                          <span className="text-[10px] font-mono text-[var(--status-success-fg)] flex items-center">
                            <ArrowDownRight size={11} /> 12.4% vs prior period
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">30-Day Window</span>
                    </div>

                    {/* SVG Sparkline Curve */}
                    <div className="h-[90px] w-full pt-1">
                      <svg viewBox="0 0 500 90" className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id="landingCurveGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#E3993D" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#E3993D" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 0,70 Q 50,75 100,55 T 200,60 T 300,35 T 400,45 T 500,20 L 500,90 L 0,90 Z"
                          fill="url(#landingCurveGrad)"
                        />
                        <path
                          d="M 0,70 Q 50,75 100,55 T 200,60 T 300,35 T 400,45 T 500,20"
                          fill="none"
                          stroke="#E3993D"
                          strokeWidth="2"
                        />
                        <circle cx="500" cy="20" r="3.5" fill="#E3993D" />
                      </svg>
                    </div>

                    <div className="flex justify-between text-[9px] font-mono text-[var(--text-muted)] pt-1 border-t border-[var(--border-default)]/60">
                      <span>Aug 04</span>
                      <span>Aug 11</span>
                      <span>Aug 18</span>
                      <span>Aug 25</span>
                      <span>Today</span>
                    </div>
                  </div>

                  {/* Recent Ledger Row Preview */}
                  <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] overflow-hidden">
                    <div className="px-3.5 py-2 border-b border-[var(--border-default)] bg-[var(--bg-subtle)]/40 flex items-center justify-between text-[11px]">
                      <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                        Recent Transactions
                      </span>
                      <button 
                        onClick={() => setPreviewTab('ledger')}
                        className="text-[10px] text-[var(--accent-solid)] hover:underline cursor-pointer"
                      >
                        Open Full Ledger →
                      </button>
                    </div>

                    <div className="divide-y divide-[var(--border-default)] text-[12px]">
                      {[
                        { title: 'Client Retainer Payment', cat: 'Income', date: 'Today, 10:14 AM', amount: '+$1,850.00', isIncome: true },
                        { title: 'Server Infrastructure Host', cat: 'Bills', date: 'Yesterday', amount: '-$42.00', isIncome: false },
                        { title: 'Whole Foods Market', cat: 'Groceries', date: 'Aug 29', amount: '-$68.40', isIncome: false }
                      ].map((tx, i) => (
                        <div key={i} className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[var(--bg-surface-hover)] transition-colors">
                          <div className="flex items-center gap-2.5">
                            <Tag size={13} className="text-[var(--text-muted)] stroke-[1.5px]" />
                            <div>
                              <span className="font-medium text-[var(--text-primary)] block leading-tight">{tx.title}</span>
                              <span className="text-[10px] text-[var(--text-muted)] font-mono">{tx.cat} • {tx.date}</span>
                            </div>
                          </div>
                          <span className={`font-mono font-semibold text-[12px] ${tx.isIncome ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-primary)]'}`}>
                            {privacyMode ? '••••' : tx.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* VIEW 2: REAL LEDGER TABLE PREVIEW */}
              {previewTab === 'ledger' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <div className="h-[28px] px-2.5 rounded-[5px] bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center gap-1.5 text-[var(--text-muted)]">
                        <Search size={12} />
                        <span className="text-[11px]">Search notes or tags...</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--accent-solid)] text-[var(--accent-text)] font-semibold">
                        All Records
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                        Expenses
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">148 Transactions</span>
                  </div>

                  <div className="rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] overflow-hidden">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead>
                        <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]/50 text-[10px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Category</th>
                          <th className="py-2 px-3">Note / Description</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-default)] font-mono">
                        {[
                          { date: '2026-09-02', cat: 'Income', note: 'Consulting Contract Payout', amount: '+$3,250.00', inc: true },
                          { date: '2026-09-01', cat: 'Housing', note: 'Monthly Office Studio Lease', amount: '-$1,100.00', inc: false },
                          { date: '2026-08-30', cat: 'Food', note: 'Merchant Dining Split #dinner', amount: '-$48.50', inc: false },
                          { date: '2026-08-28', cat: 'Transit', note: 'Transit Pass Monthly Renewal', amount: '-$72.00', inc: false },
                          { date: '2026-08-26', cat: 'Utilities', note: 'Fiber Optical Internet Bill', amount: '-$60.00', inc: false }
                        ].map((row, idx) => (
                          <tr key={idx} className="hover:bg-[var(--bg-surface-hover)]">
                            <td className="py-2 px-3 text-[var(--text-muted)]">{row.date}</td>
                            <td className="py-2 px-3 text-[var(--text-primary)] font-sans font-medium">{row.cat}</td>
                            <td className="py-2 px-3 text-[var(--text-secondary)] font-sans">{row.note}</td>
                            <td className={`py-2 px-3 text-right font-semibold ${row.inc ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-primary)]'}`}>
                              {row.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 3: REAL LIABILITIES / DEBT PREVIEW */}
              {previewTab === 'debts' && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-default)]">
                      <span className="text-[9px] uppercase text-[var(--text-muted)] block">You Owe</span>
                      <span className="text-[14px] font-mono font-semibold text-[var(--status-error-fg)]">$120.00</span>
                    </div>
                    <div className="p-2.5 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-default)]">
                      <span className="text-[9px] uppercase text-[var(--text-muted)] block">Owed to You</span>
                      <span className="text-[14px] font-mono font-semibold text-[var(--status-success-fg)]">$450.00</span>
                    </div>
                    <div className="p-2.5 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-default)]">
                      <span className="text-[9px] uppercase text-[var(--text-muted)] block">Net Position</span>
                      <span className="text-[14px] font-mono font-semibold text-[var(--text-primary)]">+$330.00</span>
                    </div>
                  </div>

                  <div className="rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] divide-y divide-[var(--border-default)] text-[11px]">
                    <div className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-[var(--text-primary)] block">David Miller</span>
                        <span className="text-[10px] text-[var(--text-muted)]">Conference Travel Split • Due Sep 15</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-mono font-semibold text-[var(--status-success-fg)] block">+$350.00</span>
                        <span className="text-[10px] text-[var(--status-success-fg)] font-medium">Owed to You</span>
                      </div>
                    </div>

                    <div className="p-3 flex items-center justify-between">
                      <div>
                        <span className="font-medium text-[var(--text-primary)] block">Office Depot</span>
                        <span className="text-[10px] text-[var(--text-muted)]">Equipment Invoice • Due Sep 08</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[13px] font-mono font-semibold text-[var(--status-error-fg)] block">$120.00</span>
                        <span className="text-[10px] text-[var(--status-error-fg)] font-medium">You Owe</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>

        </div>
      </section>

      {/* CORE ARCHITECTURE / FEATURES */}
      <section id="features" className="py-16 border-t border-[var(--border-default)] bg-[var(--bg-surface)]/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          
          <div className="text-center max-w-lg mx-auto mb-12">
            <span className="text-[10px] uppercase font-semibold tracking-[0.06em] text-[var(--accent-solid)] block mb-1.5">
              Core Principles
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Built for technical clarity and zero compromise
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Pillar 1 */}
            <div className="p-5 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] transition-colors">
              <Database size={22} weight="regular" className="text-[var(--accent-solid)] stroke-[1.5px] mb-4" />
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1.5">
                Local-First Performance
              </h3>
              <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                IndexedDB driver executes transactions with sub-10ms UI latency. Instant read-write workflows with full capabilities without network availability.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-5 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] transition-colors">
              <ShieldCheck size={22} weight="regular" className="text-[var(--accent-solid)] stroke-[1.5px] mb-4" />
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1.5">
                Client Cryptography
              </h3>
              <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                SubtleCrypto WebCrypto AES-GCM-256 cipher protection with salted PBKDF2 vault passcodes. Your private financial notes remain shielded.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-5 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] transition-colors">
              <RefreshCw size={22} weight="regular" className="text-[var(--accent-solid)] stroke-[1.5px] mb-4" />
              <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-1.5">
                Resilient Cloud Sync
              </h3>
              <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                PostgreSQL database replication with Row Level Security. Offline sync queues ensure non-blocking automatic conflict reconciliation upon reconnect.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* SECURITY SPECIFICATION */}
      <section id="security" className="py-16 border-t border-[var(--border-default)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={18} weight="regular" className="text-[var(--accent-solid)] stroke-[1.5px]" />
              <span className="text-[11px] uppercase tracking-[0.06em] font-medium text-[var(--text-muted)]">
                Security Architecture
              </span>
            </div>
            
            <h3 className="text-lg sm:text-xl font-semibold text-[var(--text-primary)] mb-3 tracking-tight">
              Data Privacy Specification
            </h3>
            
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-6">
              TrackXpense guarantees zero commercial advertising, zero behavioral telemetry scripts, and zero cross-site analytics tracking. Your ledger remains your sovereign property.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
              <div className="p-3 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
                <span className="font-medium text-[var(--text-primary)] block mb-0.5">Database RLS Isolation</span>
                <span className="text-[var(--text-muted)] text-[11px]">Strict user-scoped PostgreSQL policies enforce zero cross-tenant access.</span>
              </div>
              <div className="p-3 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
                <span className="font-medium text-[var(--text-primary)] block mb-0.5">Device Vault Lock</span>
                <span className="text-[var(--text-muted)] text-[11px]">Optional 4-digit PIN secured via 100,000 PBKDF2 iterations to lock desktop screens.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section id="faq" className="py-16 border-t border-[var(--border-default)] bg-[var(--bg-surface)]/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          
          <div className="text-center mb-10">
            <span className="text-[10px] uppercase font-semibold tracking-[0.06em] text-[var(--accent-solid)] block mb-1">
              Support & Documentation
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-2">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full px-4 py-3.5 text-left flex justify-between items-center text-[13px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown 
                      size={14} 
                      className={`text-[var(--text-muted)] transform transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180 text-[var(--accent-solid)]' : ''}`} 
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 text-[12px] text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-default)]/50">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* BOTTOM FOOTER */}
      <footer className="mt-auto border-t border-[var(--border-default)] py-8 px-4 sm:px-6 bg-[var(--bg-surface)] select-none">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="Logo" className="w-4 h-4 rounded-[3px] shrink-0" />
            <span className="font-medium text-[var(--text-primary)]">TrackXpense</span>
            <span>— Personal Finance Workstation</span>
          </div>

          <div className="flex items-center gap-5 font-mono text-[10px]">
            <span>NO COOKIES</span>
            <span>•</span>
            <span>NO ADS</span>
            <span>•</span>
            <span>LOCAL-FIRST</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
