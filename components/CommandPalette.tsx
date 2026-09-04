import React, { useState, useEffect, useRef } from 'react';
import {
  MagnifyingGlass as Search,
  SquaresFour as LayoutGrid,
  Pulse as Activity,
  TrendUp as TrendingUp,
  ArrowDownRight,
  HandCoins,
  Calendar,
  UserCircle,
  Fingerprint,
  Plus,
  CaretRight as ChevronRight,
  Wallet as WalletIcon,
  Sliders,
  Check,
  Prohibit as Ban,
  Lightning as Zap
} from '@phosphor-icons/react';
import { AiStarIcon as Sparkles } from './shared/AiStarIcon';
import { SpotifyIcon } from './shared/SpotifyIcon';
import { AppData, ViewState, TransactionType } from '../types';
import { parseTransactionWithAI, AIParsedTransaction } from '../services/aiService';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  onViewChange: (v: ViewState) => void;
  onQuickAdd: (type: TransactionType, data: { amount: number, category: string, note?: string }) => void;
  onTogglePrivacy: () => void;
  onSelectWallet?: (walletId: string) => void;
  onOpenRabbAi?: (q: { text: string }) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  data,
  onViewChange,
  onQuickAdd,
  onTogglePrivacy,
  onSelectWallet,
  onOpenRabbAi
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [aiResult, setAiResult] = useState<AIParsedTransaction | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // General Navigation Commands
  const navCommands = [
    { id: 'dash', label: 'Dashboard Overview', icon: LayoutGrid, action: () => onViewChange('dashboard'), section: 'Navigation' },
    { id: 'hist', label: 'Transactions & Ledger', icon: Activity, action: () => onViewChange('history'), section: 'Navigation' },
    { id: 'anal', label: 'Financial Analytics', icon: TrendingUp, action: () => onViewChange('analytics'), section: 'Navigation' },
    { id: 'debt', label: 'Debts & Loans', icon: HandCoins, action: () => onViewChange('debts'), section: 'Navigation' },
    { id: 'ctrl', label: 'Budgets & Categories', icon: Sliders, action: () => onViewChange('control'), section: 'Navigation' },
    { id: 'prov', label: 'Upcoming Bills & Provisions', icon: Calendar, action: () => onViewChange('provisions'), section: 'Navigation' },
    { id: 'subs', label: 'Subscriptions & Recurring', icon: SpotifyIcon, action: () => onViewChange('subscriptions'), section: 'Navigation' },
    { id: 'sett', label: 'Profile & Account Settings', icon: UserCircle, action: () => onViewChange('identity'), section: 'Navigation' },
    { id: 'priv', label: 'Toggle Privacy Mode', icon: Fingerprint, action: onTogglePrivacy, section: 'Security' },
  ];

  // Quick Wallet Switching Commands
  const walletCommands = (data.wallets || []).map(w => ({
    id: `wallet-${w.id}`,
    label: `Switch to ${w.name}${w.id === data.currentWalletId ? ' (Active)' : ''}`,
    icon: WalletIcon,
    isActive: w.id === data.currentWalletId,
    action: () => {
      if (onSelectWallet) onSelectWallet(w.id);
    },
    section: 'Wallets'
  }));

  // Asynchronous Groq AI parsing with debounce
  useEffect(() => {
    if (!query.trim()) {
      setAiResult(null);
      setIsAiLoading(false);
      return;
    }

    setIsAiLoading(true);
    const categoryNames = (data.categories || []).map(c => c.name);

    const timer = setTimeout(async () => {
      const parsed = await parseTransactionWithAI(query, categoryNames);
      setAiResult(parsed);
      setIsAiLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [query, data.categories]);

  const filteredNav = navCommands.filter(c => 
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.section.toLowerCase().includes(query.toLowerCase())
  );

  const filteredWallets = walletCommands.filter(w =>
    w.label.toLowerCase().includes(query.toLowerCase()) ||
    'wallets'.includes(query.toLowerCase())
  );

  // Construct quick add / AI result section
  const quickEntrySection = [];

  if (isAiLoading && query.trim().length > 3) {
    quickEntrySection.push({
      id: 'ai-loading',
      label: 'Processing command...',
      icon: Sparkles,
      action: () => {},
      section: 'Actions'
    });
  } else if (aiResult) {
    if (aiResult.isDenial) {
      quickEntrySection.push({
        id: 'ai-denial',
        label: `Denial Detected: "I didn't spend/earn"`,
        subtitle: `Got it, will not log this transaction (${query})`,
        icon: Ban,
        action: () => onClose(),
        section: 'Actions',
        isDenial: true
      });
    } else if (aiResult.isValid && aiResult.amount !== null) {
      quickEntrySection.push({
        id: 'ai-quick-add',
        label: `Log ${aiResult.type === TransactionType.INCOME ? '+' : ''}${data.settings.currencySymbol || '$'}${aiResult.amount} under ${aiResult.category}`,
        subtitle: `Description: ${aiResult.description}`,
        icon: Zap,
        action: () => {
          onQuickAdd(aiResult.type, { 
            amount: aiResult.amount!, 
            category: aiResult.category,
            note: aiResult.description
          });
          onClose();
        },
        section: 'Actions',
        isAi: true
      });
    }
  }

  // Offer direct assistant query if user typed something that isn't a simple navigation match
  if (query.trim() && !aiResult?.isValid) {
    quickEntrySection.push({
      id: 'ask-rabbai',
      label: `Search or run: "${query.trim()}"`,
      subtitle: 'Execute transaction instruction or search query',
      icon: Sparkles,
      action: () => {
        if (onOpenRabbAi) {
          onOpenRabbAi({ text: query.trim() });
        } else {
          onViewChange('rabbai');
        }
      },
      section: 'Actions'
    });
  }

  const results = [
    ...quickEntrySection,
    ...filteredNav,
    ...filteredWallets
  ];

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setAiResult(null);
      setTimeout(() => inputRef.current?.focus(), 15);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].action();
        onClose();
      } else if (query.trim()) {
        if (onOpenRabbAi) {
          onOpenRabbAi({ text: query.trim() });
        } else {
          onViewChange('rabbai');
        }
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  // Group results by section
  const sectionsMap = new Map<string, typeof results>();
  results.forEach(item => {
    const list = sectionsMap.get(item.section) || [];
    list.push(item);
    sectionsMap.set(item.section, list);
  });

  let globalIndexCounter = 0;

  return (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[12vh] px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-150" 
        onClick={onClose} 
        aria-hidden="true"
      />
      
      {/* Modal Shell */}
      <div 
        role="dialog" 
        aria-modal="true" 
        aria-label="Command Palette"
        className="relative w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[10px] shadow-2xl overflow-hidden flex flex-col z-10 text-[var(--text-primary)]"
      >
        {/* Top Input Bar */}
        <div className="h-[48px] px-4 flex items-center gap-3 border-b border-[var(--border-default)] shrink-0">
          <Search size={16} className="text-[var(--text-muted)] shrink-0 stroke-[1.5px]" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Type 'I didn't spend 200 on coffee', jump to view, or switch wallet..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-[13px] font-normal text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
          <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-default)]">
            Cmd/Ctrl K
          </span>
          <button 
            onClick={onClose}
            className="px-1.5 py-0.5 rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-subtle)]/50 text-[10px] text-[var(--text-muted)] font-mono hover:text-[var(--text-primary)] transition-colors"
          >
            Esc
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2 no-scrollbar">
          {results.length > 0 ? (
            Array.from(sectionsMap.entries()).map(([sectionName, items]) => (
              <div key={sectionName} className="mb-2 last:mb-0">
                <h3 className="px-3 pt-2 pb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)] flex items-center gap-1.5">
                  {sectionName === 'RabbAi Intelligence' && <Zap size={12} className="text-amber-400" />}
                  {sectionName}
                </h3>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const currentIndex = globalIndexCounter++;
                    const isSelected = currentIndex === selectedIndex;
                    const isWalletActive = (item as any).isActive;
                    const isDenial = (item as any).isDenial;

                    return (
                      <button
                        key={item.id}
                        onClick={() => { item.action(); onClose(); }}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={`w-full h-[40px] px-3 flex items-center justify-between rounded-[6px] transition-colors text-left text-[13px] ${
                          isDenial
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : isSelected 
                              ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)]' 
                              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <item.icon size={15} className={`${isDenial ? 'text-rose-400' : 'text-[var(--text-muted)]'} shrink-0 stroke-[1.5px]`} />
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-[var(--text-primary)] truncate">{item.label}</span>
                            {(item as any).subtitle && (
                              <span className="text-[11px] text-[var(--text-muted)] font-normal truncate">{(item as any).subtitle}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isWalletActive && (
                            <span className="pill pill--success text-[10px] py-0.5 px-2 flex items-center gap-1">
                              <Check size={10} /> Active
                            </span>
                          )}
                          {isSelected && (
                            <ChevronRight size={14} className="text-[var(--text-muted)] shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
              <Sparkles size={20} className="stroke-[1.5px] opacity-60" />
              <p className="text-[12px]">No matching action or query found</p>
            </div>
          )}

          {/* Search tips section if no query */}
          {query.trim() === '' && (
            <div className="mt-2 pt-2 border-t border-[var(--border-default)]/40 px-3 pb-1">
              <h3 className="text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] mb-1.5 flex items-center gap-1">
                <Zap size={11} className="text-amber-400" /> Quick Entry & Search Examples
              </h3>
              <div className="space-y-1 text-[12px] text-[var(--text-muted)]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[var(--text-primary)]">"Spent 200 on coffee today"</span>
                  <span>— extracts $200, Expense, Coffee</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[var(--text-primary)]">"I didn't spend 200 on coffee"</span>
                  <span>— detects negation & cancels logging</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[var(--text-primary)]">"Received 1500 freelance payment"</span>
                  <span>— records $1,500 income</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-4 py-2 bg-[var(--bg-subtle)]/40 border-t border-[var(--border-default)] flex items-center justify-between text-[11px] text-[var(--text-muted)] shrink-0">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-[10px] font-mono">↑</kbd>
              <kbd className="px-1 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-[10px] font-mono">↓</kbd>
              <span className="ml-1">to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-default)] text-[10px] font-mono">↵</kbd>
              <span className="ml-1">to select</span>
            </span>
          </div>
          <span className="text-[10px] font-mono text-[var(--text-muted)] opacity-70">
            Esc to close
          </span>
        </div>
      </div>
    </div>
  );
};
