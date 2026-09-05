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
  Plus,
  DotsThree,
  Check,
  PencilSimple,
  Copy
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
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => setActiveRowMenu(null);
    if (activeRowMenu) {
      window.addEventListener('click', handleCloseMenu);
    }
    return () => window.removeEventListener('click', handleCloseMenu);
  }, [activeRowMenu]);

  const handleDuplicateTransaction = (t: Transaction) => {
    Haptics.light();
    if (!updateData) return;
    const newTx: Transaction = {
      ...t,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      date: new Date().toISOString()
    };
    updateData({ transactions: [newTx, ...(data.transactions || [])] });
  };

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
    if (selectedIds.length === 0 || !data) return;
    if (confirm(`Delete ${selectedIds.length} selected transactions?`)) {
      updateData({
        transactions: data.transactions.filter(t => !selectedIds.includes(t.id))
      });
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

      {/* Cloudflare Underline Tab Bar (No Pill Shapes, No Outer Container) */}
      <div className="border-b border-[var(--border-default)] flex items-center justify-between gap-4 overflow-x-auto no-scrollbar pt-1">
        {/* Left: Type Filter Tabs */}
        <div className="flex items-center gap-6 shrink-0">
          <button
            onClick={() => { Haptics.light(); setTypeFilter('ALL'); }}
            className={`pb-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              typeFilter === 'ALL'
                ? 'border-[var(--text-primary)] text-[var(--text-primary)] font-semibold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>All</span>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              {data.transactions.length}
            </span>
          </button>
          <button
            onClick={() => { Haptics.light(); setTypeFilter('EXPENSE'); }}
            className={`pb-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              typeFilter === 'EXPENSE'
                ? 'border-[var(--text-primary)] text-[var(--text-primary)] font-semibold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>Expenses</span>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              {data.transactions.filter(t => t.type === TransactionType.EXPENSE).length}
            </span>
          </button>
          <button
            onClick={() => { Haptics.light(); setTypeFilter('INCOME'); }}
            className={`pb-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              typeFilter === 'INCOME'
                ? 'border-[var(--text-primary)] text-[var(--text-primary)] font-semibold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <span>Income</span>
            <span className="text-[11px] font-mono text-[var(--text-muted)]">
              {data.transactions.filter(t => t.type === TransactionType.INCOME).length}
            </span>
          </button>
        </div>

        {/* Right: View Mode Underline Tabs */}
        <div className="flex items-center gap-5 shrink-0">
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
                className={`pb-2.5 text-[13px] font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'border-[var(--text-primary)] text-[var(--text-primary)] font-semibold'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon size={14} strokeWidth={1.5} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Flat Toolbar: Search & Date Inputs - NO Outer Container Card */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Search Input: Clean 1px border */}
        <div className="flex-1 flex items-center gap-2 bg-[var(--bg-surface)] rounded-[6px] px-3 h-[36px] border border-[var(--border-default)] focus-within:border-[var(--border-active)] transition-colors">
          <Search size={14} className="text-[var(--text-muted)] shrink-0 stroke-[1.5px]" />
          <input 
            type="text" 
            placeholder="Search note, category, or merchant..." 
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

        {/* Date Inputs: Clean 1px border */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <div className="relative">
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))}
              className="h-[36px] bg-[var(--bg-surface)] text-[var(--text-primary)] text-[11px] rounded-[6px] px-2.5 outline-none border border-[var(--border-default)] focus:border-[var(--border-active)] transition-colors"
              title="Start Date"
            />
          </div>
          <span className="text-[var(--text-muted)] text-[11px]">to</span>
          <div className="relative">
            <input 
              type="date" 
              value={dateRange.end} 
              onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))}
              className="h-[36px] bg-[var(--bg-surface)] text-[var(--text-primary)] text-[11px] rounded-[6px] px-2.5 outline-none border border-[var(--border-default)] focus:border-[var(--border-active)] transition-colors"
              title="End Date"
            />
          </div>
          {(dateRange.start || dateRange.end) && (
            <button
              type="button"
              onClick={() => setDateRange({start: '', end: ''})}
              className="h-[36px] px-2.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main View Mode Panes */}
      {viewMode === 'calendar' && (
        <CalendarView 
          transactions={filteredTransactions} 
          onSelectDate={(d) => setDateRange({ start: d, end: d })}
          currencySymbol={data.settings.currencySymbol}
          formatMoney={formatMoney}
        />
      )}

      {viewMode === 'stats' && (
        <HistoryStats 
          transactions={filteredTransactions} 
          data={data} 
          formatMoney={formatMoney} 
        />
      )}

      {viewMode === 'flow' && (
        <SankeyChart 
          transactions={filteredTransactions} 
          categories={data?.categories || []} 
        />
      )}

      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <EmptyStateSeeder data={data} updateData={updateData} />
          ) : (
            <div className="bg-[var(--bg-surface)] rounded-[8px] border border-[var(--border-default)] shadow-xs">
              
              {/* Cloudflare Bulk Selection Bar: only visible when entries are selected */}
              {selectedIds.length > 0 && (
                <div className="px-4 py-2 bg-[var(--bg-subtle)] border-b border-[var(--border-default)] flex items-center justify-between text-[12px] animate-in fade-in duration-150">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-[var(--text-primary)] font-mono">
                      {selectedIds.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    >
                      Cancel selection
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleBatchDelete}
                    className="h-[26px] px-2.5 bg-[var(--status-error-bg)] text-[var(--status-error-fg)] hover:opacity-90 rounded-[4px] font-medium text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 size={12} strokeWidth={1.5} />
                    <span>Delete ({selectedIds.length})</span>
                  </button>
                </div>
              )}

              {/* Table Section Header (Cloudflare / Lumen layout) */}
              <div className="px-4 py-2 border-b border-[var(--border-default)] flex items-center justify-between">
                <span className="text-[12px] font-medium text-[var(--text-primary)]">
                  All records
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  {filteredTransactions.length} {filteredTransactions.length === 1 ? 'record' : 'records'}
                </span>
              </div>

              {/* Responsive Layout: Table on Tablet/Desktop, Card Rows on Mobile */}
              <div className="hidden md:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border-default)] bg-[var(--bg-surface)] text-[10.5px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
                      {selectedIds.length > 0 && (
                        <th className="px-4 py-2 w-10">
                          <GlassCheckbox 
                            checked={paginatedTransactions.length > 0 && paginatedTransactions.every((t, idx) => selectedIds.includes(t.id ? String(t.id) : `tx_${idx}_${t.date}`))}
                            onChange={selectAllCurrentPage}
                          />
                        </th>
                      )}
                      <th className="px-4 py-2 w-24">Type</th>
                      <th 
                        className="px-4 py-2 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                        onClick={() => toggleSort('date')}
                      >
                        <div className="flex items-center gap-1">
                          Date {sortKey === 'date' && (sortDirection === 'asc' ? <ArrowUp size={11}/> : <ArrowDown size={11}/>)}
                        </div>
                      </th>
                      <th 
                        className="px-4 py-2 cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                        onClick={() => toggleSort('category')}
                      >
                        <div className="flex items-center gap-1">
                          Category {sortKey === 'category' && (sortDirection === 'asc' ? <ArrowUp size={11}/> : <ArrowDown size={11}/>)}
                        </div>
                      </th>
                      <th className="px-4 py-2">
                        Note / Description
                      </th>
                      <th 
                        className="px-4 py-2 text-right cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                        onClick={() => toggleSort('amount')}
                      >
                        <div className="flex items-center justify-end gap-1">
                          Amount {sortKey === 'amount' && (sortDirection === 'asc' ? <ArrowUp size={11}/> : <ArrowDown size={11}/>)}
                        </div>
                      </th>
                      <th className="px-3 py-2 w-10 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-default)]">
                    {paginatedTransactions.map((t, idx) => {
                      const txId = t.id ? String(t.id) : `tx_${idx}_${t.date || ''}_${t.amount || 0}`;
                      const isSelected = selectedIds.includes(txId);
                      const isMenuOpen = activeRowMenu === txId;
                      const openUpwards = idx >= Math.max(1, paginatedTransactions.length - 2);

                      return (
                        <tr 
                          key={txId} 
                          onClick={() => onEditTransaction(t)} 
                          className={`hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer ${
                            isSelected ? 'bg-[var(--bg-subtle)]' : ''
                          }`}
                        >
                          {selectedIds.length > 0 && (
                            <td className="px-4 py-2" onClick={e => e.stopPropagation()}>
                              <GlassCheckbox 
                                checked={isSelected}
                                onChange={() => toggleSelect(txId)}
                              />
                            </td>
                          )}
                          <td className="px-4 py-2 whitespace-nowrap">
                            {t.type === TransactionType.INCOME ? (
                              <span className="pill pill--income">
                                Income
                              </span>
                            ) : t.type === TransactionType.TRANSFER ? (
                              <span className="pill pill--transfer">
                                Transfer
                              </span>
                            ) : (
                              <span className="pill pill--expense">
                                Expense
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className="text-[12px] font-medium text-[var(--text-primary)] font-mono">
                              {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono ml-2">
                              {new Date(t.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <CategoryIcon category={t.category} color={data.categories?.find(c => c.name === t.category)?.color} />
                              <span className="text-[12px] font-medium text-[var(--text-primary)]">{t.category}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <span className="text-[12px] text-[var(--text-primary)] line-clamp-1 max-w-[340px]">
                              {t.note || <span className="text-[var(--text-muted)] italic">No note</span>}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right whitespace-nowrap">
                            <span className={`text-[12.5px] font-semibold font-mono tracking-tight ${
                              t.type === TransactionType.INCOME ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-primary)]'
                            }`}>
                              {t.type === TransactionType.INCOME ? '+' : '-'}{formatMoney(t.amount, data.settings.currencySymbol)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right whitespace-nowrap relative" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveRowMenu(isMenuOpen ? null : txId);
                              }}
                              className="w-6 h-6 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] inline-flex items-center justify-center transition-colors cursor-pointer"
                              title="Row options"
                            >
                              <DotsThree size={16} weight="bold" />
                            </button>
                            {isMenuOpen && (
                              <>
                                <div
                                  className="fixed inset-0 z-[40]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveRowMenu(null);
                                  }}
                                />
                                <div className={`absolute right-3 z-[50] w-36 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[6px] shadow-[0_12px_32px_rgba(0,0,0,0.65)] p-1 text-[12px] animate-in fade-in zoom-in-95 duration-100 text-left select-none ${
                                  openUpwards ? 'bottom-7' : 'top-8'
                                }`}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      toggleSelect(txId);
                                      setActiveRowMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors text-[11.5px]"
                                  >
                                    <Check size={13} strokeWidth={1.5} />
                                    <span>{isSelected ? 'Deselect' : 'Select'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onEditTransaction(t);
                                      setActiveRowMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors text-[11.5px]"
                                  >
                                    <PencilSimple size={13} strokeWidth={1.5} />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDuplicateTransaction(t);
                                      setActiveRowMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors text-[11.5px]"
                                  >
                                    <Copy size={13} strokeWidth={1.5} />
                                    <span>Duplicate</span>
                                  </button>
                                  <div className="my-1 border-t border-[var(--border-default)]" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onRequestDelete(txId);
                                      setActiveRowMenu(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[4px] text-[var(--status-error-fg)] hover:bg-[var(--status-error-bg)] cursor-pointer transition-colors text-[11.5px]"
                                  >
                                    <Trash2 size={13} strokeWidth={1.5} />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Rows List */}
              <div className="block md:hidden divide-y divide-[var(--border-default)]">
                {paginatedTransactions.map((t, idx) => {
                  const txId = t.id ? String(t.id) : `tx_${idx}_${t.date || ''}_${t.amount || 0}`;
                  const isSelected = selectedIds.includes(txId);
                  const isMenuOpen = activeRowMenu === txId;

                  return (
                    <div
                      key={txId}
                      onClick={() => onEditTransaction(t)}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer ${
                        isSelected ? 'bg-[var(--bg-subtle)]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {selectedIds.length > 0 && (
                          <div onClick={e => { e.stopPropagation(); toggleSelect(txId); }}>
                            <GlassCheckbox checked={isSelected} onChange={() => toggleSelect(txId)} />
                          </div>
                        )}
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

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className={`text-[13px] font-semibold font-mono ${
                            t.type === TransactionType.INCOME ? 'text-[var(--status-success-fg)]' : 'text-[var(--text-primary)]'
                          }`}>
                            {t.type === TransactionType.INCOME ? '+' : '-'}{formatMoney(t.amount, data.settings.currencySymbol)}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] block font-mono">
                            {new Date(t.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                          </span>
                        </div>

                        <div className="relative" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveRowMenu(isMenuOpen ? null : txId);
                            }}
                            className="w-7 h-7 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] inline-flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <DotsThree size={18} weight="bold" />
                          </button>
                          {isMenuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-[40]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveRowMenu(null);
                                }}
                              />
                              <div className="absolute right-0 top-8 z-[50] w-36 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[6px] shadow-[0_12px_32px_rgba(0,0,0,0.65)] p-1 text-[12px] animate-in fade-in zoom-in-95 duration-100 text-left select-none">
                                <button
                                  type="button"
                                  onClick={() => {
                                    toggleSelect(txId);
                                    setActiveRowMenu(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors"
                                >
                                  <Check size={13} strokeWidth={1.5} />
                                  <span>{isSelected ? 'Deselect' : 'Select'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onEditTransaction(t);
                                    setActiveRowMenu(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors"
                                >
                                  <PencilSimple size={13} strokeWidth={1.5} />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDuplicateTransaction(t);
                                    setActiveRowMenu(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors"
                                >
                                  <Copy size={13} strokeWidth={1.5} />
                                  <span>Duplicate</span>
                                </button>
                                <div className="my-1 border-t border-[var(--border-default)]" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    onRequestDelete(txId);
                                    setActiveRowMenu(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--status-error-fg)] hover:bg-[var(--status-error-bg)] cursor-pointer transition-colors"
                                >
                                  <Trash2 size={13} strokeWidth={1.5} />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Bar */}
              <div className="px-4 py-2 border-t border-[var(--border-default)] flex items-center justify-between text-[11px]">
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
