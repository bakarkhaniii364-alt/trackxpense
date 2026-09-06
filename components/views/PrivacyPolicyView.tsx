import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Sparkle, 
  ArrowRight, 
  MagnifyingGlass as Search,
  Globe,
  ArrowSquareOut
} from '@phosphor-icons/react';
import { ViewState } from '../../types';
import { navigateTo } from '../../src/services/router';

interface PrivacyPolicyViewProps {
  onNavigate?: (view: ViewState) => void;
}

interface PolicySection {
  id: string;
  sectionNumber: string;
  title: string;
  kicker: string;
  summary: string;
  paragraphs: string[];
  bulletPoints?: { label: string; text: string }[];
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Set document title
  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'Privacy Policy | TrackXpense';
    return () => {
      document.title = originalTitle;
    };
  }, []);

  // Handle direct anchor links on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.slice(1);
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    }
  }, []);

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/privacy#${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const policySections: PolicySection[] = [
    {
      id: 'on-device-storage',
      sectionNumber: '01',
      kicker: 'Client Experience',
      title: 'Client-Side Storage & Autonomous Offline Operation',
      summary: 'Your financial transactions, accounts, and budgets are saved directly in your device’s local browser storage, ensuring complete functionality without network connectivity.',
      paragraphs: [
        'TrackXpense is an independent, non-commercial software project developed by an engineering student with enterprise-grade data protection principles. When you use TrackXpense, your financial records are stored directly within your local device environment.',
        'All mathematical calculations, budget progress indicators, category aggregations, and visual chart projections execute in real time on your machine. In Guest mode, the application functions completely offline with zero data transmitted to any external server.'
      ],
      bulletPoints: [
        {
          label: 'Device-Level Isolation',
          text: 'Your data remains isolated within your browser’s dedicated storage sandbox on your hardware.'
        },
        {
          label: 'Complete Offline Usability',
          text: 'Core ledger features, budget calculations, and visualizations require no active internet connection.'
        },
        {
          label: 'Local Persistence',
          text: 'Your ledger remains safely saved on your device until you choose to export it, clear it in Settings, or wipe your browser cache.'
        }
      ]
    },
    {
      id: 'zero-credentials',
      sectionNumber: '02',
      kicker: 'Credential Safety',
      title: 'Zero Financial Account Credentials & No Bank Scrapers',
      summary: 'We never request your online banking passwords, account numbers, or card details. We do not connect to third-party bank aggregators.',
      paragraphs: [
        'Commercial finance applications frequently require users to grant third-party aggregators direct access to their online banking portals. These arrangements often expose historical statements, routing numbers, and consumer lifestyle habits to data brokers.',
        'TrackXpense rejects this model entirely. We will never ask for your online banking username, password, multi-factor codes, or credit card numbers. Your records are created exclusively through your direct entries or manual file imports (such as bank CSV statements).'
      ],
      bulletPoints: [
        {
          label: 'No Bank Credentials',
          text: 'We never request, handle, or possess access to your bank accounts, credit cards, or institutional logins.'
        },
        {
          label: 'No Automated Scrapers',
          text: 'Zero background bots scraping your live accounts or monitoring card swipes.'
        },
        {
          label: 'User-Directed Entries',
          text: 'You decide exactly what is recorded through manual logging or verified CSV imports.'
        }
      ]
    },
    {
      id: 'zero-telemetry',
      sectionNumber: '03',
      kicker: 'Zero Surveillance',
      title: 'Zero Telemetry, Marketing Cookies & Behavioral Tracking',
      summary: 'We do not track your clicks, record your screen, deploy marketing cookies, or sell personal information to data brokers.',
      paragraphs: [
        'TrackXpense operates under a strict principle of user data sovereignty. We do not utilize third-party analytics trackers, advertising cookies, behavioral heatmaps, or session replay scripts that record your screen or keystrokes.',
        'We do not sell, license, rent, or trade your personal information or financial activity to any advertising networks, credit bureaus, or commercial data brokers under any circumstances.'
      ],
      bulletPoints: [
        {
          label: 'Zero Surveillance Scripts',
          text: 'No third-party trackers, marketing cookies, heatmaps, or keystroke loggers.'
        },
        {
          label: 'No Advertising Partners',
          text: 'We do not partner with or send data to any advertising or data brokerage networks.'
        },
        {
          label: 'No Data Monetization',
          text: 'Our code contains only the software necessary to execute the financial tool.'
        }
      ]
    },
    {
      id: 'cloud-sync',
      sectionNumber: '04',
      kicker: 'Cloud Experience',
      title: 'Optional Multi-Device Cloud Synchronization',
      summary: 'Cloud synchronization is strictly opt-in. If you choose to enable it, your data syncs securely across your authorized devices.',
      paragraphs: [
        'For users who wish to seamlessly access their ledger across both desktop and mobile devices, TrackXpense offers optional cloud synchronization. If you choose to register an account, your data is securely transferred to synchronize your devices.',
        'Your account credentials (such as your verified email address) are used solely to authenticate your identity and deliver your records to your active sessions. Each account is strictly partitioned so that only your verified login can access your synchronized ledger. Cloud sync is never required—you may use TrackXpense indefinitely in local Guest mode.'
      ],
      bulletPoints: [
        {
          label: 'Strictly Opt-In',
          text: 'Account creation and cloud synchronization are entirely optional; the app remains fully functional offline.'
        },
        {
          label: 'Secure Transmission',
          text: 'All communications between your device and sync servers utilize modern, enterprise-grade encrypted connections.'
        },
        {
          label: 'Account Partitioning',
          text: 'Your synchronized data is isolated and accessible only via your authenticated credentials.'
        }
      ]
    },
    {
      id: 'rabbai-assistant',
      sectionNumber: '05',
      kicker: 'Intelligent Tools',
      title: 'RabbAi Assistant & Ephemeral Processing',
      summary: 'Our optional assistant operates with zero model training. Your financial queries and receipts are processed ephemerally in real time.',
      paragraphs: [
        'TrackXpense includes an optional assistant, RabbAi, designed to assist with receipt interpretation, natural-language expense categorization, and financial summarization. RabbAi remains inactive until you explicitly engage it.',
        'When you submit a query or scan a receipt with RabbAi, the information is processed ephemerally to produce an immediate answer. Your queries and financial entries are never used to train, tune, or improve public artificial intelligence models. Advanced users may also connect their own AI provider API keys directly.'
      ],
      bulletPoints: [
        {
          label: 'Zero Model Training',
          text: 'Your financial information is never fed into AI training datasets or public learning corpora.'
        },
        {
          label: 'Ephemeral Execution',
          text: 'Interactions are processed in the moment and not retained for secondary algorithmic profiling.'
        },
        {
          label: 'Direct Key Support (BYOK)',
          text: 'Option to supply your own API credentials for direct client-to-provider processing.'
        }
      ]
    },
    {
      id: 'data-ownership-contact',
      sectionNumber: '06',
      kicker: 'User Rights & Contact',
      title: 'Full Data Portability, Instant Erasure & Support Contact',
      summary: 'You can export your complete ledger at any time, wipe your local or cloud data in one action, or reach out with privacy questions.',
      paragraphs: [
        'You retain absolute authority over your financial data. You can download your entire transaction history at any time in standard CSV or structured JSON formats with zero fees or export limits.',
        'A single click on the reset utility in Settings permanently erases all local ledger records, accounts, and preferences from your device. For cloud users, account deletion permanently purges all remote sync records. If you have questions regarding your data or privacy rights, you can contact the project maintainer directly.'
      ],
      bulletPoints: [
        {
          label: 'Open Standard Exports',
          text: 'Export complete transaction histories to CSV and JSON compatible with spreadsheet software.'
        },
        {
          label: 'Immediate Local & Cloud Erasure',
          text: 'Instantly purge local device caches or permanently delete remote cloud accounts upon request.'
        },
        {
          label: 'Direct Inquiries',
          text: 'bakarkhaniii364@gmail.com'
        }
      ]
    }
  ];

  const filteredSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return policySections;
    return policySections.filter(sec => 
      sec.title.toLowerCase().includes(q) ||
      sec.summary.toLowerCase().includes(q) ||
      sec.kicker.toLowerCase().includes(q) ||
      sec.paragraphs.some(p => p.toLowerCase().includes(q)) ||
      sec.bulletPoints?.some(b => b.label.toLowerCase().includes(q) || b.text.toLowerCase().includes(q))
    );
  }, [policySections, searchQuery]);

  return (
    <div 
      id="privacy-scroll-container"
      className="w-full h-[100dvh] max-h-[100dvh] overflow-y-auto overflow-x-hidden bg-[var(--bg-page)] text-[var(--text-primary)] font-sans flex flex-col selection:bg-[var(--accent-solid)] selection:text-[var(--accent-text)]"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--border-strong) transparent'
      }}
    >
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (EXACT: <LOGO> PRIVACY POLICY ... OPEN APP)                 */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 w-full h-[52px] bg-[var(--bg-page)] border-b border-[var(--border-default)] px-4 sm:px-8 flex items-center justify-between shrink-0 print:hidden">
        
        {/* Left: <logo> Privacy Policy */}
        <div className="flex items-center gap-2.5">
          <img 
            src="/icon.png" 
            alt="TrackXpense" 
            className="w-6 h-6 rounded-full object-contain shrink-0 select-none pointer-events-none" 
          />
          <span className="text-[13.5px] font-medium text-[var(--text-primary)] tracking-tight">
            Privacy Policy
          </span>
        </div>

        {/* Right: Open App */}
        <div>
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('dashboard') : navigateTo('dashboard')}
            className="h-[32px] px-3.5 text-[12px] font-medium text-[var(--accent-text)] bg-[var(--accent-solid)] hover:opacity-90 active:scale-[0.98] rounded-[6px] transition-all flex items-center gap-1.5 cursor-pointer shadow-none"
          >
            <span>Open App</span>
            <ArrowRight size={13} weight="bold" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION (CLOUDFLARE-STYLE DIAGONAL PINSTRIPE WITH FLOATING BADGES) */}
      {/* ========================================================================= */}
      <section 
        className="w-full shrink-0 border-b border-[var(--border-default)] py-12 sm:py-16 px-4 sm:px-8 relative overflow-hidden print:hidden"
        style={{
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.075) 0px, rgba(255, 255, 255, 0.075) 1.25px, transparent 1.25px, transparent 10px)'
        }}
      >
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          
          {/* Left Column: Heading, Subtitle & Clean Pills */}
          <div className="space-y-4 max-w-2xl text-left">
            <h2 className="text-2xl sm:text-3xl font-medium text-[var(--text-primary)] tracking-tight">
              Privacy &amp; Data Sovereignty
            </h2>
            <p className="text-[13.5px] sm:text-[14px] text-[var(--text-secondary)] leading-relaxed max-w-xl">
              TrackXpense is architected local-first. We believe your personal financial ledger belongs strictly to you. No bank scrapers, zero third-party telemetry, and zero behavioral profiling.
            </p>

            {/* Pill Row */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="h-[28px] px-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-page)] text-[12px] text-[var(--text-secondary)] flex items-center">
                <span>Zero Telemetry</span>
              </div>
              <div className="h-[28px] px-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-page)] text-[12px] text-[var(--text-secondary)] flex items-center">
                <span>Local-First Storage</span>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('security-policy')}
                className="h-[28px] px-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-page)] hover:bg-[var(--bg-surface-hover)] hover:border-[var(--border-active)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Security Policy</span>
                <ArrowSquareOut size={11} className="opacity-70" />
              </button>
              <button
                type="button"
                onClick={() => navigateTo('terms-of-service')}
                className="h-[28px] px-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-page)] hover:bg-[var(--bg-surface-hover)] hover:border-[var(--border-active)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Terms of Service</span>
                <ArrowSquareOut size={11} className="opacity-70" />
              </button>
            </div>
          </div>

          {/* Right Column: Signature Trio of Floating Tilted Dashed Orange Badges */}
          <div className="relative flex items-center justify-center md:justify-end shrink-0 py-4 pr-4">
            <div className="relative w-[180px] h-[100px] flex items-center justify-center select-none pointer-events-none">
              
              {/* Badge 1: Left tilted (-12deg) with Shield */}
              <div 
                className="absolute left-2 top-3 w-[46px] h-[46px] rounded-[14px] border border-dashed border-[#f6821f]/60 bg-[#f6821f]/10 flex items-center justify-center transition-transform hover:scale-105"
                style={{ transform: 'rotate(-12deg)' }}
              >
                <ShieldCheck size={22} strokeWidth={1.5} className="text-[#f6821f]" />
              </div>

              {/* Badge 2: Center tilted (+4deg) with Globe */}
              <div 
                className="absolute left-[66px] top-0 w-[48px] h-[48px] rounded-[14px] border border-dashed border-[#f6821f]/70 bg-[#f6821f]/12 flex items-center justify-center transition-transform hover:scale-105 z-10"
                style={{ transform: 'rotate(4deg)' }}
              >
                <Globe size={22} strokeWidth={1.5} className="text-[#f6821f]" />
              </div>

              {/* Badge 3: Right tilted (+15deg) with Sparkle */}
              <div 
                className="absolute right-2 top-5 w-[46px] h-[46px] rounded-[14px] border border-dashed border-[#f6821f]/60 bg-[#f6821f]/10 flex items-center justify-center transition-transform hover:scale-105"
                style={{ transform: 'rotate(15deg)' }}
              >
                <Sparkle size={20} weight="fill" className="text-[#f6821f]" />
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT: SINGULAR PRIVACY POLICY BOX (NO ROW / COLUMNS)          */}
      {/* ========================================================================= */}
      <main className="w-full shrink-0 max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
        
        {/* THE SINGULAR BOX WITH TECHNICAL CORNER NODES */}
        <div className="relative">
          {/* Blueprint Corner Nodes (Flat, unraised, technical vertex handles matching screenshot) */}
          <div className="absolute -top-[5.5px] -left-[5.5px] w-[11px] h-[11px] rounded-[3px] border border-[var(--border-strong)] bg-[var(--bg-page)] z-20 pointer-events-none" />
          <div className="absolute -top-[5.5px] -right-[5.5px] w-[11px] h-[11px] rounded-[3px] border border-[var(--border-strong)] bg-[var(--bg-page)] z-20 pointer-events-none" />
          <div className="absolute -bottom-[5.5px] -left-[5.5px] w-[11px] h-[11px] rounded-[3px] border border-[var(--border-strong)] bg-[var(--bg-page)] z-20 pointer-events-none" />
          <div className="absolute -bottom-[5.5px] -right-[5.5px] w-[11px] h-[11px] rounded-[3px] border border-[var(--border-strong)] bg-[var(--bg-page)] z-20 pointer-events-none" />

          {/* Singular Box Container */}
          <div className="border border-[var(--border-default)] rounded-[2px] bg-[var(--bg-page)] overflow-hidden text-left shadow-none transition-all">
          
          {/* Box Header: Dot-Matrix Texture Canvas */}
          <div className="dot-matrix-canvas p-6 sm:p-8 border-b border-[var(--border-default)] relative bg-[var(--bg-page)]">
            <div className="space-y-2 max-w-2xl">
              <h2 className="text-xl sm:text-2xl font-medium text-[var(--text-primary)] tracking-tight">
                TrackXpense Privacy Policy &amp; User Rights
              </h2>
              
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Official privacy disclosures and user data rights for TrackXpense. Clear policies regarding local-first storage, zero behavioral tracking, optional cloud sync, and complete user sovereignty.
              </p>
            </div>

            {/* Quick Metadata & Filter Bar */}
            <div className="mt-6 pt-5 border-t border-[var(--border-default)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-left">
              <div className="text-[12px] text-[var(--text-muted)] flex items-center gap-2">
                <span>Effective Date: September 2026</span>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search policy..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-[28px] pl-7 pr-2.5 rounded-[6px] bg-[var(--bg-page)] border border-[var(--border-default)] focus:border-[var(--border-active)] text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Box Body: Continuous Singular Flow of Clauses (No row/columns) */}
          <div className="p-6 sm:p-10 space-y-12">
            {filteredSections.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-muted)] text-[13px] space-y-2">
                <p>No policy clauses matched "{searchQuery}".</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[#f6821f] hover:underline text-[12.5px] font-medium"
                >
                  Clear search query
                </button>
              </div>
            ) : (
              filteredSections.map((sec, idx) => (
                <article
                  key={sec.id}
                  id={sec.id}
                  className={`space-y-4 scroll-mt-20 ${
                    idx !== 0 ? 'pt-10 border-t border-[var(--border-default)]' : ''
                  }`}
                >
                  {/* Section Title & Header with Clean Deep-Link Affordance */}
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                          Section {sec.sectionNumber} • {sec.kicker}
                        </span>
                      </div>
                      <h3 className="text-[17px] font-medium text-[var(--text-primary)] tracking-tight">
                        {sec.title}
                      </h3>
                    </div>

                    {/* Copy Link Button (Clean font-mono, no icon clutter) */}
                    <button
                      type="button"
                      onClick={() => handleCopyLink(sec.id)}
                      className="h-[24px] px-2 rounded-[4px] border border-[var(--border-default)] hover:border-[var(--border-active)] bg-[var(--bg-page)] text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer self-start shrink-0 print:hidden"
                      title="Copy section link"
                    >
                      {copiedId === sec.id ? (
                        <span className="text-emerald-500 font-medium">Copied</span>
                      ) : (
                        <span>#link</span>
                      )}
                    </button>
                  </div>

                  {/* Summary Callout */}
                  <p className="text-[13.5px] font-medium text-[var(--text-primary)] leading-relaxed bg-[var(--bg-page)] p-3.5 rounded-[6px] border border-[var(--border-default)]">
                    {sec.summary}
                  </p>

                  {/* Detailed Paragraphs */}
                  <div className="space-y-3 text-[13px] text-[var(--text-secondary)] leading-relaxed">
                    {sec.paragraphs.map((p, pIdx) => (
                      <p key={pIdx}>{p}</p>
                    ))}
                  </div>

                  {/* Bullet Points List */}
                  {sec.bulletPoints && sec.bulletPoints.length > 0 && (
                    <div className="pt-2 space-y-2.5">
                      {sec.bulletPoints.map((b, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
                          <span className="text-[var(--text-muted)] text-[12px] select-none pt-0.5 font-mono">
                            •
                          </span>
                          <div>
                            <strong className="text-[var(--text-primary)] font-medium mr-1.5">
                              {b.label}:
                            </strong>
                            <span className="text-[var(--text-secondary)]">
                              {b.text}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                </article>
              ))
            )}
          </div>

          {/* Box Bottom Bar: Compliance & Export Callout */}
          <div className="p-6 bg-[var(--bg-page)] border-t border-[var(--border-default)] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="space-y-0.5">
              <h4 className="text-[13.5px] font-medium text-[var(--text-primary)]">
                Have specific audit, data portability, or deletion requests?
              </h4>
              <p className="text-[12px] text-[var(--text-secondary)]">
                You can export all ledger records directly to JSON or CSV anytime under Profile &amp; Settings.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate ? onNavigate('identity') : navigateTo('identity')}
              className="h-[32px] px-4 rounded-[6px] border border-[var(--border-default)] hover:border-[var(--border-active)] bg-[var(--bg-page)] hover:bg-white/5 text-[12px] font-medium text-[var(--text-primary)] transition-colors cursor-pointer shrink-0 print:hidden"
            >
              Manage Data &amp; Export
            </button>
          </div>

          </div>
        </div>

      </main>

      {/* ========================================================================= */}
      {/* 4. CLEAN SYSTEM FOOTER                                                    */}
      {/* ========================================================================= */}
      <footer className="w-full shrink-0 border-t border-[var(--border-default)] py-6 px-4 sm:px-8 text-center text-[12px] text-[var(--text-muted)] bg-[var(--bg-page)] mt-auto print:hidden">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img 
              src="/icon.png" 
              alt="TrackXpense" 
              className="w-4 h-4 rounded-[3px] shrink-0 opacity-80" 
            />
            <span>&copy; {new Date().getFullYear()} TrackXpense. Local-first financial ledger.</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[12px]">
            <span className="text-[var(--text-primary)] font-medium">
              Privacy Policy
            </span>
            <span>•</span>
            <button 
              onClick={() => navigateTo('security-policy')} 
              className="hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              Security Policy
            </button>
            <span>•</span>
            <button 
              onClick={() => navigateTo('terms-of-service')} 
              className="hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <span>•</span>
            <a 
              href="mailto:bakarkhaniii364@gmail.com" 
              className="hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              Contact
            </a>
            <span>•</span>
            <button 
              onClick={() => onNavigate ? onNavigate('dashboard') : navigateTo('dashboard')} 
              className="hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              Open App
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
};
