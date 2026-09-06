import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Sparkle, 
  ArrowRight, 
  MagnifyingGlass as Search,
  Check,
  Copy
} from '@phosphor-icons/react';
import { ViewState } from '../../types';
import { navigateTo } from '../../src/services/router';

interface PolicyPortalViewProps {
  mode: 'privacy' | 'security';
  onNavigate?: (view: ViewState) => void;
}

interface SpecItem {
  id: string;
  category: string;
  title: string;
  summary: string;
  technicalDetails: string[];
  badges: string[];
}

export const PolicyPortalView: React.FC<PolicyPortalViewProps> = ({ mode, onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const isPrivacy = mode === 'privacy';

  const handleSwitchMode = (newMode: 'privacy' | 'security') => {
    setSelectedCategory('all');
    setSearchQuery('');
    if (newMode === 'privacy') {
      window.open('/privacy', '_blank');
    } else {
      navigateTo('security-policy');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}${isPrivacy ? '/privacy-policy' : '/security-policy'}#${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Privacy Specifications
  const privacySpecs: SpecItem[] = [
    {
      id: 'local-first-storage',
      category: 'Client Storage',
      title: 'Local-First Sandboxed IndexedDB',
      summary: 'All financial logs, accounts, transactions, and categories live in your local browser sandbox.',
      technicalDetails: [
        'TrackXpense uses the HTML5 IndexedDB standard. Financial records exist exclusively inside your device origin storage.',
        'Guest mode functions 100% offline without communicating with external cloud endpoints.',
        'Data remains persistent on your physical machine until you explicitly clear browser site data or trigger an export.'
      ],
      badges: ['IndexedDB', 'Local Storage', 'Zero Cloud Leak']
    },
    {
      id: 'zero-bank-aggregators',
      category: 'Client Storage',
      title: 'Zero Third-Party Financial Aggregators',
      summary: 'We never partner with data brokers or request bank login credentials.',
      technicalDetails: [
        'No Plaid, Yodlee, MX, or equivalent scraper integrations are built into or loaded by the application.',
        'Your online banking credentials, routing codes, debit card numbers, and PINs are never requested or stored.',
        'All ledger reconciliation is performed via manual input, CSV/JSON import, or user-approved local parsing.'
      ],
      badges: ['Zero Aggregators', 'Direct Ownership', 'Plaid-Free']
    },
    {
      id: 'zero-telemetry',
      category: 'Telemetry & Tracking',
      title: 'Zero Behavioral Tracking & Telemetry Beacons',
      summary: 'No Google Analytics, Meta Pixels, user session recording, or third-party advertising scripts.',
      technicalDetails: [
        'Network inspection confirms zero background beacons, fingerprinting libraries, or tracking pixels.',
        'User transaction volume, velocity, spending categories, and wallet balances are never reported to analytics servers.',
        'Strict Content Security Policy (CSP) restricts external script execution.'
      ],
      badges: ['No Analytics', 'No Pixels', 'Zero Ads']
    },
    {
      id: 'data-ownership-portability',
      category: 'Data Rights',
      title: 'Full Data Portability & Export Autonomy',
      summary: 'Export your entire financial database at any second in standard JSON or CSV formats.',
      technicalDetails: [
        'Full database dumps are accessible under Profile & Settings with zero throttling or artificial restrictions.',
        'Exports adhere to transparent JSON schemas and standard CSV formats compatible with Excel, Google Sheets, or custom Python scripts.',
        'One-click local wipe permanently purges records from IndexedDB immediately.'
      ],
      badges: ['JSON Export', 'CSV Support', 'GDPR Art. 20']
    },
    {
      id: 'rabbai-privacy',
      category: 'AI Processing',
      title: 'RabbAi Privacy & Zero-Retention Processing',
      summary: 'Financial inputs analyzed via RabbAi operate under strict zero-training, ephemeral boundaries.',
      technicalDetails: [
        'AI queries are processed strictly for real-time extraction and receipt parsing without model retraining.',
        'BYOK (Bring Your Own Key) mode allows direct API requests using your personal Groq or Gemini API keys, bypassing any intermediary servers.',
        'Chat history can be cleared at any time with granular separation between conversation deletion and transaction ledger retention.'
      ],
      badges: ['BYOK Supported', 'Zero Retraining', 'Ephemeral']
    }
  ];

  // Security Specifications
  const securitySpecs: SpecItem[] = [
    {
      id: 'aes-vault-lock',
      category: 'Cryptography',
      title: 'AES-256 GCM Client-Side Vault Encryption',
      summary: 'Passcode-protected cryptographic vault using browser-native WebCrypto primitives.',
      technicalDetails: [
        'Key derivation leverages PBKDF2 with SHA-256 and high iteration counts to resist brute-force attacks.',
        'Encryption executes via AES-GCM (Galois/Counter Mode) with cryptographically random initialization vectors (IVs).',
        'When the vault is locked, database records cannot be deciphered without the master passcode.'
      ],
      badges: ['AES-256-GCM', 'PBKDF2', 'WebCrypto API']
    },
    {
      id: 'postgres-rls',
      category: 'Cloud Infrastructure',
      title: 'PostgreSQL Engine Row-Level Security (RLS)',
      summary: 'Database-enforced access policies prevent unauthorized cross-tenant queries at the database core.',
      technicalDetails: [
        'Every Supabase database table enforces Row-Level Security policies tied to the authenticated user UID.',
        'Cross-tenant reads, updates, or deletes are rejected by the PostgreSQL engine regardless of application client state.',
        'Anonymous and unauthenticated access to user records is blocked by default.'
      ],
      badges: ['PostgreSQL RLS', 'Supabase Auth', 'Zero Cross-Tenant']
    },
    {
      id: 'tls-strict-encryption',
      category: 'Network & Transport',
      title: 'TLS 1.3 Strict In-Transit Encryption',
      summary: 'All network transmissions enforce modern cipher suites with Perfect Forward Secrecy (PFS).',
      technicalDetails: [
        'Modern cryptographic handshakes exclusively utilize TLS 1.3 and TLS 1.2 with HSTS (HTTP Strict Transport Security) enabled.',
        'Legacy, compromised protocols (SSLv3, TLS 1.0, TLS 1.1) are permanently disabled at the edge.',
        'Data in transit is fully protected against eavesdropping, interception, and replay attacks.'
      ],
      badges: ['TLS 1.3', 'HSTS Enforced', 'Perfect Forward Secrecy']
    },
    {
      id: 'jwt-auth-rotation',
      category: 'Authentication',
      title: 'Cryptographic JWT Token Rotation & Session Revocation',
      summary: 'Short-lived access tokens combined with secure refresh cycles minimize authorization exposure.',
      technicalDetails: [
        'Authentication uses digitally signed JSON Web Tokens (JWT) with rapid expiration windows.',
        'Session termination immediately invalidates refresh tokens across all active tabs and devices.',
        'Session state is sandboxed and protected against common cross-site scripting (XSS) vectors.'
      ],
      badges: ['JWT Rotation', 'Secure Cookies', 'Instant Revocation']
    },
    {
      id: 'offline-sync-integrity',
      category: 'Cloud Infrastructure',
      title: 'Idempotent Sync Queue with UUID Collision Resistance',
      summary: 'Offline mutations use deterministic cryptographic UUIDs to guarantee consistency during reconnection.',
      technicalDetails: [
        'Mutations created while offline are queued locally with cryptographic UUIDv4 identifiers.',
        'Network reconnection verifies state integrity before reconciling database state, preventing duplicate records.',
        'Optimistic local updates provide zero latency while maintaining eventual consistency.'
      ],
      badges: ['Idempotency', 'UUIDv4', 'Conflict Resolution']
    }
  ];

  const currentSpecs = isPrivacy ? privacySpecs : securitySpecs;

  const categories = useMemo(() => {
    const cats = Array.from(new Set(currentSpecs.map(s => s.category)));
    return ['all', ...cats];
  }, [currentSpecs]);

  const filteredSpecs = useMemo(() => {
    return currentSpecs.filter(spec => {
      const matchesCat = selectedCategory === 'all' || spec.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCat;
      const matchesSearch = 
        spec.title.toLowerCase().includes(q) ||
        spec.summary.toLowerCase().includes(q) ||
        spec.badges.some(b => b.toLowerCase().includes(q)) ||
        spec.technicalDetails.some(d => d.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [currentSpecs, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen w-full bg-[var(--bg-page)] text-[var(--text-primary)] font-sans flex flex-col selection:bg-[var(--accent-solid)] selection:text-[var(--accent-text)]">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (EXACT DASHBOARD HEADER HEIGHT & STYLE WITHOUT SIDEBAR)    */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 w-full h-[52px] bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-4 sm:px-8 flex items-center justify-between shrink-0">
        
        {/* Left: TrackXpense Branding + Page Title */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => onNavigate ? onNavigate('dashboard') : navigateTo('dashboard')}
            className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
            title="Return to Dashboard"
          >
            <img 
              src="/icon.png" 
              alt="TrackXpense" 
              className="w-6 h-6 rounded-full object-contain shrink-0 select-none pointer-events-none" 
            />
            <span className="text-[13.5px] font-medium text-[var(--text-primary)] tracking-tight">
              TrackXpense
            </span>
          </div>

          <span className="text-[var(--border-default)] text-[13px] select-none">/</span>

          <div className="flex items-center gap-1.5">
            {isPrivacy ? (
              <ShieldCheck size={16} className="text-[var(--text-muted)] stroke-[1.5px]" />
            ) : (
              <Lock size={16} className="text-[var(--text-muted)] stroke-[1.5px]" />
            )}
            <h1 className="text-sm font-medium text-[var(--text-primary)] tracking-tight">
              {isPrivacy ? 'Privacy Policy' : 'Security Architecture'}
            </h1>
          </div>
        </div>

        {/* Right: Segmented Switcher, Ask RabbAi, and Open App */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Segmented Mode Selector */}
          <div className="flex items-center bg-[var(--bg-subtle)] p-0.5 rounded-[8px] border border-[var(--border-default)] text-[12px]">
            <button
              type="button"
              onClick={() => handleSwitchMode('privacy')}
              className={`px-3 py-1 rounded-[6px] transition-all cursor-pointer ${
                isPrivacy 
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium border border-[var(--border-default)] shadow-xs' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('security')}
              className={`px-3 py-1 rounded-[6px] transition-all cursor-pointer ${
                !isPrivacy 
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-medium border border-[var(--border-default)] shadow-xs' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Security Architecture
            </button>
          </div>

          {/* Ask RabbAi */}
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('rabbai') : navigateTo('rabbai')}
            className="hidden sm:flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1.5 rounded-[6px] hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Sparkle size={14} weight="fill" className="text-[#f6821f]" />
            <span>Ask RabbAi</span>
          </button>

          {/* Open App / Dashboard Button */}
          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('dashboard') : navigateTo('dashboard')}
            className="h-[32px] px-3.5 text-[12px] font-medium text-[var(--accent-text)] bg-[var(--accent-solid)] hover:opacity-90 active:scale-[0.98] rounded-[6px] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span>Open App</span>
            <ArrowRight size={13} weight="bold" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT (IDENTICAL DASHBOARD CONTAINER DENSITY & CARD STYLING)     */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        
        {/* Overview Banner Card */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[10px] p-6 sm:p-7 transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-2xl">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                {isPrivacy ? 'Privacy Framework' : 'Technical Security Standard'}
              </span>
              <h2 className="text-xl font-medium text-[var(--text-primary)] tracking-tight">
                {isPrivacy 
                  ? 'Private, Local-First Financial Ledger' 
                  : 'Zero-Knowledge Security Architecture'}
              </h2>
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                {isPrivacy 
                  ? 'TrackXpense is architected to prioritize user autonomy. Your transactions remain stored on your physical device, completely isolated from third-party data aggregators and advertising networks.'
                  : 'Our security posture combines client-side cryptographic locks, strict TLS 1.3 enforcement, PostgreSQL Row-Level Security, and ephemeral processing boundaries.'}
              </p>
            </div>

            {/* Live Guarantee Status Badges */}
            <div className="flex md:flex-col items-start gap-2 shrink-0">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-[var(--status-success-bg)] text-[var(--status-success-fg)] text-[11.5px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Zero Telemetry</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] text-[11.5px] font-mono">
                <span>IndexedDB Local</span>
              </div>
            </div>
          </div>

          {/* Quick Specifications Metadata Row */}
          <div className="mt-6 pt-5 border-t border-[var(--border-default)] grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div>
              <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">Storage Engine</div>
              <div className="text-[13px] font-medium text-[var(--text-primary)] mt-0.5 font-mono">IndexedDB / Local</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">Bank Scrapers</div>
              <div className="text-[13px] font-medium text-[var(--text-primary)] mt-0.5">0 Partners (None)</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">In-Flight Cipher</div>
              <div className="text-[13px] font-medium text-[var(--text-primary)] mt-0.5 font-mono">TLS 1.3 / AES-GCM</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">Document ID</div>
              <div className="text-[13px] font-medium text-[var(--text-primary)] mt-0.5 font-mono">
                {isPrivacy ? 'TX-PRIV-2026' : 'TX-SEC-2026'}
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls: Category Segmented Filter + Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Segmented Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`h-[30px] px-3 rounded-[6px] text-[12px] capitalize transition-all cursor-pointer shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] font-medium'
                    : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]'
                }`}
              >
                {cat === 'all' ? 'All Specifications' : cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search specifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-[32px] pl-8 pr-3 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-default)] focus:border-[var(--border-active)] text-[12.5px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors"
            />
          </div>
        </div>

        {/* Specifications Stacked List */}
        <div className="space-y-3">
          {filteredSpecs.length === 0 ? (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[10px] p-8 text-center text-[var(--text-muted)] text-[13px]">
              No specifications matched "{searchQuery}".
            </div>
          ) : (
            filteredSpecs.map((spec) => {
              const isExpanded = !!expandedItems[spec.id];
              return (
                <div 
                  key={spec.id}
                  id={spec.id}
                  className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] rounded-[10px] p-5 transition-all text-left space-y-3"
                >
                  {/* Item Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
                          {spec.category}
                        </span>
                        <span className="text-[var(--border-default)] select-none">•</span>
                        <h3 className="text-[14.5px] font-medium text-[var(--text-primary)] tracking-tight">
                          {spec.title}
                        </h3>
                      </div>
                      <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                        {spec.summary}
                      </p>
                    </div>

                    {/* Actions: Copy Link & Expand Details */}
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(spec.id)}
                        className="h-[28px] px-2.5 rounded-[6px] border border-[var(--border-default)] hover:border-[var(--border-active)] bg-[var(--bg-subtle)] text-[11.5px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Copy direct anchor link"
                      >
                        {copiedId === spec.id ? (
                          <>
                            <Check size={13} className="text-emerald-500" />
                            <span className="text-emerald-500 font-medium">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={13} strokeWidth={1.5} />
                            <span>Link</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleExpand(spec.id)}
                        className="h-[28px] px-2.5 rounded-[6px] border border-[var(--border-default)] hover:border-[var(--border-active)] bg-[var(--bg-subtle)] text-[11.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                      >
                        {isExpanded ? 'Hide Specs' : 'View Specs'}
                      </button>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {spec.badges.map((b, bIdx) => (
                      <span 
                        key={bIdx}
                        className="px-2 py-0.5 rounded-[4px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[11px] font-mono text-[var(--text-muted)]"
                      >
                        {b}
                      </span>
                    ))}
                  </div>

                  {/* Expanded Technical Details */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-[var(--border-default)] space-y-2 animate-in fade-in duration-150">
                      <span className="text-[11px] font-mono uppercase text-[var(--text-muted)] tracking-wider">
                        Technical Verifications
                      </span>
                      <ul className="space-y-1.5 list-disc pl-4 text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
                        {spec.technicalDetails.map((detail, dIdx) => (
                          <li key={dIdx}>{detail}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Guarantee Banner */}
        <div className="bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[10px] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-0.5">
            <h4 className="text-[13.5px] font-medium text-[var(--text-primary)]">
              Have specific compliance or auditing requirements?
            </h4>
            <p className="text-[12px] text-[var(--text-secondary)]">
              You can export complete transaction records and audit logs anytime directly from Profile &amp; Settings.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate ? onNavigate('identity') : navigateTo('identity')}
            className="h-[32px] px-4 rounded-[6px] border border-[var(--border-default)] hover:border-[var(--border-active)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] text-[12px] font-medium text-[var(--text-primary)] transition-colors cursor-pointer shrink-0"
          >
            Manage Data &amp; Export
          </button>
        </div>

      </main>

      {/* ========================================================================= */}
      {/* 3. CLEAN SYSTEM FOOTER                                                    */}
      {/* ========================================================================= */}
      <footer className="w-full border-t border-[var(--border-default)] py-5 px-4 sm:px-8 text-center text-[12px] text-[var(--text-muted)] bg-[var(--bg-surface)] mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span>&copy; {new Date().getFullYear()} TrackXpense. Local-first financial ledger.</span>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleSwitchMode('privacy')} 
              className={`transition-colors cursor-pointer ${isPrivacy ? 'text-[var(--text-primary)] font-medium' : 'hover:text-[var(--text-secondary)]'}`}
            >
              Privacy Policy
            </button>
            <span>•</span>
            <button 
              onClick={() => handleSwitchMode('security')} 
              className={`transition-colors cursor-pointer ${!isPrivacy ? 'text-[var(--text-primary)] font-medium' : 'hover:text-[var(--text-secondary)]'}`}
            >
              Security Architecture
            </button>
            <span>•</span>
            <button 
              onClick={() => onNavigate ? onNavigate('dashboard') : navigateTo('dashboard')} 
              className="hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              Dashboard
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
};
