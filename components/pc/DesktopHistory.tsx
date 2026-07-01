
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Download, Search, X, Calendar as CalendarIcon, Filter, Trash2, ArrowUp, ArrowDown, ChevronRight, LayoutGrid, List as ListIcon } from 'lucide-react';
import { Transaction, TransactionType, AppData } from '../../types';
import { CategoryIcon } from '../shared/CategoryIcon';
import { GlassDateInput } from '../shared/CommonUI';

interface DesktopHistoryProps {
    data: AppData;
    onRequestDelete: (id: string) => void;
    formatMoney: (val: number, sym: string) => string;
    onEditTransaction: (t: Transaction) => void;
}

export const DesktopHistory: React.FC<DesktopHistoryProps> = ({ 
    data, onRequestDelete, formatMoney, onEditTransaction 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [sortKey, setSortKey] = useState<'date' | 'amount' | 'category'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [minAmount, setMinAmount] = useState<string>('');
    const [maxAmount, setMaxAmount] = useState<string>('');
    const [filterTags, setFilterTags] = useState<string[]>([]);

    const walletTransactions = useMemo(() => 
        data.transactions.filter((t: Transaction) => {
            const isWalletMatch = t.walletId === data.currentWalletId;
            if (data.settings.privacyMode && t.isPrivate) return false;
            return isWalletMatch;
        })
    , [data.transactions, data.currentWalletId, data.settings.privacyMode]);

    const filteredTransactions = useMemo(() => {
        let filtered = walletTransactions.filter(t => {
            const walletName = data.wallets.find(w => w.id === t.walletId)?.name || '';
            const splitContent = t.splits?.map(s => `${s.category} ${s.note || ''} ${s.amount}`).join(' ') || '';
            
            const searchContent = `${t.note || ''} ${t.category} ${t.amount} ${walletName} ${splitContent}`.toLowerCase();
            const matchSearch = searchTerm ? searchContent.includes(searchTerm.toLowerCase()) : true;
            
            const matchStart = dateRange.start ? t.date >= dateRange.start : true;
            const matchEnd = dateRange.end ? t.date <= dateRange.end + 'T23:59:59' : true;

            const amt = t.amount;
            const matchMin = minAmount ? amt >= parseFloat(minAmount) : true;
            const matchMax = maxAmount ? amt <= parseFloat(maxAmount) : true;

            return matchSearch && matchStart && matchEnd && matchMin && matchMax;
        });

        filtered.sort((a, b) => {
            let valA: any = a[sortKey === 'category' ? 'category' : sortKey === 'amount' ? 'amount' : 'date'];
            let valB: any = b[sortKey === 'category' ? 'category' : sortKey === 'amount' ? 'amount' : 'date'];
            
            if (sortKey === 'date') {
                valA = new Date(valA).getTime();
                valB = new Date(valB).getTime();
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [walletTransactions, searchTerm, dateRange, sortKey, sortDirection]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const selectAll = () => {
        if (selectedIds.length === filteredTransactions.length) setSelectedIds([]);
        else setSelectedIds(filteredTransactions.map(t => t.id));
    };

    const handleBatchDelete = () => {
        if (confirm(`Delete ${selectedIds.length} transactions?`)) {
            selectedIds.forEach(id => onRequestDelete(id));
            setSelectedIds([]);
        }
    };

    const exportCSV = () => {
        const targets = selectedIds.length > 0 ? filteredTransactions.filter(t => selectedIds.includes(t.id)) : filteredTransactions;
        const headers = ["Date", "Type", "Category", "Amount", "Note"];
        const rows = targets.map(t => [t.date.split('T')[0], t.type, t.category, t.amount, t.note || '']);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `trackxpense_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto pb-4 overflow-x-hidden">
            <div className="flex gap-2 justify-end px-4">
                <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 liquid-glass rounded-sm text-main font-bold text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-sm">
                    <Download size={14}/> Export CSV
                </button>
            </div>

            {/* High-Density Filter Console */}
            <div className="liquid-glass p-4 rounded-md shadow-lg space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Field */}
                    <div className="flex-1 min-w-[200px] relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-primary transition-colors" size={14} />
                        <input 
                            type="text" 
                            placeholder="Search transactions, notes, or amounts..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/20 border border-white/5 group-focus-within:border-primary/40 rounded-sm pl-10 pr-4 py-2.5 text-xs text-main outline-none transition-all placeholder:text-muted/40 font-medium"
                        />
                    </div>

                    {/* Amount Range Filter */}
                    <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-sm border border-white/5">
                        <Filter size={12} className="text-muted/40" />
                        <input 
                            type="number" 
                            placeholder="Min" 
                            value={minAmount}
                            onChange={(e) => setMinAmount(e.target.value)}
                            className="w-12 bg-transparent text-[10px] text-white outline-none font-bold"
                        />
                        <span className="text-white/10">-</span>
                        <input 
                            type="number" 
                            placeholder="Max" 
                            value={maxAmount}
                            onChange={(e) => setMaxAmount(e.target.value)}
                            className="w-12 bg-transparent text-[10px] text-white outline-none font-bold"
                        />
                    </div>

                    {/* View Toggles */}
                    <div className="flex bg-black/20 p-1 rounded-sm border border-white/5">
                        <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-primary text-white shadow-md' : 'text-muted hover:text-main'}`}>
                            <ListIcon size={14} />
                        </button>
                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-md' : 'text-muted hover:text-main'}`}>
                            <LayoutGrid size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Display */}
            {viewMode === 'table' ? (
                <div className="liquid-glass rounded-md shadow-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                             <tr className="border-b border-white/5 bg-white/5">
                                <th className="px-4 py-3 w-10">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedIds.length === filteredTransactions.length && filteredTransactions.length > 0}
                                        onChange={selectAll}
                                        className="w-4 h-4 rounded border-white/10 bg-black/40 text-primary focus:ring-primary/20 accent-primary"
                                    />
                                </th>
                                <th className="px-4 py-3 text-[9px] font-black text-muted/40 uppercase tracking-[0.2em] cursor-pointer hover:text-main transition-colors" onClick={() => { setSortKey('date'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                    <div className="flex items-center gap-1.5">Date {sortKey === 'date' && (sortDirection === 'asc' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}</div>
                                </th>
                                <th className="px-4 py-3 text-[9px] font-black text-muted/40 uppercase tracking-[0.2em]">Transaction Note</th>
                                <th className="px-4 py-3 text-[9px] font-black text-muted/40 uppercase tracking-[0.2em] cursor-pointer hover:text-main transition-colors" onClick={() => { setSortKey('category'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                    <div className="flex items-center gap-1.5">Category {sortKey === 'category' && (sortDirection === 'asc' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}</div>
                                </th>
                                <th className="px-4 py-3 text-[9px] font-black text-muted/40 uppercase tracking-[0.2em] cursor-pointer hover:text-main transition-colors text-right" onClick={() => { setSortKey('amount'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}>
                                    <div className="flex items-center gap-1.5 justify-end">Amount {sortKey === 'amount' && (sortDirection === 'asc' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredTransactions.map((t) => (
                                 <tr key={t.id} onClick={() => onEditTransaction(t)} className={`group hover:bg-white/5 transition-colors cursor-pointer ${selectedIds.includes(t.id) ? 'bg-primary/5' : ''}`}>
                                    <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedIds.includes(t.id)}
                                            onChange={() => toggleSelect(t.id)}
                                            className="w-4 h-4 rounded border-white/10 bg-black/40 text-primary focus:ring-primary/20 accent-primary"
                                        />
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <p className="text-[11px] font-bold text-main">{new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                        <p className="text-[8px] text-muted/40 font-black uppercase tracking-widest">{new Date(t.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-7 w-7 rounded-sm bg-black/20 flex items-center justify-center border border-white/5 text-muted/50 group-hover:scale-105 transition-transform">
                                                <CategoryIcon category={t.category} color={data.categories.find(c => c.name === t.category)?.color} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-bold text-main truncate max-w-[250px] flex items-center gap-2">
                                                    {t.note || t.category}
                                                    {t.splits && <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[6px] font-black uppercase tracking-widest rounded border border-primary/20">Split</span>}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className="px-2 py-0.5 bg-black/20 rounded-md text-[8px] font-black uppercase text-muted/60 border border-white/5 tracking-widest">{t.category}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        <p className={`text-[11px] font-black tracking-tight ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-main'}`}>
                                            {t.type === TransactionType.INCOME ? '+' : ''}{formatMoney(t.amount, data.settings.currencySymbol)}
                                        </p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTransactions.map((t) => (
                        <div key={t.id} onClick={() => onEditTransaction(t)} className="glass-card p-5 rounded-md hover:border-primary/20 hover:bg-white/5 transition-all cursor-pointer group active:scale-[0.98] shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-10 w-10 rounded-sm bg-black/20 flex items-center justify-center border border-white/5 text-muted/50 group-hover:scale-110 transition-transform duration-500">
                                    <CategoryIcon category={t.category} color={data.categories.find(c => c.name === t.category)?.color} />
                                </div>
                                <div className="text-right">
                                    <p className={`text-lg font-black tracking-tighter ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-main'}`}>
                                        {t.type === TransactionType.INCOME ? '+' : '-'}{formatMoney(t.amount, data.settings.currencySymbol)}
                                    </p>
                                    <p className="text-[8px] text-muted/40 font-black uppercase tracking-[0.2em] mt-0.5">{t.category}</p>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-bold text-main leading-snug h-8 line-clamp-2">{t.note || 'Uncategorized Entry'}</p>
                                    {t.splits && <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[7px] font-black uppercase tracking-widest rounded border border-primary/20 shrink-0">Split</span>}
                                </div>
                                {t.splits && (
                                    <div className="flex flex-wrap gap-1.5 min-h-[20px]">
                                        {t.splits.map((s, i) => (
                                            <span key={i} className="text-[7px] font-bold text-muted/30 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                                {s.category}: {formatMoney(s.amount, data.settings.currencySymbol)}
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                    <span className="text-[9px] font-black text-muted/30 uppercase tracking-tighter">{new Date(t.date).toLocaleDateString()}</span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onRequestDelete(t.id); }} 
                                        className="text-muted/30 hover:text-rose-500 transition-colors p-1"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Batch Action Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[5000] animate-in slide-in-from-bottom-10 duration-300">
                    <div className="liquid-glass px-8 py-4 rounded-lg border border-primary/40 shadow-[0_16px_64px_rgb(var(--color-primary)/0.2)] flex items-center gap-8 bg-primary/10 backdrop-blur-2xl">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-1">Batch Operations</span>
                            <span className="text-xl font-bold text-white tracking-tight">{selectedIds.length} <span className="text-sm font-medium text-white/40">Selected</span></span>
                        </div>
                        <div className="h-10 w-px bg-white/10" />
                        <div className="flex gap-4">
                            <button onClick={exportCSV} className="p-3 bg-white/5 hover:bg-white/10 rounded-md text-white transition-all"><Download size={18} /></button>
                            <button onClick={handleBatchDelete} className="p-3 bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white rounded-md transition-all border border-rose-500/20"><Trash2 size={18} /></button>
                            <button onClick={() => setSelectedIds([])} className="p-3 bg-white/5 hover:bg-white/10 rounded-md text-white/40 hover:text-white transition-all"><X size={18} /></button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
