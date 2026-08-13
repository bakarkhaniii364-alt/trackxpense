import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, Search, X, FileText, Calendar as CalendarIcon, PieChart, Shuffle, Trash2, ArrowUp, ArrowDown, SlidersHorizontal } from 'lucide-react';
import { Transaction, TransactionType, AppData, CategoryItem } from '../types';
import { CategoryIcon } from './shared/CategoryIcon';
import { CalendarView } from './history/CalendarView';
import { SankeyChart } from './history/SankeyChart';
import { HistoryStats } from './history/HistoryStats';
import { Haptics } from '../services/haptics';
import { Pagination } from './shared/CommonUI';
import { EmptyStateSeeder } from './shared/EmptyStateSeeder';

interface HistoryProps {
    data: AppData;
    updateData?: (d: Partial<AppData>) => void;
    onRequestDelete: (id: string) => void;
    formatMoney: (val: number, sym: string) => string;
    onEditTransaction: (t: Transaction) => void;
}

type SortKey = 'date' | 'amount' | 'category';
type SortDirection = 'asc' | 'desc';

const HighlightText = ({ text, highlight }: { text: string, highlight: string }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>{parts.map((part, i) => regex.test(part) ? <mark key={i} className="highlight">{part}</mark> : <span key={i}>{part}</span>)}</span>
    );
};

