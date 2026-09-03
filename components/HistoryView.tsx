import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  MagnifyingGlass as Search,
  X,
  FileText,
  Calendar as CalendarIcon,
  ChartPie as PieChart,
  Shuffle,
  Trash as Trash2,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Receipt,
  Plus
} from '@phosphor-icons/react';
import { Transaction, TransactionType, AppData } from '../types';
import { CategoryIcon } from './shared/CategoryIcon';
import { CalendarView } from './history/CalendarView';
import { SankeyChart } from './history/SankeyChart';
import { HistoryStats } from './history/HistoryStats';
import { Haptics } from '../services/haptics';
import { Pagination, GlassCheckbox } from './shared/CommonUI';
import { TablePaginationFooter } from './shared/TablePaginationFooter';
import { EmptyStateSeeder } from './shared/EmptyStateSeeder';

interface HistoryProps {
  data: AppData;
  updateData?: (d: Partial<AppData>) => void;
  onRequestDelete: (id: string) => void;
  formatMoney: (val: number, sym: string) => string;
  onEditTransaction: (t: Transaction) => void;
  isDesktop?: boolean;
}

type SortKey = 'date' | 'amount' | 'category';
type SortDirection = 'asc' | 'desc';

export const HistoryView: React.FC<HistoryProps> = ({ 
  data, 
  updateData, 
  onRequestDelete, 
  formatMoney, 
  onEditTransaction,
  isDesktop: propIsDesktop
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'stats' | 'flow'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'EXPENSE' | 'INCOME'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const ITEMS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(!propIsDesktop && typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const handleResize = () => {
      if (propIsDesktop !== undefined) {
        setIsMobile(!propIsDesktop);
      } else {
        setIsMobile(window.innerWidth < 768);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [propIsDesktop]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dateRange.start) count++;
    if (dateRange.end) count++;
    if (typeFilter !== 'ALL') count++;
    if (searchTerm && searchTerm.startsWith('#')) count++;
    return count;
  }, [dateRange, typeFilter, searchTerm]);

  const walletTransactions = useMemo(() => 
    (data.transactions || []).filter((t: Transaction) => {
      const isWalletMatch = t.walletId === data.currentWalletId;
      if (data.settings.privacyMode && t.isPrivate) return false;
      return isWalletMatch;
    })
  , [data.transactions, data.currentWalletId, data.settings.privacyMode]);
  
  const allTags = useMemo(() => 
    Array.from(new Set(walletTransactions.flatMap(t => t.note?.match(/#[\w]+/g) || [])))
  , [walletTransactions]);

  const filteredTransactions = useMemo(() => {
    let filtered = walletTransactions.filter(t => {
      const walletName = data.wallets.find(w => w.id === t.walletId)?.name || '';
      const splitContent = t.splits?.map(s => `${s.category} ${s.note || ''} ${s.amount}`).join(' ') || '';
      
      const searchContent = `${t.note || ''} ${t.category} ${t.amount} ${walletName} ${splitContent}`.toLowerCase();
      const matchSearch = searchTerm ? searchContent.includes(searchTerm.toLowerCase()) : true;
      const matchType = typeFilter === 'ALL' || t.type === typeFilter;
      
      const matchStart = dateRange.start ? t.date >= dateRange.start : true;
      const matchEnd = dateRange.end ? t.date <= dateRange.end + 'T23:59:59' : true;
      return matchSearch && matchType && matchStart && matchEnd;
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
  }, [walletTransactions, searchTerm, typeFilter, dateRange, sortKey, sortDirection, data.wallets]);

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter, dateRange, sortKey, sortDirection]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAllCurrentPage = () => {
    const pageIds = paginatedTransactions.map(t => t.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} selected transactions?`)) {
      selectedIds.forEach(id => onRequestDelete(id));
      setSelectedIds([]);
      Haptics.success();
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

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDirection(key === 'date' ? 'desc' : 'asc'); }
  };

  return (
    <div className="animate-in fade-in duration-300 w-full mx-auto pb-6 select-none space-y-4">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-[18px] sm:text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">
            Transactions Ledger
          </h2>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
            Audit, inspect, and analyze all activity across your unified accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="h-[32px] px-3 bg-[var(--status-error-bg)] text-[var(--status-error-fg)] border border-[var(--status-error-fg)]/30 rounded-[6px] text-[12px] font-medium flex items-center gap-1.5 hover:opacity-90 transition-all cursor-pointer"
            >
              <Trash2 size={14} strokeWidth={1.5} />
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}

          <button 
            onClick={exportCSV} 
            className="h-[32px] px-3 text-[12px] font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download size={14} strokeWidth={1.5} /> 
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and View Modes Bar */}
      <div className="bg-[var(--bg-surface)] p-3 sm:p-4 rounded-[10px] border border-[var(--border-default)] space-y-3">
        
        {/* Search & Date Input Row */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 flex items-center gap-2 bg-[var(--bg-subtle)] rounded-[6px] px-3 py-1.5 border border-[var(--border-default)] focus-within:border-[var(--accent-solid)] transition-colors">
            <Search size={14} className="text-[var(--text-muted)] shrink-0 stroke-[1.5px]" />
            <input 
              type="text" 
              placeholder="Search by note, merchant, category, or tag..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="bg-transparent text-[12px] text-[var(--text-primary)] w-full outline-none placeholder:text-[var(--text-muted)]" 
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
                <X size={13} strokeWidth={1.5} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))}
                className="h-[32px] bg-[var(--field-bg)] text-[var(--text-primary)] text-[11px] rounded-[6px] px-2.5 outline-none border border-[var(--field-border)]"
                title="Start Date"
              />
            </div>
            <span className="text-[var(--text-muted)] text-[11px]">to</span>
            <div className="relative">
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))}
                className="h-[32px] bg-[var(--field-bg)] text-[var(--text-primary)] text-[11px] rounded-[6px] px-2.5 outline-none border border-[var(--field-border)]"
                title="End Date"
              />
            </div>
          </div>
        </div>

        {/* Filter Chips Row */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar pt-0.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => { Haptics.light(); setTypeFilter('ALL'); setSearchTerm(''); setDateRange({start: '', end: ''}); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                typeFilter === 'ALL' && !searchTerm && !dateRange.start && !dateRange.end
                  ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] border-[var(--accent-solid)] font-semibold'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => { Haptics.light(); setTypeFilter(typeFilter === 'EXPENSE' ? 'ALL' : 'EXPENSE'); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                typeFilter === 'EXPENSE'
                  ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] border-[var(--accent-solid)] font-semibold'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => { Haptics.light(); setTypeFilter(typeFilter === 'INCOME' ? 'ALL' : 'INCOME'); }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                typeFilter === 'INCOME'
                  ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] border-[var(--accent-solid)] font-semibold'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
              }`}
            >
              Income
            </button>

            {allTags.slice(0, 6).map(tag => (
              <button 
                key={tag} 
                onClick={() => { Haptics.light(); setSearchTerm(prev => prev === tag ? '' : tag); }} 
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono border transition-all cursor-pointer ${
                  searchTerm === tag 
                    ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] border-[var(--accent-solid)] font-semibold' 
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* View Mode Segmented Controls */}
          <div className="flex p-0.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[11px] shrink-0">
            {[
              { id: 'list', icon: FileText, label: 'Ledger' },
              { id: 'calendar', icon: CalendarIcon, label: 'Calendar' },
              { id: 'stats', icon: PieChart, label: 'Stats' },
              { id: 'flow', icon: Shuffle, label: 'Sankey' }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { Haptics.light(); setViewMode(tab.id as any); }}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-[4px] font-medium transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <Icon size={12} strokeWidth={1.5} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main View Mode Panes */}
      {viewMode === 'calendar' && (
        <CalendarView transactions={filteredTransactions} onSelectDate={(d) => setDateRange({ start: d, end: d })} />
      )}

      {viewMode === 'stats' && (
        <HistoryStats transactions={filteredTransactions} />
      )}

      {viewMode === 'flow' && (
        <SankeyChart transactions={filteredTransactions} />
      )}

      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <EmptyStateSeeder onSeed={updateData} />
          ) : (
            <div className="bg-[var(--bg-surface)] rounded-[10px] border border-[var(--border-default)] overflow-hidden shadow-xs">
              
              {/* Responsive Layout: Table on Tablet/Desktop, Card Rows on Mobile */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]/40 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
                      <th className="px-4 py-2.5 w-10">
                        <GlassCheckbox 
                          checked={paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedIds.includes(t.id))}
                          onChange={selectAllCurrentPage}
                        />
                      </th>
                      <th 
                        className="px-4 py-2.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                        onClick={() => toggleSort('date')}
                      >
                        <div className="flex items-center gap-1">
                          Date {sortKey === 'date' && (sortDirection === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-2.5 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                        onClick={() => toggleSort('category')}
                      >
                        <div className="flex items-center gap-1">
                          Category {sortKey === 'category' && (sortDirection === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
                        </div>
                      </th>
                      <th className="px-4 py-2.5">
                        Note / Description
                      </th>
                      <th 
                        className="px-4 py-2.5 text-right cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                        onClick={() => toggleSort('amount')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Amount {sortKey === 'amount' && (sortDirection === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {paginatedTransactions.map((t) => {
                      const isSelected = selectedIds.includes(t.id);
                      return (
                        <tr 
                          key={t.id} 
                          onClick={() => onEditTransaction(t)} 
                          className={`hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer ${
                            isSelected ? 'bg-[var(--bg-subtle)]' : ''
                          }`}
                        >
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <GlassCheckbox 
                              checked={isSelected}
                              onChange={() => toggleSelect(t.id)}
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-[12px] font-medium text-[var(--text-primary)] font-mono block">
                              {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">
                              {new Date(t.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <CategoryIcon category={t.category} color={data.categories?.find(c => c.name === t.category)?.color} />
                              <span className="text-[12px] font-medium text-[var(--text-primary)]">{t.category}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[12px] text-[var(--text-primary)] line-clamp-1 max-w-[340px]">
                              {t.note || <span className="text-[var(--text-muted)] italic">No note</span>}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <span className={`text-[13px] font-semibold font-mono tracking-tight ${
                              t.type === TransactionType.INCOME ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-primary)]'
                            }`}>
                              {t.type === TransactionType.INCOME ? '+' : '-'}{formatMoney(t.amount, data.settings.currencySymbol)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Rows List */}
              <div className="block md:hidden divide-y divide-[var(--border-default)]">
                {paginatedTransactions.map((t) => {
                  const isSelected = selectedIds.includes(t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => onEditTransaction(t)}
                      className={`p-3.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer ${
                        isSelected ? 'bg-[var(--bg-subtle)]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div onClick={e => { e.stopPropagation(); toggleSelect(t.id); }}>
                          <GlassCheckbox checked={isSelected} onChange={() => toggleSelect(t.id)} />
                        </div>
                        <CategoryIcon category={t.category} color={data.categories?.find(c => c.name === t.category)?.color} />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                            {t.category}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">
                            {t.note || new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[13px] font-semibold font-mono ${
                          t.type === TransactionType.INCOME ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-primary)]'
                        }`}>
                          {t.type === TransactionType.INCOME ? '+' : '-'}{formatMoney(t.amount, data.settings.currencySymbol)}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block font-mono">
                          {new Date(t.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Bar */}
              <div className="px-4 py-3 border-t border-[var(--border-default)] flex items-center justify-between text-[11px]">
                <span className="text-[var(--text-muted)]">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length} records
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="h-[28px] px-2.5 rounded-[4px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-[var(--text-muted)] font-mono px-1">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="h-[28px] px-2.5 rounded-[4px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
};
