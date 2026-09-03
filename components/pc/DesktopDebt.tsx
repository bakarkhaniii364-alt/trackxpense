import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Check,
  Trash as Trash2,
  Calendar as CalendarIcon,
  Clock,
  User,
  ArrowUpRight,
  ArrowDownRight,
  X,
  MagnifyingGlass as Search,
  DotsThreeVertical as MoreVertical,
  PlusCircle,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  ArrowCounterClockwise as RotateCcw
} from '@phosphor-icons/react';
import { Debt, AppData, Transaction, TransactionType, Category } from '../../types';
import { GlassCheckbox, Pagination } from '../shared/CommonUI';
import { EmptyStateSeeder } from '../shared/EmptyStateSeeder';
import { TablePaginationFooter } from '../shared/TablePaginationFooter';

interface DesktopDebtProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  formatMoney: (val: number, sym: string) => string;
  onSettleTransaction: (t: Transaction) => void;
  onAddPayment: (debtId: string, payment: any) => void;
}

export const DesktopDebt: React.FC<DesktopDebtProps> = ({ 
  data, 
  updateData, 
  formatMoney, 
  onSettleTransaction, 
  onAddPayment 
}) => {
  // Modal / Filter States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activeDebtId, setActiveDebtId] = useState<string | null>(null);
  const [activeDebtMenuId, setActiveDebtMenuId] = useState<string | null>(null);

  // Payment Form States
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');

  // Add Debt Form States
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'I_OWE' | 'OWES_ME'>('OWES_ME');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Filter, Sort, Selection & Pagination States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ACTIVE' | 'SETTLED' | 'OWES_ME' | 'I_OWE'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<'person' | 'type' | 'dueDate' | 'amount'>('person');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Batch Delete / Batch Settle Modals
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // Stats
  const debts = data?.debts || [];
  const stats = useMemo(() => {
    const toPay = debts.filter(d => !d.isSettled && d.type === 'I_OWE').reduce((s, d) => s + d.amount, 0);
    const toCollect = debts.filter(d => !d.isSettled && d.type === 'OWES_ME').reduce((s, d) => s + d.amount, 0);
    return { toPay, toCollect, net: toCollect - toPay };
  }, [debts]);

  // Filtering & Sorting
  const filteredDebts = useMemo(() => {
    let list = debts.filter(d => {
      const matchesSearch = d.person.toLowerCase().includes(searchTerm.toLowerCase()) || d.note?.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesType = true;
      if (typeFilter === 'ACTIVE') matchesType = !d.isSettled;
      else if (typeFilter === 'SETTLED') matchesType = d.isSettled;
      else if (typeFilter === 'OWES_ME') matchesType = d.type === 'OWES_ME';
      else if (typeFilter === 'I_OWE') matchesType = d.type === 'I_OWE';
      return matchesSearch && matchesType;
    });

    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortKey === 'person') {
        valA = a.person.toLowerCase();
        valB = b.person.toLowerCase();
      } else if (sortKey === 'type') {
        valA = a.type;
        valB = b.type;
      } else if (sortKey === 'dueDate') {
        valA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
        valB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      } else if (sortKey === 'amount') {
        valA = a.amount;
        valB = b.amount;
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [debts, searchTerm, typeFilter, sortKey, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredDebts.length / pageSize) || 1;
  const paginatedDebts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDebts.slice(start, start + pageSize);
  }, [filteredDebts, currentPage, pageSize]);

  const handleSort = (key: 'person' | 'type' | 'dueDate' | 'amount') => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAllCurrentPage = () => {
    const pageIds = paginatedDebts.map(d => d.id);
    const allSelected = pageIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleSettle = (debt: Debt) => {
    const isSettling = !debt.isSettled;
    const updated = data.debts.map(d => d.id === debt.id ? { ...d, isSettled: isSettling } : d);
    updateData({ debts: updated });

    if (isSettling) {
      const isExpense = debt.type === 'I_OWE';
      onSettleTransaction({
        id: Date.now().toString(),
        amount: debt.amount,
        type: isExpense ? TransactionType.EXPENSE : TransactionType.INCOME,
        category: isExpense ? Category.LOAN_PAYMENT : Category.LOAN,
        date: new Date().toISOString(),
        note: isExpense ? `Debt paid to ${debt.person}` : `Debt repayment from ${debt.person}`,
        walletId: data.currentWalletId
      });
    }
  };

  const handleAddDebt = () => {
    if (!amount || !person) return;
    const newDebt: Debt = {
      id: Date.now().toString(),
      person: person.trim() || 'Unspecified',
      amount: parseFloat(amount),
      type,
      note,
      isSettled: false,
      dueDate: dueDate || undefined
    };
    updateData({ debts: [newDebt, ...data.debts] });
    setIsAddOpen(false);
    setPerson(''); setAmount(''); setNote(''); setDueDate('');
  };

  const confirmDelete = () => {
    if (deleteId) {
      updateData({ debts: data.debts.filter(d => d.id !== deleteId) });
      setDeleteId(null);
    }
  };

  const handleBatchDelete = () => {
    updateData({ debts: data.debts.filter(d => !selectedIds.includes(d.id)) });
    setSelectedIds([]);
    setIsBatchDeleteModalOpen(false);
  };

  const handleBatchSettle = () => {
    const updated = data.debts.map(d => selectedIds.includes(d.id) ? { ...d, isSettled: true } : d);
    updateData({ debts: updated });
    setSelectedIds([]);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300 mx-auto pb-6 px-0.5 pt-0.5">
      
      {/* Cloudflare-Style Section Header Outside Card */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Debts & Loans</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Track active debts, loans, borrowing balances, and repayment progress.</p>
        </div>
        <button
          onClick={() => {
            setPerson('');
            setAmount('');
            setNote('');
            setDueDate('');
            setIsAddOpen(true);
          }}
          className="btn btn--primary h-[32px] px-3.5 text-[12px] shrink-0"
        >
          <Plus size={14} strokeWidth={1.5} />
          <span>Add debt entry</span>
        </button>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 rounded-[10px] space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">Net Debt Balance</span>
          <p className={`text-2xl font-bold font-mono tracking-tight ${stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.net >= 0 ? '+' : ''}{formatMoney(stats.net, data.settings.currencySymbol)}
          </p>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 rounded-[10px] space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">Receivables (Owed to Me)</span>
          <p className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
            {formatMoney(stats.toCollect, data.settings.currencySymbol)}
          </p>
        </div>
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-5 rounded-[10px] space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">Payables (I Owe)</span>
          <p className="text-2xl font-bold font-mono tracking-tight text-rose-400">
            {formatMoney(stats.toPay, data.settings.currencySymbol)}
          </p>
        </div>
      </div>

      {/* Toolbar: Search & Type Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="relative w-full sm:w-[320px]">
          <Search size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by counterparty name or note..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full h-[36px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] pl-9 pr-3 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--border-active)] transition-all"
          />
        </div>

        {/* Type Filter Pills */}
        <div className="tabs shrink-0 self-start sm:self-auto">
          {(['ALL', 'ACTIVE', 'SETTLED', 'OWES_ME', 'I_OWE'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => { setTypeFilter(filterType); setCurrentPage(1); }}
              className={`tab ${typeFilter === filterType ? 'is-active' : ''}`}
            >
              {filterType === 'ALL' ? 'All' : filterType === 'ACTIVE' ? 'Active' : filterType === 'SETTLED' ? 'Settled' : filterType === 'OWES_ME' ? 'Receivables' : 'Payables'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Universal Cloudflare Table or Centered Empty State */}
      {filteredDebts.length > 0 ? (
        <div className="bg-[var(--bg-surface)] rounded-[10px] border border-[var(--border-default)] overflow-visible relative shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]/50">
                <th className="px-4 py-3 w-10">
                  <GlassCheckbox 
                    checked={paginatedDebts.length > 0 && paginatedDebts.every(d => selectedIds.includes(d.id))}
                    onChange={selectAllCurrentPage}
                  />
                </th>
                <th 
                  className="px-4 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-1">
                    Type / Direction {sortKey === 'type' && (sortDirection === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
                  onClick={() => handleSort('person')}
                >
                  <div className="flex items-center gap-1">
                    Counterparty {sortKey === 'person' && (sortDirection === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
                  </div>
                </th>
                <th className="px-4 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] select-none">
                  Repayment Progress
                </th>
                <th 
                  className="px-4 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none"
                  onClick={() => handleSort('dueDate')}
                >
                  <div className="flex items-center gap-1">
                    Due Date {sortKey === 'dueDate' && (sortDirection === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] cursor-pointer hover:text-[var(--text-primary)] transition-colors text-right select-none"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Total Amount {sortKey === 'amount' && (sortDirection === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>)}
                  </div>
                </th>
                <th className="px-4 py-3 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em] text-right select-none">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-default)]">
              {paginatedDebts.map((d, index) => {
                const isReceivable = d.type === 'OWES_ME';
                const isSelected = selectedIds.includes(d.id);
                const totalPaid = (d.payments || []).reduce((s, p) => s + p.amount, 0);
                const paidPercentage = Math.min((totalPaid / d.amount) * 100, 100);
                const isMenuOpen = activeDebtMenuId === d.id;
                const isNearBottom = index >= Math.max(0, paginatedDebts.length - 2);

                return (
                  <tr 
                    key={d.id} 
                    className={`hover:bg-[var(--bg-surface-hover)] transition-colors ${
                      isSelected ? 'bg-[var(--bg-subtle)]' : ''
                    } ${d.isSettled ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-3.5">
                      <GlassCheckbox 
                        checked={isSelected}
                        onChange={() => toggleSelect(d.id)}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {isReceivable ? (
                          <ArrowUpRight size={18} strokeWidth={1.5} className="text-emerald-400 shrink-0" />
                        ) : (
                          <ArrowDownRight size={18} strokeWidth={1.5} className="text-rose-400 shrink-0" />
                        )}
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[4px] ${
                          isReceivable
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {isReceivable ? 'Receivable' : 'Payable'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div>
                        <span className="text-[13px] font-medium text-[var(--text-primary)] block">{d.person}</span>
                        {d.note && <span className="text-[11px] text-[var(--text-muted)] block mt-0.5 truncate max-w-[200px]">{d.note}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {d.payments && d.payments.length > 0 ? (
                        <div className="w-[160px] space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-[var(--text-muted)]">{Math.round(paidPercentage)}% Paid</span>
                            <span className="text-emerald-400 font-medium">{formatMoney(totalPaid, data.settings.currencySymbol)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden border border-[var(--border-default)]">
                            <div className="h-full bg-emerald-400 transition-all duration-300" style={{ width: `${paidPercentage}%` }} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)] font-mono">
                          {d.isSettled ? 'Settled in full' : 'No payments yet'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {d.dueDate ? (
                        <span className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)] font-mono">
                          <Clock size={12} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                          {new Date(d.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)] font-mono">No due date</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`text-[13px] font-bold font-mono ${isReceivable ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>
                        {formatMoney(d.amount, data.settings.currencySymbol)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setActiveDebtMenuId(isMenuOpen ? null : d.id)}
                          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[6px] hover:bg-[var(--bg-subtle)] transition-all"
                          title="Actions"
                        >
                          <MoreVertical size={15} strokeWidth={1.5} />
                        </button>

                        {/* Context Menu Dropdown */}
                        {isMenuOpen && (
                          <>
                            <div 
                              className="fixed inset-0 z-[50]" 
                              onClick={() => setActiveDebtMenuId(null)} 
                            />
                            <div className={`absolute right-0 ${isNearBottom ? 'bottom-7' : 'top-7'} z-[60] w-40 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-2xl p-1 text-[12px] animate-in fade-in zoom-in-95 duration-150`}>
                              {!d.isSettled && (
                                <button
                                  onClick={() => {
                                    setActiveDebtId(d.id);
                                    setIsPaymentOpen(true);
                                    setActiveDebtMenuId(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[5px] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors text-left"
                                >
                                  <PlusCircle size={13} strokeWidth={1.5} />
                                  <span>Add Payment</span>
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  handleToggleSettle(d);
                                  setActiveDebtMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[5px] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors text-left"
                              >
                                {d.isSettled ? (
                                  <>
                                    <RotateCcw size={13} strokeWidth={1.5} />
                                    <span>Mark Unsettled</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle size={13} strokeWidth={1.5} className="text-emerald-400" />
                                    <span>Mark Settled</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => {
                                  setDeleteId(d.id);
                                  setActiveDebtMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[5px] text-red-400 hover:bg-red-500/10 transition-colors text-left"
                              >
                                <Trash2 size={13} strokeWidth={1.5} />
                                <span>Delete Record</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Table Pagination Footer */}
          <TablePaginationFooter
            currentPage={currentPage}
            totalPages={Math.ceil(filteredDebts.length / pageSize) || 1}
            totalItems={filteredDebts.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      ) : (
        <EmptyStateSeeder 
          data={data} 
          updateData={updateData} 
          title="No Debt Entries Found" 
          description="Keep track of borrowing, lending, and active repayments, or seed sample debt records to see repayment progress." 
          onActionClick={() => {
            setPerson(''); setAmount(''); setNote(''); setDueDate(''); setType('OWES_ME');
            setIsAddOpen(true);
          }} 
          actionLabel="Add Debt Entry" 
        />
      )}

      {/* --- FLOATING BATCH ACTION BAR FOR DEBTS --- */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[5000] animate-in slide-in-from-bottom-6 duration-300">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-2xl px-5 py-3 rounded-[10px] flex items-center gap-5 text-[13px]">
            <span className="font-medium text-[var(--text-primary)]">
              {selectedIds.length} record{selectedIds.length === 1 ? '' : 's'} selected
            </span>
            <div className="h-4 w-px bg-[var(--border-default)]" />
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchSettle}
                className="btn btn--primary btn--sm"
              >
                <CheckCircle size={14} strokeWidth={1.5} />
                <span>Mark settled</span>
              </button>

              <button
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="btn btn--danger btn--sm"
              >
                <Trash2 size={14} strokeWidth={1.5} />
                <span>Delete selected</span>
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all ml-1"
                title="Clear selection"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Add Debt Entry --- */}
      {isAddOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs" 
            onClick={() => setIsAddOpen(false)} 
          />
          <div className="relative w-full max-w-[460px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Add a Debt Entry</h3>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="w-7 h-7 rounded-[6px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[var(--text-primary)]">Debt Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType('OWES_ME')}
                    className={`flex-1 py-2 text-[12px] font-medium rounded-[6px] transition-all border ${
                      type === 'OWES_ME'
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-semibold'
                        : 'bg-[var(--bg-subtle)] border-[var(--border-default)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Receivable (Owes me)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('I_OWE')}
                    className={`flex-1 py-2 text-[12px] font-medium rounded-[6px] transition-all border ${
                      type === 'I_OWE'
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 font-semibold'
                        : 'bg-[var(--bg-subtle)] border-[var(--border-default)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Liability (I owe)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[var(--text-primary)]">Person / Counterparty</label>
                <input
                  type="text"
                  placeholder="Full name..."
                  value={person}
                  onChange={(e) => setPerson(e.target.value)}
                  className="w-full h-[40px] bg-[var(--field-bg)] rounded-[6px] px-3.5 text-[14px] text-[var(--text-primary)] border border-[var(--field-border)] outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[var(--text-primary)]">Amount ({data.settings.currencySymbol})</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-[40px] bg-[var(--field-bg)] rounded-[6px] px-3.5 text-[14px] text-[var(--text-primary)] border border-[var(--field-border)] outline-none transition-all font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[var(--text-primary)]">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full h-[40px] bg-[var(--bg-subtle)] rounded-[8px] px-3 text-[13px] text-[var(--text-primary)] border border-[var(--border-default)] outline-none color-scheme-dark"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-[var(--text-primary)]">Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="Details..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full h-[40px] bg-[var(--bg-subtle)] rounded-[8px] px-3.5 text-[13px] text-[var(--text-primary)] border border-[var(--border-default)] outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="btn btn--outline h-[32px] px-3.5 text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDebt}
                disabled={!amount || !person}
                className="btn btn--primary h-[32px] px-4 text-[12px]"
              >
                Add debt entry
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL: Record Partial Payment --- */}
      {isPaymentOpen && activeDebtId && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs" 
            onClick={() => setIsPaymentOpen(false)} 
          />
          <div className="relative w-full max-w-[420px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Record Debt Payment</h3>
              <button 
                onClick={() => setIsPaymentOpen(false)}
                className="btn btn--outline btn--icon-sm shrink-0"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[var(--text-primary)]">Payment Amount ({data.settings.currencySymbol})</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full h-[40px] bg-[var(--field-bg)] rounded-[6px] px-3.5 text-[14px] text-[var(--text-primary)] border border-[var(--field-border)] outline-none transition-all font-mono"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[var(--text-primary)]">Payment Note (Optional)</label>
                <input
                  type="text"
                  placeholder="Add note..."
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full h-[40px] bg-[var(--bg-subtle)] rounded-[8px] px-3.5 text-[13px] text-[var(--text-primary)] border border-[var(--border-default)] outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="btn btn--outline h-[32px] px-3.5 text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (paymentAmount) {
                    onAddPayment(activeDebtId, {
                      amount: parseFloat(paymentAmount),
                      date: new Date().toISOString(),
                      note: paymentNote
                    });

                    const debt = data.debts.find(d => d.id === activeDebtId);
                    if (debt) {
                      const isExpense = debt.type === 'I_OWE';
                      onSettleTransaction({
                        id: Date.now().toString(),
                        amount: parseFloat(paymentAmount),
                        type: isExpense ? TransactionType.EXPENSE : TransactionType.INCOME,
                        category: isExpense ? Category.LOAN_PAYMENT : Category.LOAN,
                        date: new Date().toISOString(),
                        note: isExpense ? `Partial payment to ${debt.person}` : `Partial repayment from ${debt.person}`,
                        walletId: data.currentWalletId
                      });
                    }

                    setIsPaymentOpen(false);
                    setPaymentAmount('');
                    setPaymentNote('');
                  }
                }}
                disabled={!paymentAmount}
                className="btn btn--primary h-[32px] px-4 text-[12px]"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL: Confirm Delete Entry --- */}
      {deleteId && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs" 
            onClick={() => setDeleteId(null)} 
          />
          <div className="relative w-full max-w-[400px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Delete Debt Record</h3>
              <button 
                onClick={() => setDeleteId(null)}
                className="btn btn--outline btn--icon-sm shrink-0"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-1 py-1">
              <p className="text-[14px] font-medium text-[var(--text-primary)]">Delete this record permanently?</p>
              <p className="text-xs text-[var(--text-secondary)]">This action cannot be undone.</p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="btn btn--outline h-[30px] px-3 text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="btn btn--danger h-[30px] px-3.5 text-[12px]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL: Batch Delete Confirmation --- */}
      {isBatchDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs" 
            onClick={() => setIsBatchDeleteModalOpen(false)} 
          />
          <div className="relative w-full max-w-[420px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Delete Selected Records</h3>
              <button 
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="btn btn--outline btn--icon-sm shrink-0"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-1 py-1">
              <p className="text-[14px] font-medium text-[var(--text-primary)]">
                Delete <strong className="text-white font-semibold">{selectedIds.length} debt records</strong>?
              </p>
              <p className="text-xs text-[var(--text-secondary)]">This action cannot be undone.</p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="btn btn--outline h-[30px] px-3 text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchDelete}
                className="btn btn--danger h-[30px] px-3.5 text-[12px]"
              >
                Delete Records
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