export const HistoryView: React.FC<HistoryProps> = ({ data, updateData, onRequestDelete, formatMoney, onEditTransaction }) => {
    const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'stats' | 'flow'>('list');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [sortKey, setSortKey] = useState<SortKey>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const ITEMS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);
    const [isMobile, setIsMobile] = useState(false);
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (dateRange.start) count++;
        if (dateRange.end) count++;
        if (searchTerm && searchTerm.startsWith('#')) count++;
        return count;
    }, [dateRange, searchTerm]);

    const walletTransactions = data.transactions.filter((t: Transaction) => {
        const isWalletMatch = t.walletId === data.currentWalletId;
        if (data.settings.privacyMode && t.isPrivate) return false;
        return isWalletMatch;
    });
    
    const allTags = Array.from(new Set(walletTransactions.flatMap(t => t.note?.match(/#[\w]+/g) || [])));

    const filteredTransactions = useMemo(() => {
        let filtered = walletTransactions.filter(t => {
            const walletName = data.wallets.find(w => w.id === t.walletId)?.name || '';
            const splitContent = t.splits?.map(s => `${s.category} ${s.note || ''} ${s.amount}`).join(' ') || '';
            
            const searchContent = `${t.note || ''} ${t.category} ${t.amount} ${walletName} ${splitContent}`.toLowerCase();
            const matchSearch = searchTerm ? searchContent.includes(searchTerm.toLowerCase()) : true;
            
            const matchStart = dateRange.start ? t.date >= dateRange.start : true;
            const matchEnd = dateRange.end ? t.date <= dateRange.end + 'T23:59:59' : true;
            return matchSearch && matchStart && matchEnd;
        });

        filtered.sort((a, b) => {
            let valA: any, valB: any;
            if (sortKey === 'amount') { valA = a.amount; valB = b.amount; }
            else if (sortKey === 'category') { valA = a.category; valB = b.category; }
            else { valA = new Date(a.date).getTime(); valB = new Date(b.date).getTime(); }
            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [walletTransactions, searchTerm, dateRange, sortKey, sortDirection]);

    const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
    const paginatedTransactions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTransactions, currentPage]);

    // Reset page when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateRange, sortKey, sortDirection]);

    const exportCSV = () => {
        const headers = ["Date", "Type", "Category", "Amount", "Note"];
        const rows = filteredTransactions.map(t => [t.date.split('T')[0], t.type, t.category, t.amount, t.note || '']);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `transactions_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    const pieData = Object.entries(filteredTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc: any, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {})).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDirection(key === 'date' ? 'desc' : 'asc'); }
    };

    return (
      <div className="animate-in fade-in duration-500 w-full mx-auto px-0 md:px-2">
           <div className="sticky top-0 z-20 bg-[rgb(var(--bg-core))] pb-3 pt-4 border-b border-main/10 mb-4 md:static md:bg-transparent md:border-b-0 md:pt-4 md:mb-6">
               <div className="flex justify-between items-end mb-4 px-1">
                     <div>
                         <h2 className="text-xl lg:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">Transaction History</h2>
                         <p className="text-xs text-[var(--text-secondary)] mt-0.5">Filter, search, and inspect your unified ledger.</p>
                     </div>
                     <button 
                         onClick={exportCSV} 
                         className="btn btn--outline h-[30px] px-3 text-[12px] flex items-center gap-1.5"
                     >
                         <Download size={14} strokeWidth={1.5} /> 
                         <span className="hidden sm:inline">Export CSV</span>
                     </button>
               </div>

               <div className="bg-[var(--bg-surface)] p-3 lg:p-4 rounded-[10px] border border-[var(--border-default)] space-y-3">
                  {/* Search Bar + Filters */}
                  <div className="flex flex-col md:flex-row gap-2.5">
                      <div className="flex-1 flex items-center gap-2.5 bg-[var(--bg-subtle)] rounded-[8px] px-3.5 py-2 border border-[var(--border-default)] focus-within:border-[#2563EB] transition-colors">
                          <Search size={14} className="text-[var(--text-muted)] shrink-0 stroke-[1.5px]" />
                          <input 
                              type="text" 
                              placeholder="Search transactions, notes, tags..." 
                              value={searchTerm} 
                              onChange={e => { setSearchTerm(e.target.value); }} 
                              className="bg-transparent text-[13px] text-[var(--text-primary)] w-full outline-none placeholder:text-[var(--text-muted)]" 
                          />
                          {searchTerm && (
                              <button onClick={() => setSearchTerm('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                                  <X size={13} />
                              </button>
                          )}
                      </div>

                      {isMobile ? (
                          <div className="flex items-center gap-2">
                              <button 
                                  onClick={() => {
                                      Haptics.light();
                                      setIsFilterDrawerOpen(true);
                                  }} 
                                  className={`btn btn--sm flex-1 flex items-center justify-center gap-1.5 h-[34px] ${
                                      activeFilterCount > 0 
                                          ? 'btn--primary' 
                                          : 'btn--outline'
                                  }`}
                              >
                                  <SlidersHorizontal size={14} strokeWidth={1.5} />
                                  <span>Filters</span>
                                  {activeFilterCount > 0 && (
                                      <span className="w-4 h-4 rounded-full bg-white text-black text-[9px] flex items-center justify-center font-bold">
                                          {activeFilterCount}
                                      </span>
                                  )}
                              </button>
                          </div>
                      ) : (
                          <div className="flex gap-2">
                              <div className="relative flex-1 md:w-36"><CalendarIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"/><input type="date" value={dateRange.start} className="bg-[var(--bg-subtle)] text-[var(--text-primary)] text-[12px] rounded-[8px] pl-8 pr-2.5 py-2 w-full outline-none border border-[var(--border-default)] focus:border-[#2563EB]" onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))}/></div>
                              <div className="relative flex-1 md:w-36"><CalendarIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"/><input type="date" value={dateRange.end} className="bg-[var(--bg-subtle)] text-[var(--text-primary)] text-[12px] rounded-[8px] pl-8 pr-2.5 py-2 w-full outline-none border border-[var(--border-default)] focus:border-[#2563EB]" onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))}/></div>
                          </div>
                      )}
                  </div>

                  {/* Horizontal Filter Chips */}
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-0.5 pb-0.5">
                      <button
                          onClick={() => { Haptics.light(); setSearchTerm(''); setDateRange({start: '', end: ''}); }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap border transition-all ${
                              !searchTerm && !dateRange.start && !dateRange.end
                                  ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] border-[var(--accent-solid)] font-semibold'
                                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                          }`}
                      >
                          All
                      </button>
                      <button
                          onClick={() => { Haptics.light(); setSearchTerm(searchTerm === '#expense' ? '' : '#expense'); }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap border transition-all ${
                              searchTerm === '#expense'
                                  ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] border-[var(--accent-solid)] font-semibold'
                                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                          }`}
                      >
                          Expenses
                      </button>
                      <button
                          onClick={() => { Haptics.light(); setSearchTerm(searchTerm === '#income' ? '' : '#income'); }}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap border transition-all ${
                              searchTerm === '#income'
                                  ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] border-[var(--accent-solid)] font-semibold'
                                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                          }`}
                      >
                          Income
                      </button>
                      {allTags.slice(0, 8).map(tag => (
                          <button 
                              key={tag} 
                              onClick={() => { Haptics.light(); setSearchTerm(prev => prev === tag ? '' : tag); }} 
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap border transition-all ${
                                  searchTerm === tag 
                                      ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] border-[var(--accent-solid)] font-semibold' 
                                      : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                              }`}
                          >
                              {tag}
                          </button>
                      ))}
                  </div>

                  {/* View Mode Tabs */}
                  <div className="flex items-center justify-between gap-4 pt-1 border-t border-[var(--border-default)]/60">
                       <div className="tabs w-full sm:w-auto overflow-x-auto no-scrollbar">
                           {[
                               { id: 'list', icon: FileText, label: 'List' },
                               { id: 'calendar', icon: CalendarIcon, label: 'Calendar' },
                               { id: 'stats', icon: PieChart, label: 'Breakdown' },
                               { id: 'flow', icon: Shuffle, label: 'Flow' }
                           ].map((mode: any) => (
                               <button 
                                   key={mode.id} 
                                   onClick={() => { Haptics.light(); setViewMode(mode.id as any); }} 
                                   className={`tab flex items-center gap-1.5 ${viewMode === mode.id ? 'is-active' : ''}`}
                               >
                                   <mode.icon size={13} strokeWidth={1.5} />
                                   <span>{mode.label}</span>
                               </button>
                           ))}
                       </div>
                       {!isMobile && viewMode === 'list' && filteredTransactions.length > 0 && (
                           <div className="tabs">
                                 <button onClick={() => { Haptics.light(); toggleSort('date'); }} className={`tab flex items-center gap-1 text-[11px] uppercase tracking-[0.06em] ${sortKey === 'date' ? 'is-active' : ''}`}>Date {sortKey === 'date' && (sortDirection === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</button>
                                 <button onClick={() => { Haptics.light(); toggleSort('amount'); }} className={`tab flex items-center gap-1 text-[11px] uppercase tracking-[0.06em] ${sortKey === 'amount' ? 'is-active' : ''}`}>Amount {sortKey === 'amount' && (sortDirection === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</button>
                           </div>
                       )}
                  </div>
               </div>
            </div>

            {viewMode === 'list' && (
                <div className="min-h-[300px]">
                  {walletTransactions.length === 0 ? (
                      <EmptyStateSeeder 
                          data={data} 
                          updateData={updateData || (() => {})} 
                          title="No Transactions Logged" 
                          description="Your transaction ledger is empty for this wallet. Seed pre-populated demo entries to explore cash flow, search, and analytics." 
                      />
                  ) : filteredTransactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-[var(--text-secondary)] border border-[var(--border-default)] rounded-[10px] bg-[var(--bg-surface)] p-6 text-center">
                          <p className="text-[13px] font-normal">No transactions found matching your filters</p>
                          <button onClick={() => { Haptics.warning(); setSearchTerm(''); setDateRange({start: '', end: ''}); }} className="mt-3 text-[var(--text-primary)] text-[13px] font-medium hover:underline">
                              Clear all filters
                          </button>
                      </div>
                  ) : (
                       <>
                       <div className="rounded-[12px] bg-[var(--bg-surface)] border border-[var(--border-default)] divide-y divide-[var(--border-default)] px-3.5 lg:px-5">
                       {paginatedTransactions.map((t: Transaction) => {
                           return (
                               <div key={t.id} onClick={() => onEditTransaction(t)} className="py-3 flex items-center justify-between group transition-colors cursor-pointer hover:bg-[var(--bg-surface-hover)] -mx-2 px-2 rounded-[6px]">
                                   <div className="flex items-center gap-3 min-w-0">
                                       <CategoryIcon category={t.category} size={16} strokeWidth={1.5} color={data.categories.find((c: CategoryItem) => c.name === t.category)?.color} />
                                       <div className="min-w-0">
                                           <p className="font-medium text-[var(--text-primary)] text-[13px] leading-tight flex items-center gap-2 truncate">
                                               <HighlightText text={t.note || t.category} highlight={searchTerm} />
                                               {t.splits && <span className="px-1.5 py-0.5 bg-[var(--bg-subtle)] text-[var(--text-primary)] text-[9px] font-medium uppercase tracking-[0.06em] rounded border border-[var(--border-default)]">Split</span>}
                                           </p>
                                           <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-medium uppercase tracking-[0.06em]">
                                               {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • <HighlightText text={t.category} highlight={searchTerm} />
                                           </p>
                                           {t.splits && (
                                               <div className="mt-1.5 flex flex-wrap gap-1">
                                                   {t.splits.map((s, i) => (
                                                       <span key={i} className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded border border-[var(--border-default)]">
                                                           <HighlightText text={s.category} highlight={searchTerm} />: {formatMoney(s.amount, data.settings.currencySymbol)}
                                                       </span>
                                                   ))}
                                               </div>
                                           )}
                                       </div>
                                   </div>
                                   <div className="flex items-center gap-2.5 shrink-0 ml-3 text-right">
                                       <span className={`font-mono font-medium text-[13px] ${t.type === TransactionType.INCOME ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-primary)]'}`}>
                                           {t.type === TransactionType.INCOME ? '+' : '-'}{formatMoney(t.amount, data.settings.currencySymbol)}
                                       </span>
                                       <button onClick={(e) => { e.stopPropagation(); Haptics.warning(); onRequestDelete(t.id); }} className="text-[var(--text-muted)] hover:text-[var(--status-error-fg)] p-1 rounded-[4px] hover:bg-[var(--status-error-bg)] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                                           <Trash2 size={13} className="stroke-[1.5px]" />
                                       </button>
                                   </div>
                               </div>
                           );
                       })}
                      </div>
                     <Pagination
                       currentPage={currentPage}
                       totalPages={totalPages}
                       totalItems={filteredTransactions.length}
                       itemsPerPage={ITEMS_PER_PAGE}
                       onPageChange={setCurrentPage}
                     />
                      </>
                 )}
                </div>
            )}
           {viewMode === 'calendar' && <div className="bg-surface/50 p-6 rounded-[40px] border border-main/10 shadow-xl"><CalendarView transactions={filteredTransactions} onSelectDate={(d) => { setSearchTerm(''); setDateRange({ start: d, end: d }); setViewMode('list'); }} /></div>}
           {viewMode === 'flow' && <div className="bg-surface/50 rounded-[40px] p-8 border border-main/10 shadow-xl animate-in fade-in"><h3 className="text-xl font-bold text-main mb-8 text-center tracking-tight">Cash Flow</h3><div className="max-w-xl mx-auto"><SankeyChart transactions={filteredTransactions} categories={data.categories} /></div></div>}
           {viewMode === 'stats' && <HistoryStats pieData={pieData} data={data} formatMoney={formatMoney} />}
           {isMobile && isFilterDrawerOpen && createPortal(
                <div className="fixed inset-0 z-[99999] flex items-end justify-center lg:hidden">
                    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150" onClick={() => setIsFilterDrawerOpen(false)}></div>
                    <div className="relative bg-[var(--bg-surface)] border-t border-[var(--border-default)] w-full rounded-t-[20px] p-6 shadow-2xl animate-in slide-in-from-bottom duration-200 pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-10 space-y-4">
                        
                        {/* Drag Handle */}
                        <div className="w-10 h-1 bg-[var(--border-default)] rounded-full mx-auto shrink-0" />
                        
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">Filter Ledger</h3>
                                <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5">Refine your transactions list</p>
                            </div>
                            <button 
                                onClick={() => {
                                    Haptics.light();
                                    setIsFilterDrawerOpen(false);
                                }} 
                                className="w-7 h-7 rounded-[6px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                            >
                                <X size={15} strokeWidth={1.5} />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar">
                            {/* Date range filters */}
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-medium text-[var(--text-secondary)]">Date Range</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="relative">
                                        <CalendarIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"/>
                                        <input 
                                            type="date" 
                                            value={dateRange.start}
                                            className="bg-[var(--bg-subtle)] text-[var(--text-primary)] text-[11px] font-medium rounded-[6px] pl-8 pr-2 py-2 w-full outline-none border border-[var(--border-default)] color-scheme-dark" 
                                            onChange={e => {
                                                Haptics.light();
                                                setDateRange(prev => ({...prev, start: e.target.value}));
                                            }}
                                        />
                                    </div>
                                    <div className="relative">
                                        <CalendarIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"/>
                                        <input 
                                            type="date" 
                                            value={dateRange.end}
                                            className="bg-[var(--bg-subtle)] text-[var(--text-primary)] text-[11px] font-medium rounded-[6px] pl-8 pr-2 py-2 w-full outline-none border border-[var(--border-default)] color-scheme-dark" 
                                            onChange={e => {
                                                Haptics.light();
                                                setDateRange(prev => ({...prev, end: e.target.value}));
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>


                            {/* Sort filter */}
                            <div className="space-y-1.5">
                                <label className="text-[12px] font-medium text-[var(--text-secondary)]">Sort By</label>
                                <div className="tabs flex">
                                     <button 
                                         onClick={() => toggleSort('date')}
                                         className={`tab flex-1 justify-center flex items-center gap-1 ${sortKey === 'date' ? 'is-active' : ''}`}
                                     >
                                         Date {sortKey === 'date' && (sortDirection === 'asc' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
                                     </button>
                                     <button 
                                         onClick={() => toggleSort('amount')}
                                         className={`tab flex-1 justify-center flex items-center gap-1 ${sortKey === 'amount' ? 'is-active' : ''}`}
                                     >
                                         Amount {sortKey === 'amount' && (sortDirection === 'asc' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
                                     </button>
                                 </div>
                            </div>

                            {/* Tags Option */}
                            {allTags.length > 0 && (
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-medium text-[var(--text-secondary)]">Tags</label>
                                    <div className="flex flex-wrap gap-1">
                                        {allTags.map(tag => (
                                            <button 
                                                key={tag} 
                                                onClick={() => {
                                                    Haptics.light();
                                                    setSearchTerm(prev => prev === tag ? '' : tag);
                                                }} 
                                                className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium border transition-all ${searchTerm === tag ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]'}`}
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Clear all button */}
                            <button 
                                onClick={() => {
                                    Haptics.warning();
                                    setSearchTerm('');
                                    setDateRange({start: '', end: ''});
                                    setIsFilterDrawerOpen(false);
                                }}
                                className="btn btn--outline w-full h-[36px] text-[12px] mt-2"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
           )}
      </div>
    );
};
