import React, { useState } from 'react';
import {
  Lightning as Zap,
  Fingerprint,
  ArrowRight,
  ShieldCheck,
  Database,
  ArrowsClockwise as RefreshCw,
  Question as HelpCircle,
  CaretDown as ChevronDown,
  Info,
  Check,
  TrendUp as TrendingUp,
  Lock,
  Pulse as Activity,
  SquaresFour as LayoutGrid,
  HandCoins,
  Wallet as WalletIcon,
  Tag,
  Clock
} from '@phosphor-icons/react';

interface LandingPageProps {
  onContinueAsGuest: () => void;
  onOpenAuth: (isSignUp: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onContinueAsGuest, onOpenAuth }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

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
      <header className="sticky top-0 z-50 w-full h-[52px] bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-default)] select-none">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          
          {/* Logo / Title */}
          <div className="flex items-center gap-2.5">
            <Zap size={18} weight="regular" className="text-[var(--accent-solid)] stroke-[1.5px]" />
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
                TrackXpense
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-default)]">
                v4.2
              </span>
            </div>
          </div>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-[12px] font-medium text-[var(--text-secondary)]">
            <a href="#features" className="hover:text-[var(--text-primary)] transition-colors">Architecture</a>
            <a href="#preview" className="hover:text-[var(--text-primary)] transition-colors">Workstation</a>
            <a href="#security" className="hover:text-[var(--text-primary)] transition-colors">Security</a>
            <a href="#faq" className="hover:text-[var(--text-primary)] transition-colors">FAQ</a>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onOpenAuth(false)}
              className="h-[30px] px-3 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-[6px] border border-[var(--border-default)] transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button 
              onClick={() => onOpenAuth(true)}
              className="h-[30px] px-3.5 text-[12px] font-medium text-[var(--accent-text)] bg-[var(--accent-solid)] hover:opacity-90 active:scale-95 rounded-[6px] transition-all cursor-pointer font-sans"
            >
              Create Account
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-16 pb-12 sm:pt-20 sm:pb-16 px-4 sm:px-6 max-w-4xl mx-auto text-center flex flex-col items-center">
        
        {/* Micro Kicker */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[11px] font-medium text-[var(--text-secondary)] mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-success-fg)]" />
          <span className="text-[10px] uppercase tracking-[0.06em] text-[var(--text-muted)] font-medium">System Active</span>
          <span className="text-[var(--border-default)]">|</span>
          <span>Local-First Financial Workstation</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[var(--text-primary)] leading-[1.1] max-w-2xl mb-5">
          High-density expense intelligence. Zero trackers.
        </h1>

        {/* Hero Subtitle */}
        <p className="text-[13px] sm:text-[15px] text-[var(--text-secondary)] font-normal max-w-xl leading-relaxed mb-8">
          An offline-first financial ledger engineered with instant IndexedDB persistence, client-side cryptographic security, and automated cloud sync. Designed for speed, precision, and complete data ownership.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto justify-center">
          <button 
            onClick={onContinueAsGuest}
            className="w-full sm:w-auto h-[38px] px-5 text-[13px] font-medium text-[var(--accent-text)] bg-[var(--accent-solid)] hover:opacity-90 active:scale-95 rounded-[6px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-none"
          >
            <span>Start Tracking (Guest Mode)</span>
            <ArrowRight size={14} weight="regular" />
          </button>
          
          <button 
            onClick={() => onOpenAuth(false)}
            className="w-full sm:w-auto h-[38px] px-4 text-[13px] font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] rounded-[6px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
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
            <Check size={13} className="text-[var(--status-success-fg)]" /> No Advertising or Telemetry
          </span>
          <span className="flex items-center gap-1.5">
            <Check size={13} className="text-[var(--status-success-fg)]" /> Instant CSV Data Export
          </span>
        </div>
      </section>

      {/* INTERACTIVE WORKSTATION PREVIEW (Identical to Dashboard Aesthetic) */}
      <section id="preview" className="px-4 sm:px-6 max-w-5xl mx-auto w-full mb-20">
        <div className="rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] overflow-hidden shadow-none">
          
          {/* Workstation Console Bar */}
          <div className="h-[40px] px-4 bg-[var(--bg-surface)] border-b border-[var(--border-default)] flex items-center justify-between text-[11px] select-none">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--status-success-fg)]" />
              <span className="font-medium text-[var(--text-primary)]">Workstation Live Console</span>
              <span className="text-[var(--text-muted)] hidden sm:inline">— Standard Wallet</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider hidden sm:inline">
                STATUS: SYNCED
              </span>
              <div className="h-[22px] px-2 rounded-[4px] bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                <WalletIcon size={12} weight="regular" />
                <span>Primary Wallet</span>
              </div>
            </div>
          </div>

          {/* Dashboard Frame Content */}
          <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* 1. Mini Balance Card */}
            <div className="lg:col-span-1 rounded-[8px] bg-[var(--bg-subtle)]/50 border border-[var(--border-default)] p-4 flex flex-col justify-between h-[170px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em]">
                  Total Balance
                </span>
                <span className="text-[10px] font-mono text-[var(--status-success-fg)] bg-[var(--status-success-bg)] px-1.5 py-0.5 rounded-[4px]">
                  +18.4% MoM
                </span>
              </div>

              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-[var(--text-primary)]">
                  $4,850.00
                </div>
                <div className="text-[11px] text-[var(--text-muted)] mt-0.5 font-mono">
                  Net liquidity across all accounts
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-default)] flex items-center justify-between text-[11px] font-mono">
                <div>
                  <span className="text-[9px] uppercase text-[var(--text-muted)] block">Inflow</span>
                  <span className="text-[var(--status-success-fg)]">+$3,250.00</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-[var(--text-muted)] block">Outflow</span>
                  <span className="text-[var(--text-secondary)]">-$1,420.00</span>
                </div>
                <div>
                  <span className="text-[9px] uppercase text-[var(--text-muted)] block">Runway</span>
                  <span className="text-[var(--accent-solid)] font-semibold">342 Days</span>
                </div>
              </div>
            </div>

            {/* 2. Budget & Daily Goal Widget */}
            <div className="lg:col-span-1 rounded-[8px] bg-[var(--bg-subtle)]/50 border border-[var(--border-default)] p-4 flex flex-col justify-between h-[170px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em]">
                  Daily Spend Pace
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">
                  Target: $80/day
                </span>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-[16px] font-semibold font-mono text-[var(--text-primary)]">$28.50</span>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">35% utilized</span>
                </div>
                {/* 2px Track per rule */}
                <div className="w-full h-[3px] bg-[var(--border-default)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--accent-solid)] rounded-full" style={{ width: '35%' }} />
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-default)] flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">Category distribution:</span>
                <span className="text-[var(--text-primary)] font-medium">Food, Transit, Bills</span>
              </div>
            </div>

            {/* 3. Real-Time Activity Feed */}
            <div className="lg:col-span-1 rounded-[8px] bg-[var(--bg-subtle)]/50 border border-[var(--border-default)] p-4 flex flex-col justify-between h-[170px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em]">
                  Recent Activity
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">Real-Time</span>
              </div>

              <div className="space-y-1.5 py-1">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 truncate">
                    <Tag size={13} className="text-[var(--text-muted)] stroke-[1.5px] shrink-0" />
                    <span className="truncate text-[var(--text-primary)]">Client Honorarium</span>
                  </div>
                  <span className="font-mono text-[var(--status-success-fg)] shrink-0">+$1,200.00</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 truncate">
                    <Tag size={13} className="text-[var(--text-muted)] stroke-[1.5px] shrink-0" />
                    <span className="truncate text-[var(--text-primary)]">Grocery Restock</span>
                  </div>
                  <span className="font-mono text-[var(--text-secondary)] shrink-0">-$65.00</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2 truncate">
                    <Tag size={13} className="text-[var(--text-muted)] stroke-[1.5px] shrink-0" />
                    <span className="truncate text-[var(--text-primary)]">Cloud Subscription</span>
                  </div>
                  <span className="font-mono text-[var(--text-secondary)] shrink-0">-$15.00</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-default)] text-[10px] text-[var(--text-muted)] flex items-center justify-between">
                <span>Auto-categorized</span>
                <span className="text-[var(--accent-solid)]">View full ledger →</span>
              </div>
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
            <Zap size={14} weight="regular" className="text-[var(--accent-solid)]" />
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
