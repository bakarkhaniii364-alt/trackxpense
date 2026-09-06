import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Scales, 
  Handshake, 
  ArrowRight, 
  MagnifyingGlass as Search,
  ArrowSquareOut
} from '@phosphor-icons/react';
import { ViewState } from '../../types';
import { navigateTo } from '../../src/services/router';

interface TermsOfServiceViewProps {
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

export const TermsOfServiceView: React.FC<TermsOfServiceViewProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'Terms of Service | TrackXpense';
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
    const url = `${window.location.origin}/terms#${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const termsSections: PolicySection[] = [
    {
      id: 'agreement-eligibility',
      sectionNumber: '01',
      kicker: 'Contract Formation',
      title: 'Binding Agreement & User Eligibility',
      summary: 'By accessing or using TrackXpense, you enter into a binding agreement under these Terms of Service. You represent that you are of legal age to manage personal finances.',
      paragraphs: [
        'By opening, downloading, accessing, or utilizing the TrackXpense web application or offline client, you enter into a legally binding agreement governed by these Terms of Service. If you do not agree to these terms unconditionally, you must immediately cease all access and utilization of the software.',
        'TrackXpense is intended for individuals of legal age to enter into binding contracts and manage their personal finances independently (minimum age 18, or the legal age of majority in your jurisdiction). By using the application, you represent and warrant that you satisfy these eligibility criteria.'
      ],
      bulletPoints: [
        {
          label: 'Legal Assent',
          text: 'Accessing or navigating TrackXpense constitutes full acceptance of these terms.'
        },
        {
          label: 'Age Requirement',
          text: 'Users must be at least 18 years old or legally emancipated to operate the software.'
        },
        {
          label: 'Independent Engineering',
          text: 'The software is an independently developed engineering utility maintained without venture backing.'
        }
      ]
    },
    {
      id: 'software-license',
      sectionNumber: '02',
      kicker: 'License & Data Title',
      title: 'Limited Software License & User Data Sovereignty',
      summary: 'You are granted a personal, revocable, non-exclusive license to use the software. You retain 100% unconditional ownership over all your financial data.',
      paragraphs: [
        'TrackXpense grants you a limited, revocable, non-exclusive, non-transferable, and non-sublicensable license to access and use the software interface solely for personal bookkeeping and expense tracking.',
        'All application code, interface styling, trademarks, logos, and visual assets are the intellectual property of the project maintainer. Crucially, this license does not grant the maintainer any rights over your private records: you retain sole, unconditional ownership of all financial transactions, categories, and account balances you enter.'
      ],
      bulletPoints: [
        {
          label: 'Personal License',
          text: 'Granted for individual and household expense organization without commercial redistribution rights.'
        },
        {
          label: 'Full User Data Ownership',
          text: 'The developer claims zero rights, licenses, or title to any financial entries you create.'
        },
        {
          label: 'Code & Brand Protection',
          text: 'Application software, visual branding, and assets remain protected under copyright law.'
        }
      ]
    },
    {
      id: 'acceptable-use',
      sectionNumber: '03',
      kicker: 'User Conduct',
      title: 'Acceptable Use Policy & Infrastructure Protections',
      summary: 'Users agree not to probe infrastructure vulnerabilities, execute denial-of-service attacks, bypass database tenant isolation, or inject malicious payloads.',
      paragraphs: [
        'You agree to use TrackXpense strictly in compliance with applicable local, national, and international laws. You agree not to misuse or abuse the software or its underlying distribution channels.',
        'Prohibited conduct includes: (a) attempting to probe, scan, or compromise host infrastructure; (b) launching denial-of-service (DDoS) attacks; (c) attempting to circumvent row-level database security to access other users’ synchronized records; (d) injecting malicious payloads through receipt upload utilities; or (e) utilizing automated bots to scrape or overload delivery endpoints.'
      ],
      bulletPoints: [
        {
          label: 'No Malicious Exploitation',
          text: 'Strict prohibition against vulnerability probing, port scanning, or infrastructure attacks.'
        },
        {
          label: 'No Credential Tampering',
          text: 'Prohibited from attempting unauthorized logins or token manipulation.'
        },
        {
          label: 'Fair Cloud Usage',
          text: 'Multi-device synchronization must not be abused for non-financial bulk storage.'
        }
      ]
    },
    {
      id: 'financial-disclaimer',
      sectionNumber: '04',
      kicker: 'Critical Disclaimer',
      title: 'No Financial, Tax, Investment, or Legal Advice',
      summary: 'TrackXpense is strictly a self-directed bookkeeping utility. It does not provide certified financial, tax, legal, or investment advice.',
      paragraphs: [
        'TRACKXPENSE IS A SELF-DIRECTED BOOKKEEPING TOOL AND SOFTWARE UTILITY. IT IS NOT A REGISTERED FINANCIAL ADVISOR, CERTIFIED PUBLIC ACCOUNTANT, BROKER-DEALER, OR TAX CONSULTANT.',
        'All visual metrics, budget charts, net worth snapshots, and expense category distributions are generated mechanically from user-entered figures. They do not constitute financial recommendations, investment advice, tax filings, or solvency audits. You are solely responsible for verifying the accuracy of your financial records and consulting certified professionals regarding real-world financial, tax, or debt obligations.'
      ],
      bulletPoints: [
        {
          label: 'Self-Directed Records',
          text: 'Calculations and visual summaries reflect user inputs without independent verification.'
        },
        {
          label: 'No Fiduciary Relationship',
          text: 'Using TrackXpense does not establish an advisory, fiduciary, or accounting relationship.'
        },
        {
          label: 'Professional Consultation',
          text: 'Consult licensed financial planners or accountants for legal, tax, or investment decisions.'
        }
      ]
    },
    {
      id: 'zero-fund-custody',
      sectionNumber: '05',
      kicker: 'Financial Operations',
      title: 'Zero Fund Custody & No Actual Banking Execution',
      summary: 'TrackXpense never holds real money, processes banking deposits, or executes transfers. Balances are self-reported informational figures only.',
      paragraphs: [
        'TrackXpense is not a bank, escrow agent, money transmitter, or custodial depository. The application never receives, stores, holds, transmits, or disburses real fiat currency, digital assets, or securities.',
        'All wallet figures, account totals, and debt ledgers within the software are virtual, informational representations manually logged or imported by the user. The software cannot initiate bank transfers, pay credit card bills, execute debit withdrawals, or settle debts in real life. All real-world debt repayments and funds movements must be conducted independently by you.'
      ],
      bulletPoints: [
        {
          label: 'Zero Real Money Custody',
          text: 'The platform possesses no custodial access to real financial assets or deposit accounts.'
        },
        {
          label: 'Informational Ledgers Only',
          text: 'Balances represent user self-reporting and do not interact with live banking rails.'
        },
        {
          label: 'Manual Real-World Settlement',
          text: 'All actual debt repayments and money transfers must be executed independently by you.'
        }
      ]
    },
    {
      id: 'warranty-liability',
      sectionNumber: '06',
      kicker: 'Warranties & Liability',
      title: 'Disclaimer of Warranties ("AS-IS") & Limitation of Liability',
      summary: 'The software is provided "as-is" without warranties of any kind. Liability for indirect, consequential, or data-loss damages is explicitly disclaimed and capped.',
      paragraphs: [
        'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, TRACKXPENSE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE. WE EXPRESSLY DISCLAIM ALL WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, ACCURACY, AND NON-INFRINGEMENT. YOU ARE ENCOURAGED TO ROUTINELY EXPORT LOCAL CSV/JSON BACKUPS.',
        'IN NO EVENT SHALL THE PROJECT MAINTAINER, DEVELOPER, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA LOSS, CORRUPTION OF STORAGE, OR FINANCIAL LOSSES RESULTING FROM USE OF THE SOFTWARE. TOTAL AGGREGATE LIABILITY SHALL IN ALL CIRCUMSTANCES BE CAPPED AT $10.00 USD.'
      ],
      bulletPoints: [
        {
          label: '"As-Is" Software Provision',
          text: 'Provided without guarantees regarding uninterrupted uptime or error-free calculation.'
        },
        {
          label: 'User Backup Obligation',
          text: 'You are solely responsible for exporting and preserving backups of your financial records.'
        },
        {
          label: 'Monetary Liability Cap',
          text: 'Maximum aggregate developer liability is capped at $10.00 USD under all circumstances.'
        }
      ]
    },
    {
      id: 'governing-law-contact',
      sectionNumber: '07',
      kicker: 'Modifications & Inquiries',
      title: 'Terms Modifications, Severability & Maintainer Contact',
      summary: 'Procedures for terms revisions over time, severability of provisions, and the official email address for legal questions.',
      paragraphs: [
        'We reserve the right to amend or update these Terms of Service at any time to reflect software changes or evolving legal standards. Updates will be published directly to this URL with a revised effective timestamp. Continued use of TrackXpense following the posting of revisions constitutes agreement to the modified terms.',
        'If any provision of these terms is deemed unenforceable or invalid by a court of competent jurisdiction, that specific provision shall be severed while the remaining provisions remain in full force and effect. For inquiries regarding these terms, please contact the project maintainer directly.'
      ],
      bulletPoints: [
        {
          label: 'Official Inquiries Contact',
          text: 'bakarkhaniii364@gmail.com'
        },
        {
          label: 'Effective Date',
          text: 'September 2026'
        },
        {
          label: 'Severability Protection',
          text: 'Unenforceable clauses are severed without invalidating remaining contractual protections.'
        }
      ]
    }
  ];

  const filteredSections = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return termsSections;
    return termsSections.filter(sec => 
      sec.title.toLowerCase().includes(q) ||
      sec.summary.toLowerCase().includes(q) ||
      sec.kicker.toLowerCase().includes(q) ||
      sec.paragraphs.some(p => p.toLowerCase().includes(q)) ||
      sec.bulletPoints?.some(b => b.label.toLowerCase().includes(q) || b.text.toLowerCase().includes(q))
    );
  }, [termsSections, searchQuery]);

  return (
    <div 
      id="terms-scroll-container"
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
        
        {/* Left: <logo> Terms of Service */}
        <div className="flex items-center gap-2.5">
          <img 
            src="/icon.png" 
            alt="TrackXpense" 
            className="w-6 h-6 rounded-full object-contain shrink-0 select-none pointer-events-none" 
          />
          <span className="text-[13.5px] font-medium text-[var(--text-primary)] tracking-tight">
            Terms of Service
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
          
          {/* Left Column: Heading, Subtitle & Clean Pills */}
          <div className="space-y-4 max-w-2xl text-left">
            <h2 className="text-2xl sm:text-3xl font-medium text-[var(--text-primary)] tracking-tight">
              Terms of Service &amp; User Agreement
            </h2>
            <p className="text-[13.5px] sm:text-[14px] text-[var(--text-secondary)] leading-relaxed max-w-xl">
              The legal agreement governing your use of TrackXpense. Clear rules regarding software licensing, user responsibilities, financial disclaimers, and liability limits.
            </p>

            {/* Pill Row */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <div className="h-[28px] px-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-page)] text-[12px] text-[var(--text-secondary)] flex items-center">
                <span>Personal License</span>
              </div>
              <div className="h-[28px] px-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-page)] text-[12px] text-[var(--text-secondary)] flex items-center">
                <span>No Financial Advice</span>
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
                onClick={() => navigateTo('security-policy')}
                className="h-[28px] px-3 rounded-full border border-[var(--border-default)] bg-[var(--bg-page)] hover:bg-[var(--bg-surface-hover)] hover:border-[var(--border-active)] text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Security Policy</span>
                <ArrowSquareOut size={11} className="opacity-70" />
              </button>
            </div>
          </div>

          {/* Right Column: Signature Trio of Badges (Legal Motifs: Scales, FileText, Handshake) */}
          <div className="relative flex items-center justify-center md:justify-end shrink-0 py-4 pr-4">
            <div className="relative w-[180px] h-[100px] flex items-center justify-center select-none pointer-events-none">
              
              {/* Badge 1: Scales */}
              <div 
                className="absolute left-2 top-3 w-[46px] h-[46px] rounded-[14px] border border-dashed border-[#f6821f]/60 bg-[#f6821f]/10 flex items-center justify-center transition-transform hover:scale-105"
                style={{ transform: 'rotate(-12deg)' }}
              >
                <Scales size={22} strokeWidth={1.5} className="text-[#f6821f]" />
              </div>

              {/* Badge 2: FileText */}
              <div 
                className="absolute left-[66px] top-0 w-[48px] h-[48px] rounded-[14px] border border-dashed border-[#f6821f]/70 bg-[#f6821f]/12 flex items-center justify-center transition-transform hover:scale-105 z-10"
                style={{ transform: 'rotate(4deg)' }}
              >
                <FileText size={22} strokeWidth={1.5} className="text-[#f6821f]" />
              </div>

              {/* Badge 3: Handshake */}
              <div 
                className="absolute right-2 top-5 w-[46px] h-[46px] rounded-[14px] border border-dashed border-[#f6821f]/60 bg-[#f6821f]/10 flex items-center justify-center transition-transform hover:scale-105"
                style={{ transform: 'rotate(15deg)' }}
              >
                <Handshake size={20} strokeWidth={1.5} className="text-[#f6821f]" />
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. MAIN CONTENT: SINGULAR TERMS BOX                                      */}
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
                Terms of Service &amp; User Agreement
              </h2>
              
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Legal terms governing use of the TrackXpense software, intellectual property licensing, no financial advice disclaimers, and mutual obligations.
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
                  placeholder="Search legal terms..."
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
                <p>No terms clauses matched "{searchQuery}".</p>
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

          {/* Box Bottom Bar: Legal Questions & Export Callout */}
          <div className="p-6 bg-[var(--bg-page)] border-t border-[var(--border-default)] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="space-y-0.5">
              <h4 className="text-[13.5px] font-medium text-[var(--text-primary)]">
                Have specific legal inquiries regarding these terms?
              </h4>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Reach out directly to the maintainer at bakarkhaniii364@gmail.com.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate ? onNavigate('identity') : navigateTo('identity')}
              className="h-[32px] px-4 rounded-[6px] border border-[var(--border-default)] hover:border-[var(--border-active)] bg-[var(--bg-page)] hover:bg-white/5 text-[12px] font-medium text-[var(--text-primary)] transition-colors cursor-pointer shrink-0 print:hidden"
            >
              Account Settings
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
            <button 
              onClick={() => navigateTo('security-policy')} 
              className="hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              Security Policy
            </button>
            <span>•</span>
            <span className="text-[var(--text-primary)] font-medium">
              Terms of Service
            </span>
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
