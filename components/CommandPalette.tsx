import React, { useState, useEffect, useRef } from 'react';
import { 
    Search, 
    Command, 
    Zap, 
    History, 
    PieChart, 
    LayoutGrid, 
    CreditCard,
    Fingerprint,
    Settings,
    ArrowRight,
    Plus,
    X
} from 'lucide-react';
import { AppData, ViewState, TransactionType } from '../types';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
    data: AppData;
    onViewChange: (v: ViewState) => void;
    onQuickAdd: (type: TransactionType, data: { amount: number, category: string, note?: string }) => void;
    onTogglePrivacy: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
    isOpen,
    onClose,
    data,
    onViewChange,
    onQuickAdd,
    onTogglePrivacy
}) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const commands = [
        { id: 'dash', label: 'Go to Dashboard', icon: LayoutGrid, action: () => onViewChange('dashboard'), section: 'Navigation' },
        { id: 'hist', label: 'Go to History', icon: History, action: () => onViewChange('history'), section: 'Navigation' },
        { id: 'anal', label: 'Go to Analytics', icon: PieChart, action: () => onViewChange('analytics'), section: 'Navigation' },
        { id: 'debt', label: 'Go to Debts', icon: CreditCard, action: () => onViewChange('debts'), section: 'Navigation' },
        { id: 'priv', label: 'Toggle Privacy Mode', icon: Fingerprint, action: onTogglePrivacy, section: 'Settings' },
        { id: 'sett', label: 'Go to Settings', icon: Settings, action: () => onViewChange('identity'), section: 'Navigation' },
    ];

    // Fuzzy Transaction Parsing: "50 lunch" or "100 salary"
    const parseQuickAdd = (q: string) => {
        const parts = q.split(' ');
        const amount = parseFloat(parts[0]);
        if (isNaN(amount)) return null;

        const categoryQuery = parts.slice(1).join(' ').toLowerCase();
        if (!categoryQuery) return null;

        const matchedCat = data.categories.find(c => c.name.toLowerCase().includes(categoryQuery));
        if (!matchedCat) return null;

        return {
            amount,
            category: matchedCat.name,
            type: matchedCat.type
        };
    };

    const quickAddResult = parseQuickAdd(query);
    
    const filteredCommands = commands.filter(c => 
        c.label.toLowerCase().includes(query.toLowerCase())
    );

    const results = [
        ...(quickAddResult ? [{
            id: 'quick-add',
            label: `Add ${data.settings.currencySymbol}${quickAddResult.amount} to ${quickAddResult.category}`,
            icon: Plus,
            action: () => {
                onQuickAdd(quickAddResult.type, { amount: quickAddResult.amount, category: quickAddResult.category });
                onClose();
            },
            section: 'Quick Entry'
        }] : []),
        ...filteredCommands
    ];

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                results[selectedIndex].action();
                onClose();
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh] px-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
            
            <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[32px] shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-200">
                {/* Search Header */}
                <div className="flex items-center gap-4 px-6 py-5 border-b border-white/5 bg-white/[0.02]">
                    <Search className="text-primary" size={20} />
                    <input 
                        ref={inputRef}
                        type="text" 
                        placeholder="Type a command or '50 lunch' to add entry..."
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-transparent border-none outline-none text-main text-lg font-medium placeholder:text-white/20"
                    />
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-sm border border-white/5">
                        <Command size={12} className="text-white/40" />
                        <span className="text-[10px] font-bold text-white/40">K</span>
                    </div>
                </div>

                {/* Results List */}
                <div className="max-h-[400px] overflow-y-auto py-3 custom-scrollbar">
                    {results.length > 0 ? (
                        <div className="space-y-1 px-3">
                            {results.map((result, index) => {
                                const isSelected = index === selectedIndex;
                                return (
                                    <button
                                        key={result.id}
                                        onClick={() => { result.action(); onClose(); }}
                                        onMouseEnter={() => setSelectedIndex(index)}
                                        className={`w-full flex items-center justify-between px-4 py-3.5 rounded-sm transition-all duration-150 ${isSelected ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.01]' : 'text-white/60 hover:bg-white/5'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-md ${isSelected ? 'bg-white/20' : 'bg-white/5'}`}>
                                                <result.icon size={18} />
                                            </div>
                                            <div className="flex flex-col items-start">
                                                <span className="text-sm font-bold tracking-tight">{result.label}</span>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${isSelected ? 'text-white/60' : 'text-white/20'}`}>
                                                    {result.section}
                                                </span>
                                            </div>
                                        </div>
                                        {isSelected && <ArrowRight size={16} className="text-white/40" />}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center gap-4 opacity-30">
                            <Zap size={32} />
                            <p className="text-sm font-bold uppercase tracking-widest">No commands found</p>
                        </div>
                    )}
                </div>

                {/* Footer Tip */}
                <div className="px-6 py-4 bg-white/[0.01] border-t border-white/5 flex items-center justify-between">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Select</span>
                            <div className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-[9px] text-white/40 font-mono">↑↓</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Execute</span>
                            <div className="bg-white/5 px-1.5 py-0.5 rounded border border-white/5 text-[9px] text-white/40 font-mono">↵</div>
                        </div>
                    </div>
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest">TrackXpense Command Menu</p>
                </div>
            </div>
        </div>
    );
};
