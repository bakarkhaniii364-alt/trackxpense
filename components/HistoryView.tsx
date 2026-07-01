import React, { useState, useMemo, useEffect } from 'react';
import { Download, Search, X, FileText, Calendar as CalendarIcon, PieChart, Shuffle, Trash2, ArrowUp, ArrowDown, SlidersHorizontal } from 'lucide-react';
import { Transaction, TransactionType, AppData, CategoryItem } from '../types';
import { CategoryIcon } from './shared/CategoryIcon';
import { CalendarView } from './history/CalendarView';
import { SankeyChart } from './history/SankeyChart';
import { HistoryStats } from './history/HistoryStats';
import { Haptics } from '../services/haptics';
import { Pagination } from './shared/CommonUI';

interface HistoryProps {
    data: AppData;
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

export const HistoryView: React.FC<HistoryProps> = ({ data, onRequestDelete, formatMoney, onEditTransaction }) => {
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
      <div className="animate-in fade-in duration-500 max-w-6xl mx-auto px-0 md:px-2">
           <div className="sticky top-0 z-20 bg-[rgb(var(--bg-core))] pb-3 pt-4 border-b border-main/10 mb-4 md:static md:bg-transparent md:border-b-0 md:pt-4 md:mb-6">
               <div className="flex justify-between items-end mb-4 px-1">
                     <div>
                         <h2 className="text-xl lg:text-3xl font-bold text-main tracking-tight">Transaction History</h2>
                         <p className="text-[10px] text-muted/40 font-black uppercase tracking-[0.2em] mt-1">View and filter your transactions</p>
                     </div>
                     <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 bg-main/5 rounded-md text-muted/60 hover:text-main border border-main/10 active:scale-95 transition-all font-black text-[9px] uppercase tracking-[0.2em]"><Download size={14}/> <span className="hidden sm:inline">Export CSV</span></button>
               </div>

               <div className="liquid-glass p-3 lg:p-4 rounded-md shadow-xl space-y-4">
                  {isMobile ? (
                      <div className="flex gap-2">
                          <div className="flex-1 flex items-center gap-2.5 bg-main/5 rounded-md px-3 py-2.5 border border-main/10 group focus-within:border-primary/40 transition-colors">
                              <Search size={14} className="text-muted/40 group-focus-within:text-primary transition-colors"/>
                              <input type="text" placeholder="Search..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); }} className="bg-transparent text-[11px] font-bold text-main w-full outline-none placeholder:text-muted/20" />
                              {searchTerm && <button onClick={() => setSearchTerm('')} className="text-muted/40 hover:text-main"><X size={12} /></button>}
                          </div>
                          <button 
                              onClick={() => {
                                  Haptics.light();
                                  setIsFilterDrawerOpen(true);
                              }} 
                              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all border active:scale-95 ${
                                  activeFilterCount > 0 
                                      ? 'bg-primary/10 border-primary/30 text-primary shadow-lg shadow-primary/5' 
                                      : 'bg-main/5 border-main/10 text-muted/85'
                              }`}
                          >
                              <SlidersHorizontal size={14} />
                              <span>Filters</span>
                              {activeFilterCount > 0 && (
                                  <span className="w-4.5 h-4.5 rounded-full bg-primary text-white text-[8px] flex items-center justify-center font-bold">
                                      {activeFilterCount}
                                  </span>
                              )}
                          </button>
                      </div>
                  ) : (
                      <>
                          <div className="flex flex-col md:flex-row gap-3">
                              <div className="flex-1 flex items-center gap-3 bg-main/5 rounded-md px-4 py-3 border border-main/10 group focus-within:border-primary/40 transition-colors">
                                  <Search size={16} className="text-muted/40 group-focus-within:text-primary transition-colors"/>
                                  <input type="text" placeholder="Search transactions..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); }} className="bg-transparent text-[11px] font-bold text-main w-full outline-none placeholder:text-muted/20" />
                                  {searchTerm && <button onClick={() => setSearchTerm('')} className="text-muted/40 hover:text-main"><X size={14} /></button>}
                              </div>
                              <div className="flex gap-2">
                                  <div className="relative flex-1 md:w-36"><CalendarIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/40 pointer-events-none"/><input type="date" value={dateRange.start} className="bg-main/5 text-main text-[10px] font-bold rounded-md pl-9 pr-3 py-3 w-full outline-none border border-main/10 focus:border-primary/40 uppercase" onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))}/></div>
                                  <div className="relative flex-1 md:w-36"><CalendarIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/40 pointer-events-none"/><input type="date" value={dateRange.end} className="bg-main/5 text-main text-[10px] font-bold rounded-md pl-9 pr-3 py-3 w-full outline-none border border-main/10 focus:border-primary/40 uppercase" onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))}/></div>
                              </div>
                          </div>
                      </>
                  )}

                  <div className="flex items-center justify-between gap-4">
                      <div className="flex bg-main/5 p-1 rounded-md border border-main/10 w-full sm:w-auto overflow-x-auto no-scrollbar">
                          {[
                              { id: 'list', icon: FileText, label: 'List' },
                              { id: 'calendar', icon: CalendarIcon, label: 'Calendar' },
                              { id: 'stats', icon: PieChart, label: 'Category Breakdown' },
                              { id: 'flow', icon: Shuffle, label: 'Flow' }
                          ].map((mode: any) => (
                              <button key={mode.id} onClick={() => { Haptics.light(); setViewMode(mode.id as any); }} className={`flex-1 sm:flex-none px-4 h-9 rounded-sm flex items-center justify-center gap-2 transition-all active:scale-95 whitespace-nowrap ${viewMode === mode.id ? 'bg-primary text-white shadow-lg shadow-primary/20 font-black' : 'text-muted/60 hover:text-main'}`}><mode.icon size={14} /><span className="hidden sm:inline text-[9px] font-black uppercase tracking-[0.2em]">{mode.label}</span></button>
                          ))}
                      </div>
                      {!isMobile && viewMode === 'list' && filteredTransactions.length > 0 && (
                          <div className="flex items-center gap-1.5 bg-main/5 p-1 rounded-md border border-main/10">
                                <button onClick={() => { Haptics.light(); toggleSort('date'); }} className={`px-4 h-9 rounded-sm text-[9px] font-black uppercase tracking-[0.1em] flex items-center gap-2 transition-all active:scale-95 ${sortKey === 'date' ? 'bg-primary/20 border-primary/40 text-primary' : 'text-muted/40 hover:text-main hover:bg-main/5 border border-transparent'}`}>Date {sortKey === 'date' && (sortDirection === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</button>
                                <button onClick={() => { Haptics.light(); toggleSort('amount'); }} className={`px-4 h-9 rounded-sm text-[9px] font-black uppercase tracking-[0.1em] flex items-center gap-2 transition-all active:scale-95 ${sortKey === 'amount' ? 'bg-primary/20 border-primary/40 text-primary' : 'text-muted/40 hover:text-main hover:bg-main/5 border border-transparent'}`}>Amount {sortKey === 'amount' && (sortDirection === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}</button>
                          </div>
                      )}
                  </div>
                  {!isMobile && allTags.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1">
                          {allTags.map(tag => (
                              <button key={tag} onClick={() => { Haptics.light(); setSearchTerm(prev => prev === tag ? '' : tag); }} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-all active:scale-95 ${searchTerm === tag ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-main/5 text-muted border-main/10 hover:border-primary/30'}`}>{tag}</button>
                          ))}
                      </div>
                  )}
               </div>
           </div>

           {viewMode === 'list' && (
               <div className="min-h-[300px]">
                 {filteredTransactions.length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-64 text-muted border border-main/10 rounded-[40px] bg-surface/20 border-dashed"><p className="text-base font-medium">No transactions found matching your filters</p><button onClick={() => { Haptics.warning(); setSearchTerm(''); setDateRange({start: '', end: ''}); }} className="mt-4 text-primary text-sm font-bold hover:underline">Clear all filters</button></div>
                 ) : (
                      <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                      {paginatedTransactions.map((t: Transaction) => {
                          const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
                          return (
                              <div key={t.id} onClick={() => onEditTransaction(t)} className="glass-card p-3 lg:p-4 rounded-lg lg:rounded-sm flex items-center justify-between group active:scale-[0.99] transition-all cursor-pointer hover:border-main/20">
                                  <div className="flex items-center gap-3 lg:gap-4">
                                      <div className="h-9 w-9 lg:h-11 lg:w-11 rounded-md bg-main/5 flex items-center justify-center border border-main/10 text-muted group-hover:scale-110 transition-transform shrink-0"><CategoryIcon category={t.category} size={isMobile ? 16 : 20} color={data.categories.find((c: CategoryItem) => c.name === t.category)?.color} /></div>
                                      <div>
                                          <p className="font-bold text-main text-[11px] leading-tight tracking-tight flex items-center gap-2">
                                              <HighlightText text={t.note || t.category} highlight={searchTerm} />
                                              {t.splits && <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[7px] font-black uppercase tracking-widest rounded border border-primary/20">Split</span>}
                                          </p>
                                          <p className="text-[9px] text-muted/40 mt-1.5 font-black uppercase tracking-widest">
                                              {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • <HighlightText text={t.category} highlight={searchTerm} />
                                          </p>
                                          {t.splits && (
                                              <div className="mt-2 flex flex-wrap gap-1.5">
                                                  {t.splits.map((s, i) => (
                                                      <span key={i} className="text-[7px] font-bold text-muted/30 bg-main/5 px-2 py-0.5 rounded border border-main/10">
                                                          <HighlightText text={s.category} highlight={searchTerm} />: {formatMoney(s.amount, data.settings.currencySymbol)}
                                                      </span>
                                                  ))}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <span className={`font-bold text-sm tracking-tight ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-main'}`}>{t.type === TransactionType.INCOME ? '+' : ''}{formatMoney(t.amount, data.settings.currencySymbol)}</span>
                                      <button onClick={(e) => { e.stopPropagation(); Haptics.warning(); onRequestDelete(t.id); }} className="text-muted/40 hover:text-rose-500 p-2 rounded-sm bg-main/5 hover:bg-rose-500/10 transition-all active:scale-90 opacity-0 group-hover:opacity-100 focus:opacity-100"><Trash2 size={12} /></button>
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

           {/* Mobile Drawer Sheet for Filters */}
           {isMobile && isFilterDrawerOpen && (
               <div className="fixed inset-0 z-[4000] flex items-end justify-center lg:hidden">
                   <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200" onClick={() => setIsFilterDrawerOpen(false)}></div>
                   <div className="relative bg-[rgba(var(--bg-core),0.92)] backdrop-blur-xl w-full rounded-t-[32px] p-6 shadow-2xl border-t border-x border-main/10 animate-in slide-in-from-bottom duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-10">
                       
                       {/* Drag Handle */}
                       <div className="w-12 h-1 bg-main/20 rounded-full mx-auto mb-6 shrink-0" />
                       
                       <div className="flex justify-between items-center mb-6">
                           <div>
                               <h3 className="text-lg font-bold text-main tracking-tight">Filter Ledger</h3>
                               <p className="text-[9px] text-muted/40 font-black uppercase tracking-widest mt-0.5">Refine your transactions list</p>
                           </div>
                           <button 
                               onClick={() => {
                                   Haptics.light();
                                   setIsFilterDrawerOpen(false);
                               }} 
                               className="p-2 bg-main/5 hover:bg-main/10 rounded-full text-muted active:scale-90 border border-main/10"
                           >
                               <X size={16} />
                           </button>
                       </div>

                       <div className="space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar">
                           {/* Date range filters */}
                           <div className="space-y-2">
                               <label className="text-[8px] font-black text-muted/50 uppercase tracking-[0.2em] ml-1">Date Range</label>
                               <div className="grid grid-cols-2 gap-3">
                                   <div className="relative">
                                       <CalendarIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/40 pointer-events-none"/>
                                       <input 
                                           type="date" 
                                           value={dateRange.start}
                                           className="bg-main/5 text-main text-[10px] font-bold rounded-md pl-9 pr-3 py-3 w-full outline-none border border-main/10 focus:border-primary/45 uppercase" 
                                           onChange={e => {
                                               Haptics.light();
                                               setDateRange(prev => ({...prev, start: e.target.value}));
                                           }}
                                       />
                                   </div>
                                   <div className="relative">
                                       <CalendarIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/40 pointer-events-none"/>
                                       <input 
                                           type="date" 
                                           value={dateRange.end}
                                           className="bg-main/5 text-main text-[10px] font-bold rounded-md pl-9 pr-3 py-3 w-full outline-none border border-main/10 focus:border-primary/45 uppercase" 
                                           onChange={e => {
                                               Haptics.light();
                                               setDateRange(prev => ({...prev, end: e.target.value}));
                                           }}
                                       />
                                   </div>
                               </div>
                           </div>

                           {/* Sort Option */}
                           <div className="space-y-2">
                               <label className="text-[8px] font-black text-muted/50 uppercase tracking-[0.2em] ml-1">Sort By</label>
                               <div className="flex bg-main/5 p-1 rounded-md border border-main/10 font-bold">
                                   <button 
                                       onClick={() => { Haptics.light(); toggleSort('date'); }} 
                                       className={`flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-[0.1em] flex items-center justify-center gap-1.5 transition-all ${sortKey === 'date' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted/60 hover:text-main'}`}
                                   >
                                       Date {sortKey === 'date' && (sortDirection === 'asc' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
                                   </button>
                                   <button 
                                       onClick={() => { Haptics.light(); toggleSort('amount'); }} 
                                       className={`flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-[0.1em] flex items-center justify-center gap-1.5 transition-all ${sortKey === 'amount' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-muted/60 hover:text-main'}`}
                                   >
                                       Amount {sortKey === 'amount' && (sortDirection === 'asc' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
                                   </button>
                               </div>
                           </div>

                           {/* Tags Option */}
                           {allTags.length > 0 && (
                               <div className="space-y-2">
                                   <label className="text-[8px] font-black text-muted/50 uppercase tracking-[0.2em] ml-1">Tags</label>
                                   <div className="flex flex-wrap gap-1.5">
                                       {allTags.map(tag => (
                                           <button 
                                               key={tag} 
                                               onClick={() => {
                                                   Haptics.light();
                                                   setSearchTerm(prev => prev === tag ? '' : tag);
                                               }} 
                                               className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${searchTerm === tag ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-main/5 text-muted border-main/10 hover:border-primary/30'}`}
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
                               className="w-full py-3.5 rounded-md bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-black text-[9px] uppercase tracking-[0.25em] border border-rose-500/20 active:scale-95 transition-all mt-4"
                           >
                               Clear Filters
                           </button>
                       </div>
                   </div>
               </div>
           )}
      </div>
    );
};
