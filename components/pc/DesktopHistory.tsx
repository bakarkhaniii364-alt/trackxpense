import React, { useState, useMemo } from 'react';
import { 
  Download, 
  Search, 
  X, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ListFilter, 
  Receipt,
  Plus
} from 'lucide-react';
import { Transaction, TransactionType, AppData } from '../../types';
import { CategoryIcon } from '../shared/CategoryIcon';
import { GlassCheckbox } from '../shared/CommonUI';
import { EmptyStateSeeder } from '../shared/EmptyStateSeeder';
import { TablePaginationFooter } from '../shared/TablePaginationFooter';

interface DesktopHistoryProps {
    data: AppData;
    updateData?: (d: Partial<AppData>) => void;
    onRequestDelete: (id: string) => void;
    formatMoney: (val: number, sym: string) => string;
    onEditTransaction: (t: Transaction) => void;
}

const ITEMS_PER_PAGE = 10;

export const DesktopHistory: React.FC<DesktopHistoryProps> = ({ 
    data, updateData, onRequestDelete, formatMoney, onEditTransaction 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [sortKey, setSortKey] = useState<'date' | 'amount' | 'category'>('date');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const walletTransactions = useMemo(() => 
        (data.transactions || []).filter((t: Transaction) => {
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
            const matchType = typeFilter === 'ALL' || t.type === typeFilter;
            const matchCategory = categoryFilter === 'ALL' || t.category === categoryFilter;

            return matchSearch && matchType && matchCategory;
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
    }, [walletTransactions, searchTerm, typeFilter, categoryFilter, sortKey, sortDirection]);

    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) || 1;
    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTransactions, currentPage]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const selectAllCurrentPage = () => {
        const pageIds = paginatedTransactions.map(t => t.id);
        const allSelected = pageIds.every(id => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
        } else {
            setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
        }
    };

    const handleBatchDelete = () => {
        if (confirm(`Delete ${selectedIds.length} selected transactions?`)) {
            selectedIds.forEach(id => onRequestDelete(id));
            setSelectedIds([]);
        }
    };

    const exportCSV = () => {
        const targets = selectedIds.length > 0 
            ? filteredTransactions.filter(t => selectedIds.includes(t.id)) 
            : filteredTransactions;
        const headers = ["Date", "Type", "Category", "Amount", "Note"];
        const rows = targets.map(t => [t.date.split('T')[0], t.type, t.category, t.amount, t.note || '']);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `trackxpense_transactions_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    const hasTransactions = walletTransactions.length > 0;

    return (
        <div className="w-full space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 mx-auto pb-8 overflow-x-hidden">
            
            {/* Section Header Outside Card */}
            <div className="flex items-center justify-between pb-1">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Transactions</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Audit, filter, and inspect your complete transaction ledger.</p>
                </div>
            </div>

            {hasTransactions ? (
                <div className="space-y-4">
                    {/* Control Bar: Search & Filters */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface)] border border-[var(--border-default)] p-3 rounded-[10px]">
                        
                        {/* Search Bar */}
                        <div className="flex-1 min-w-[240px] relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--text-primary)] transition-colors" size={14} />
                            <input 
                                type="text" 
                                placeholder="Search transactions, notes, or categories..." 
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full h-[36px] bg-[var(--bg-subtle)] border border-[var(--border-default)] focus:border-[var(--border-active)] rounded-[6px] pl-9 pr-3 text-[13px] text-[var(--text-primary)] outline-none transition-all placeholder:text-[var(--text-muted)] font-normal"
                            />
                        </div>

                        {/* Type & Category Filters */}
                        <div className="flex items-center gap-2">
                            {/* Type Filter Pills */}
                            <div className="inline-flex bg-[var(--bg-subtle)] p-0.5 rounded-[6px] border border-[var(--border-default)]">
                                {(['ALL', 'EXPENSE', 'INCOME'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => { setTypeFilter(type); setCurrentPage(1); }}
                                        className={`px-3 py-1 rounded-[5px] text-[12px] font-medium transition-all ${
                                            typeFilter === type
                                                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xs'
                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                        }`}
                                    >
                                        {type === 'ALL' ? 'All' : type === 'EXPENSE' ? 'Expense' : 'Income'}
                                    </button>
                                ))}
                            </div>

                            {/* Category Dropdown */}
                            <select
                                value={categoryFilter}
                                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                                className="h-[36px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] px-3 text-[12px] font-medium text-[var(--text-primary)] outline-none cursor-pointer"
                            >
                                <option value="ALL">All Categories</option>
                                {data.categories?.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="bg-[var(--bg-surface)] rounded-[10px] border border-[var(--border-default)] overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]/50">
                                    <th className="px-4 py-3 w-10">
                                        <GlassCheckbox 
                                            checked={paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedIds.includes(t.id))}
                                            onChange={selectAllCurrentPage}
                                        />
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                                        onClick={() => { setSortKey('date'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}
                                    >
                                        <div className="flex items-center gap-1">
                                            Date {sortKey === 'date' && (sortDirection === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
                                        </div>
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                                        onClick={() => { setSortKey('category'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}
                                    >
                                        <div className="flex items-center gap-1">
                                            Category {sortKey === 'category' && (sortDirection === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
                                        </div>
                                    </th>
                                    <th className="px-4 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
                                        Note / Description
                                    </th>
                                    <th 
                                        className="px-4 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] cursor-pointer hover:text-[var(--text-primary)] transition-colors text-right"
                                        onClick={() => { setSortKey('amount'); setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc'); }}
                                    >
                                        <div className="flex items-center justify-end gap-1">
                                            Amount {sortKey === 'amount' && (sortDirection === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-default)]">
                                {paginatedTransactions.length > 0 ? (
                                    paginatedTransactions.map((t) => {
                                        const isSelected = selectedIds.includes(t.id);
                                        return (
                                            <tr 
                                                key={t.id} 
                                                onClick={() => onEditTransaction(t)} 
                                                className={`group hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer ${
                                                    isSelected ? 'bg-[var(--bg-subtle)]' : ''
                                                }`}
                                            >
                                                <td className="px-4 py-3">
                                                    <GlassCheckbox 
                                                        checked={isSelected}
                                                        onChange={() => toggleSelect(t.id)}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-[13px] font-medium text-[var(--text-primary)]">
                                                        {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </p>
                                                    <p className="text-[11px] text-[var(--text-muted)]">
                                                        {new Date(t.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2.5">
                                                        <CategoryIcon category={t.category} color={data.categories?.find(c => c.name === t.category)?.color} />
                                                        <span className="text-[13px] font-medium text-[var(--text-primary)]">{t.category}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-[13px] text-[var(--text-primary)] truncate max-w-[320px]">
                                                        {t.note || <span className="text-[var(--text-muted)] italic">No description</span>}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <p className={`text-[13px] font-semibold tracking-tight ${
                                                        t.type === TransactionType.INCOME ? 'text-emerald-500' : 'text-[var(--text-primary)]'
                                                    }`}>
                                                        {t.type === TransactionType.INCOME ? '+' : '-'}{formatMoney(t.amount, data.settings.currencySymbol)}
                                                    </p>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-[var(--text-muted)] text-xs">
                                            No matching transactions found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        <TablePaginationFooter
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredTransactions.length}
                            pageSize={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPage}
                            onExportCSV={exportCSV}
                        />
                    </div>
                </div>
            ) : (
                <EmptyStateSeeder 
                    data={data} 
                    updateData={updateData || (() => {})} 
                    title="No Transactions Logged" 
                    description="Your transaction ledger is empty for this wallet. Seed pre-populated demo entries to explore desktop data tables, sorting, and CSV exports." 
                />
            )}

            {/* Batch Floating Action Bar */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[5000] animate-in slide-in-from-bottom-6 duration-300">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-2xl px-5 py-3 rounded-[10px] flex items-center gap-6 text-[13px]">
                        <span className="font-medium text-[var(--text-primary)]">
                            {selectedIds.length} transaction{selectedIds.length === 1 ? '' : 's'} selected
                        </span>
                        <div className="h-4 w-px bg-[var(--border-default)]" />
                        <div className="flex items-center gap-2">
                            <button
                                onClick={exportCSV}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[var(--border-default)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium text-[12px] transition-all"
                            >
                                <Download size={13} />
                                <span>Export selected</span>
                            </button>
                            <button
                                onClick={handleBatchDelete}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-medium text-[12px] transition-all"
                            >
                                <Trash2 size={13} />
                                <span>Delete selected</span>
                            </button>
                            <button
                                onClick={() => setSelectedIds([])}
                                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                                title="Clear selection"
                            >
                                <X size={15} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
