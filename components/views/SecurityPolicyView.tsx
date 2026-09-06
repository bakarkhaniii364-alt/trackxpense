import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  Cpu, 
  ArrowRight, 
  MagnifyingGlass as Search,
  ArrowSquareOut
} from '@phosphor-icons/react';
import { ViewState } from '../../types';
import { navigateTo } from '../../src/services/router';

interface SecurityPolicyViewProps {
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

export const SecurityPolicyView: React.FC<SecurityPolicyViewProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'Security Policy | TrackXpense';
    return () => {
      document.title = originalTitle;
    };
  }, []);

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
    const url = `${window.location.origin}/security#${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const securitySections: PolicySection[] = [
    {
      id: 'threat-model',
      sectionNumber: '01',
      kicker: 'Defensive Architecture',
      title: 'Threat Model & Zero-Trust Client Sandbox',
      summary: 'Our security architecture treats centralized remote servers as high-risk breach targets. TrackXpense places your primary security boundary directly on your local hardware.',
      paragraphs: [
        'TrackXpense was engineered by an independent student developer following modern Zero-Trust architectural principles. Centralized fintech platforms holding millions of consumer financial records present massive honeypots for data breaches, ransomware, and insider threats.',
        'To fundamentally eliminate this attack surface, TrackXpense establishes your physical machine as the primary security perimeter. In default local mode, financial ledger calculations, database indexing, and historical projections occur entirely inside your browser’s isolated client sandbox. We cannot leak or lose data our servers never receive.'
      ],
      bulletPoints: [
        {
          label: 'Isolated Client Sandbox',
          text: 'Core financial computing and persistence execute within your browser’s protected execution environment.'
        },
        {
          label: 'Honeypot Elimination',
          text: 'Zero central aggregation of offline user financial accounts or transaction ledgers.'
        },
        {
          label: 'Reduced Attack Surface',
          text: 'Eliminates cloud breach and infrastructure leak vectors for all offline and guest-mode financial logs.'
        }
      ]
    },
    {
      id: 'transport-edge',
      sectionNumber: '02',
      kicker: 'Network & Edge Defense',
      title: 'Transport Encryption (TLS 1.3) & Edge DDoS Mitigation',
      summary: 'All network transmissions enforce modern TLS 1.3 encryption with forward secrecy, shielded by enterprise edge DDoS mitigation and HSTS.',
      paragraphs: [
        'Whenever TrackXpense communicates across the network—such as delivering application web assets or executing optional cloud sync—connections are mandated over HTTPS using Transport Layer Security (TLS 1.3 with modern TLS 1.2 fallback). Legacy SSL and insecure early TLS ciphers are categorically disabled.',
        'Our web distribution is shielded by enterprise edge infrastructure that absorbs volumetric Layer 3/4 and Layer 7 DDoS attacks. HTTP Strict Transport Security (HSTS) and secure HTTP response headers prevent SSL-stripping and man-in-the-middle attacks.'
      ],
      bulletPoints: [
        {
          label: 'Enforced HTTPS / HSTS',
          text: 'All web traffic mandates encrypted HTTPS; insecure downgrade attempts are rejected automatically.'
        },
        {
          label: 'Forward Secrecy Ciphers',
          text: 'Modern ephemeral key exchange ensures past traffic cannot be retroactively decrypted if keys are compromised.'
        },
        {
          label: 'Volumetric DDoS Shield',
          text: 'Enterprise-grade edge networks absorb and filter malicious traffic spikes automatically.'
        }
      ]
    },
    {
      id: 'cloud-row-security',
      sectionNumber: '03',
      kicker: 'Cloud Infrastructure',
      title: 'Database Row-Level Security (RLS) & Multi-Tenant Isolation',
      summary: 'If you opt into multi-device synchronization, database access is strictly isolated at the PostgreSQL database engine level via granular Row-Level Security.',
      paragraphs: [
        'For users who explicitly register an account to sync their ledger across multiple devices, remote database transactions are protected by engine-level Row-Level Security (RLS) policies.',
        'Under this architecture, every SQL operation verifies the cryptographically signed JWT authentication token of the active user session. Even if an adversary attempts unauthorized queries against API endpoints, the database engine itself categorically forbids any session from reading, updating, or deleting records belonging to another account ID.'
      ],
      bulletPoints: [
        {
          label: 'Engine-Enforced RLS',
          text: 'Authorization rules are enforced at the database engine level, not merely in application code.'
        },
        {
          label: 'Cryptographic Session Tokens',
          text: 'Short-lived JWT tokens signed with secure asymmetric keys authenticate every sync action.'
        },
        {
          label: 'Zero Public Read Tables',
          text: 'User transaction tables have zero public read or write permissions enabled.'
        }
      ]
    },
    {
      id: 'passcode-vault',
      sectionNumber: '04',
      kicker: 'Access Control',
      title: 'On-Device Passcode Vault & Memory Defense',
      summary: 'Built-in PIN protection guards against physical inspection, workplace shoulder-surfing, and unauthorized local access with salted key verification.',
      paragraphs: [
        'To defend your financial records against physical inspection on shared family computers, workplace workstations, or public transit, TrackXpense incorporates an on-device passcode vault.',
        'When enabled, your passcode is verified locally using salted cryptographic hashes. The raw plaintext passcode is never stored in persistent browser storage, and the application interface is locked immediately upon session timeout or manual lock invocation.'
      ],
      bulletPoints: [
        {
          label: 'Salted Passcode Verification',
          text: 'Passcode validation uses random unique salt values to guard against rainbow table inspection.'
        },
        {
          label: 'Zero Server Custody',
          text: 'Your vault passcode never leaves your device; we possess no recovery backdoor.'
        },
        {
          label: 'Shoulder-Surfing Defense',
          text: 'Privacy Mode immediately masks currency totals and account numbers with blur filters.'
        }
      ]
    },
    {
      id: 'vulnerability-disclosure',
      sectionNumber: '05',
      kicker: 'Coordinated Disclosure',
      title: 'Coordinated Vulnerability Disclosure & Security Inquiries',
      summary: 'We welcome ethical security research. Here is our direct disclosure procedure, 48-hour acknowledgment commitment, and safe harbor policy.',
      paragraphs: [
        'As an independent student-led engineering project, TrackXpense is dedicated to transparent, responsible security governance. We deeply appreciate the contributions of ethical security researchers who help identify potential vulnerabilities.',
        'If you discover a security vulnerability, we request that you give us an opportunity to remediate the issue prior to public disclosure. We commit to acknowledging receipt of verified reports within 48 hours and providing transparent status updates as fixes are deployed.'
      ],
      bulletPoints: [
        {
          label: 'Official Security Contact',
          text: 'bakarkhaniii364@gmail.com'
        },
        {
          label: 'Response Commitment',
          text: 'Initial acknowledgment of verified vulnerability reports within 48 business hours.'
        },
        {
          label: 'Safe Harbor',
          text: 'We will not pursue legal action against researchers acting in good faith who avoid data destruction and respect user privacy.'
        }
      ]
    }
  ];

  const filteredSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return securitySections;
    return securitySections.filter(sec => 
      sec.title.toLowerCase().includes(q) ||
      sec.summary.toLowerCase().includes(q) ||
      sec.kicker.toLowerCase().includes(q) ||
      sec.paragraphs.some(p => p.toLowerCase().includes(q)) ||
      sec.bulletPoints?.some(b => b.label.toLowerCase().includes(q) || b.text.toLowerCase().includes(q))
    );
  }, [securitySections, searchQuery]);

  return (
    <div 
      id="security-scroll-container"
      className="w-full h-[100dvh] max-h-[100dvh] overflow-y-auto overflow-x-hidden bg-[var(--bg-page)] text-[var(--text-primary)] font-sans flex flex-col selection:bg-[var(--accent-solid)] selection:text-[var(--accent-text)]"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--border-strong) transparent'
      }}
    >
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER                                                             */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 w-full h-[52px] bg-[var(--bg-page)] border-b border-[var(--border-default)] px-4 sm:px-8 flex items-center justify-between shrink-0 print:hidden">
        
        {/* Left: <logo> Security Policy */}
        <div className="flex items-center gap-2.5">
          <img 
            src="/icon.png" 
            alt="TrackXpense" 
            className="w-6 h-6 rounded-full object-contain shrink-0 select-none pointer-events-none" 
          />
          <span className="text-[13.5px] font-medium text-[var(--text-primary)] tracking-tight">
            Security Policy
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
      {/* 2. HERO SECTION                                                           */}
      {/* ========================================================================= */}
      <section 
        className="w-full shrink-0 border-b border-[var(--border-default)] py-12 sm:py-16 px-4 sm:px-8 relative overflow-hidden print:hidden"
        style={{
          backgroundImage: 'repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.075) 0px, rgba(255, 255, 255, 0.075) 1.25px, transparent 1.25px, transparent 10px)'
        }}
      >
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
          
          {/* Left Column: Heading, Subtitle & Pills */}
          <div className="space-y-4 max-w-2xl text-left">
            <h2 className="text-2xl sm:text-3xl font-medium text-[var(--text-primary)] tracking-tight">
              Security Architecture &amp; Controls
            </h2>
            <p className="text-[13.5px] sm:text-[14px] text-[var(--text-secondary)] leading-relaxed max-w-xl">
              Technical security specifications covering Zero-Trust client isolation, TLS 1.3 transit encryption, database row-level security, and coordinated vulnerability response.
            </p>

            {/* Pill Row */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="h-[28px] px-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-page)] text-[12px] text-[var(--text-secondary)] flex items-center">
                <span>Zero-Trust Sandbox</span>
              </div>
              <div className="h-[28px] px-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-page)] text-[12px] text-[var(--text-secondary)] flex items-center">
                <span>TLS 1.3 &amp; RLS</span>
              </div>
              <button
                type="button"
                onClick={() => navigateTo('privacy-policy')}
                className="h-[28px] px-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-page)] hover:bg-[var(--bg-surface-hover)] hover:border-[var(--border-active)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Privacy Policy</span>
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

          {/* Right Column: Signature Trio of Badges (Security Motifs: Shield, Lock, Key) */}
          <div className="relative flex items-center justify-center md:justify-end shrink-0 py-4 pr-4">
            <div className="relative w-[180px] h-[100px] flex items-center justify-center select-none pointer-events-none">
              
              {/* Badge 1: Lock */}
              <div 
                className="absolute left-2 top-3 w-[46px] h-[46px] rounded-[14px] border border-dashed border-[#f6821f]/60 bg-[#f6821f]/10 flex items-center justify-center transition-transform hover:scale-105"
                style={{ transform: 'rotate(-12deg)' }}
              >
                <Lock size={22} strokeWidth={1.5} className="text-[#f6821f]" />
              </div>

              {/* Badge 2: Shield */}
              <div 
                className="absolute left-[66px] top-0 w-[48px] h-[48px] rounded-[14px] border border-dashed border-[#f6821f]/70 bg-[#f6821f]/12 flex items-center justify-center transition-transform hover:scale-105 z-10"
                style={{ transform: 'rotate(4deg)' }}
              >
                <ShieldCheck size={22} strokeWidth={1.5} className="text-[#f6821f]" />
              </div>

              {/* Badge 3: Key */}
              <div 
                className="absolute right-2 top-5 w-[46px] h-[46px] rounded-[14px] border border-dashed border-[#f6821f]/60 bg-[#f6821f]/10 flex items-center justify-center transition-transform hover:scale-105"
                style={{ transform: 'rotate(15deg)' }}
              >
                <Key size={20} strokeWidth={1.5} className="text-[#f6821f]" />
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT: SINGULAR SECURITY BOX                                    */}
      {/* ========================================================================= */}
      <main className="w-full shrink-0 max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
        
        {/* THE SINGULAR BOX WITH TECHNICAL CORNER NODES */}
        <div className="relative">
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
                Technical Security Architecture &amp; Controls
              </h2>
              
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Comprehensive engineering documentation covering client-side data isolation, cryptographic transit standards, row-level access control, and vulnerability governance.
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
                  placeholder="Search security controls..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-[28px] pl-7 pr-2.5 rounded-[6px] bg-[var(--bg-page)] border border-[var(--border-default)] focus:border-[var(--border-active)] text-[12px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Box Body: Continuous Singular Flow of Clauses */}
          <div className="p-6 sm:p-10 space-y-12">
            {filteredSections.length === 0 ? (
              <div className="p-12 text-center text-[var(--text-muted)] text-[13px] space-y-2">
                <p>No security clauses matched "{searchQuery}".</p>
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

                    {/* Copy Link Button */}
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

          {/* Box Bottom Bar: Security Contact & Audit Callout */}
          <div className="p-6 bg-[var(--bg-page)] border-t border-[var(--border-default)] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="space-y-0.5">
              <h4 className="text-[13.5px] font-medium text-[var(--text-primary)]">
                Have questions or a coordinated vulnerability report?
              </h4>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Contact the project developer directly at bakarkhaniii364@gmail.com.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate ? onNavigate('identity') : navigateTo('identity')}
              className="h-[32px] px-4 rounded-[6px] border border-[var(--border-default)] hover:border-[var(--border-active)] bg-[var(--bg-page)] hover:bg-white/5 text-[12px] font-medium text-[var(--text-primary)] transition-colors cursor-pointer shrink-0 print:hidden"
            >
              Security Settings
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
            <button 
              onClick={() => navigateTo('privacy-policy')} 
              className="hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <span>•</span>
            <span className="text-[var(--text-primary)] font-medium">
              Security Policy
            </span>
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
