import React, { useState, useMemo, useEffect } from 'react';
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
  Warning as AlertTriangle,
  HandCoins,
  Receipt
} from '@phosphor-icons/react';
import { Debt, AppData, Transaction, TransactionType, Category, DebtPayment } from '../types';
import { Haptics } from '../services/haptics';
import { GlassCheckbox } from './shared/CommonUI';
import { EmptyStateSeeder } from './shared/EmptyStateSeeder';

interface DebtProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  formatMoney: (val: number, sym: string) => string;
  onSettleTransaction: (t: Transaction) => void;
  onAddPayment: (debtId: string, payment: any) => void;
  isDesktop?: boolean;
}

export const DebtView: React.FC<DebtProps> = ({ 
  data, 
  updateData, 
  formatMoney, 
  onSettleTransaction, 
  onAddPayment,
  isDesktop: propIsDesktop
}) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activeDebtId, setActiveDebtId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'I_OWE' | 'OWES_ME'>('OWES_ME');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ACTIVE' | 'SETTLED' | 'OWES_ME' | 'I_OWE'>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(!propIsDesktop && typeof window !== 'undefined' ? window.innerWidth < 768 : false);

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

  const currencySymbol = data.settings.currencySymbol || '$';

  // Summary Metrics
  const totalIOwe = useMemo(() => 
    (data.debts || []).filter(d => !d.isSettled && d.type === 'I_OWE').reduce((s, d) => s + d.amount, 0)
  , [data.debts]);

  const totalOwesMe = useMemo(() => 
    (data.debts || []).filter(d => !d.isSettled && d.type === 'OWES_ME').reduce((s, d) => s + d.amount, 0)
  , [data.debts]);

  const netPosition = totalOwesMe - totalIOwe;

  const filteredDebts = useMemo(() => {
    return (data.debts || []).filter(d => {
      const matchSearch = searchTerm 
        ? d.person.toLowerCase().includes(searchTerm.toLowerCase()) || (d.note || '').toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      if (!matchSearch) return false;

      if (typeFilter === 'ACTIVE') return !d.isSettled;
      if (typeFilter === 'SETTLED') return d.isSettled;
      if (typeFilter === 'OWES_ME') return d.type === 'OWES_ME';
      if (typeFilter === 'I_OWE') return d.type === 'I_OWE';
      return true;
    });
  }, [data.debts, typeFilter, searchTerm]);

  const handleAddDebt = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) return;

    const newDebt: Debt = {
      id: Date.now().toString(),
      person: person.trim() || 'Unspecified',
      amount: numAmount,
      type,
      note: note.trim() || undefined,
      isSettled: false,
      dueDate: dueDate || undefined,
      payments: [],
      updated_at: new Date().toISOString()
    };

    updateData({ debts: [newDebt, ...(data.debts || [])] });
    setIsAddOpen(false);
    setPerson('');
    setAmount('');
    setNote('');
    setDueDate('');
    Haptics.success();
  };

  const toggleSettle = (debt: Debt) => {
    const willSettle = !debt.isSettled;
    const updated = (data.debts || []).map(d => 
      d.id === debt.id ? { ...d, isSettled: willSettle, updated_at: new Date().toISOString() } : d
    );
    updateData({ debts: updated });

    if (willSettle) {
      const isExpense = debt.type === 'I_OWE';
      const newTx: Transaction = {
        id: Date.now().toString(),
        amount: debt.amount,
        type: isExpense ? TransactionType.EXPENSE : TransactionType.INCOME,
        category: isExpense ? Category.LOAN_PAYMENT : Category.LOAN,
        date: new Date().toISOString(),
        note: isExpense ? `Debt settled to ${debt.person}` : `Repayment received from ${debt.person}`,
        walletId: data.currentWalletId
      };
      onSettleTransaction(newTx);
      Haptics.success();
    }
  };

  const handleAddPartialPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const payNum = parseFloat(paymentAmount);
    if (!payNum || payNum <= 0 || !activeDebtId) return;

    const payment: Omit<DebtPayment, 'id'> = {
      amount: payNum,
      date: new Date().toISOString(),
      note: paymentNote.trim() || undefined
    };

    onAddPayment(activeDebtId, payment);
    setIsPaymentOpen(false);
    setPaymentAmount('');
    setPaymentNote('');
    setActiveDebtId(null);
    Haptics.success();
  };

  const handleDelete = (id: string) => {
    updateData({ debts: (data.debts || []).filter(d => d.id !== id) });
    setDeleteConfirmId(null);
    Haptics.success();
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} selected debts?`)) {
      updateData({ debts: (data.debts || []).filter(d => !selectedIds.includes(d.id)) });
      setSelectedIds([]);
      Haptics.success();
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="animate-in fade-in duration-300 w-full mx-auto pb-8 select-none space-y-4">
      
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-[18px] sm:text-[22px] font-semibold text-[var(--text-primary)] tracking-tight">
            Debts & Liabilities
          </h2>
          <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
            Track obligations you owe and credit extended to counterparties.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="h-[32px] px-3 bg-[var(--status-error-bg)] text-[var(--status-error-fg)] border border-[var(--status-error-fg)]/30 rounded-[6px] text-[12px] font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={14} strokeWidth={1.5} />
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsAddOpen(true)}
            className="h-[32px] px-3.5 bg-[var(--accent-solid)] text-[var(--accent-text)] rounded-[6px] text-[12px] font-medium flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all cursor-pointer font-sans"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Add Record</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em] block">
              You Owe (Payable)
            </span>
            <span className="text-[18px] font-semibold font-mono text-[var(--status-error-fg)] mt-0.5 block">
              {formatMoney(totalIOwe, currencySymbol)}
            </span>
          </div>
          <ArrowDownRight size={22} strokeWidth={1.5} className="text-[var(--status-error-fg)] shrink-0" />
        </div>

        <div className="p-3.5 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em] block">
              Owed to You (Receivable)
            </span>
            <span className="text-[18px] font-semibold font-mono text-[var(--status-success-fg)] mt-0.5 block">
              {formatMoney(totalOwesMe, currencySymbol)}
            </span>
          </div>
          <ArrowUpRight size={22} strokeWidth={1.5} className="text-[var(--status-success-fg)] shrink-0" />
        </div>

        <div className="p-3.5 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em] block">
              Net Liability Position
            </span>
            <span className={`text-[18px] font-semibold font-mono mt-0.5 block ${
              netPosition >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--status-error-fg)]'
            }`}>
              {formatMoney(netPosition, currencySymbol)}
            </span>
          </div>
          <HandCoins size={22} strokeWidth={1.5} className="text-[var(--accent-solid)] shrink-0" />
        </div>
      </div>

      {/* Control Bar: Search & Filter Tabs */}
      <div className="bg-[var(--bg-surface)] p-3 sm:p-4 rounded-[10px] border border-[var(--border-default)] space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="flex-1 flex items-center gap-2 bg-[var(--bg-subtle)] rounded-[6px] px-3 py-1.5 border border-[var(--border-default)] focus-within:border-[var(--accent-solid)] transition-colors">
            <Search size={14} className="text-[var(--text-muted)] shrink-0 stroke-[1.5px]" />
            <input
              type="text"
              placeholder="Search person or note..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent text-[12px] text-[var(--text-primary)] w-full outline-none placeholder:text-[var(--text-muted)]"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={13} strokeWidth={1.5} />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex p-0.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[11px] shrink-0 overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'I_OWE', label: 'I Owe' },
              { id: 'OWES_ME', label: 'Owes Me' },
              { id: 'SETTLED', label: 'Settled' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { Haptics.light(); setTypeFilter(tab.id as any); }}
                className={`px-3 py-1 rounded-[4px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                  typeFilter === tab.id
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Debt List / Table */}
      {filteredDebts.length === 0 ? (
        <div className="p-12 text-center rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[12px] text-[var(--text-muted)]">
          No records match the current filters.
        </div>
      ) : (
        <div className="bg-[var(--bg-surface)] rounded-[10px] border border-[var(--border-default)] overflow-hidden shadow-xs">
          
          {/* Desktop/Tablet Table Layout */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]/40 text-[11px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
                  <th className="px-4 py-2.5 w-10">
                    <GlassCheckbox
                      checked={filteredDebts.length > 0 && filteredDebts.every(d => selectedIds.includes(d.id))}
                      onChange={() => {
                        if (selectedIds.length === filteredDebts.length) setSelectedIds([]);
                        else setSelectedIds(filteredDebts.map(d => d.id));
                      }}
                    />
                  </th>
                  <th className="px-4 py-2.5">Person / Counterparty</th>
                  <th className="px-4 py-2.5">Direction</th>
                  <th className="px-4 py-2.5 text-right">Total Amount</th>
                  <th className="px-4 py-2.5 text-right">Remaining</th>
                  <th className="px-4 py-2.5">Due Date</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)]">
                {filteredDebts.map(d => {
                  const isSelected = selectedIds.includes(d.id);
                  const totalPaid = (d.payments || []).reduce((s, p) => s + p.amount, 0);
                  const remaining = Math.max(0, d.amount - totalPaid);

                  return (
                    <tr key={d.id} className={`hover:bg-[var(--bg-surface-hover)] transition-colors ${isSelected ? 'bg-[var(--bg-subtle)]' : ''}`}>
                      <td className="px-4 py-3">
                        <GlassCheckbox checked={isSelected} onChange={() => toggleSelect(d.id)} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-medium text-[var(--text-primary)] block">
                          {d.person}
                        </span>
                        {d.note && (
                          <span className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                            {d.note}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-[4px] ${
                          d.type === 'I_OWE' 
                            ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)]' 
                            : 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]'
                        }`}>
                          {d.type === 'I_OWE' ? 'You Owe' : 'Owed to You'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[13px] font-medium text-[var(--text-primary)] whitespace-nowrap">
                        {formatMoney(d.amount, currencySymbol)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[13px] font-semibold text-[var(--text-primary)] whitespace-nowrap">
                        {d.isSettled ? (
                          <span className="text-[var(--status-success-fg)]">Settled</span>
                        ) : (
                          formatMoney(remaining, currencySymbol)
                        )}
                      </td>
                      <td className="px-4 py-3 text-[12px] font-mono text-[var(--text-muted)] whitespace-nowrap">
                        {d.dueDate || 'No date'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {!d.isSettled && (
                            <button
                              onClick={() => { setActiveDebtId(d.id); setIsPaymentOpen(true); }}
                              className="h-[26px] px-2 rounded-[4px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                            >
                              Log Pay
                            </button>
                          )}
                          <button
                            onClick={() => toggleSettle(d)}
                            className={`h-[26px] px-2 rounded-[4px] border text-[11px] font-medium cursor-pointer ${
                              d.isSettled
                                ? 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-default)]'
                                : 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)] border-[var(--status-success-fg)]/20 hover:opacity-90'
                            }`}
                          >
                            {d.isSettled ? 'Reopen' : 'Settle'}
                          </button>
                          <button
                            onClick={() => handleDelete(d.id)}
                            className="w-7 h-[26px] rounded-[4px] text-[var(--text-muted)] hover:text-[var(--status-error-fg)] hover:bg-[var(--bg-subtle)] flex items-center justify-center cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={13} strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List Layout */}
          <div className="block md:hidden divide-y divide-[var(--border-default)]">
            {filteredDebts.map(d => {
              const isSelected = selectedIds.includes(d.id);
              const totalPaid = (d.payments || []).reduce((s, p) => s + p.amount, 0);
              const remaining = Math.max(0, d.amount - totalPaid);

              return (
                <div key={d.id} className={`p-3.5 space-y-2.5 hover:bg-[var(--bg-surface-hover)] ${isSelected ? 'bg-[var(--bg-subtle)]' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div onClick={e => e.stopPropagation()}>
                        <GlassCheckbox checked={isSelected} onChange={() => toggleSelect(d.id)} />
                      </div>
                      <div>
                        <span className="text-[13px] font-medium text-[var(--text-primary)] block">{d.person}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-[4px] inline-block mt-0.5 ${
                          d.type === 'I_OWE' ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)]' : 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]'
                        }`}>
                          {d.type === 'I_OWE' ? 'You Owe' : 'Owed to You'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-[14px] font-semibold text-[var(--text-primary)] block">
                        {d.isSettled ? <span className="text-[var(--status-success-fg)]">Settled</span> : formatMoney(remaining, currencySymbol)}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        of {formatMoney(d.amount, currencySymbol)}
                      </span>
                    </div>
                  </div>

                  {d.note && (
                    <p className="text-[11px] text-[var(--text-secondary)] pl-7">
                      {d.note}
                    </p>
                  )}

                  <div className="flex items-center justify-between pl-7 pt-1">
                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                      Due: {d.dueDate || 'N/A'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {!d.isSettled && (
                        <button
                          onClick={() => { setActiveDebtId(d.id); setIsPaymentOpen(true); }}
                          className="h-[24px] px-2 rounded-[4px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[10px] font-medium text-[var(--text-secondary)] cursor-pointer"
                        >
                          Log Pay
                        </button>
                      )}
                      <button
                        onClick={() => toggleSettle(d)}
                        className="h-[24px] px-2 rounded-[4px] bg-[var(--status-success-bg)] text-[var(--status-success-fg)] border border-[var(--status-success-fg)]/20 text-[10px] font-medium cursor-pointer"
                      >
                        {d.isSettled ? 'Reopen' : 'Settle'}
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="w-6 h-[24px] rounded-[4px] text-[var(--text-muted)] hover:text-[var(--status-error-fg)] flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Add Debt Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Add Liability Record</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleAddDebt} className="space-y-3 text-[12px]">
              <div>
                <label className="text-[10px] uppercase font-medium text-[var(--text-muted)] block mb-1">Direction</label>
                <div className="flex p-0.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)]">
                  <button
                    type="button"
                    onClick={() => setType('OWES_ME')}
                    className={`flex-1 py-1 rounded-[4px] font-medium transition-all ${type === 'OWES_ME' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs' : 'text-[var(--text-muted)]'}`}
                  >
                    Owed to You
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('I_OWE')}
                    className={`flex-1 py-1 rounded-[4px] font-medium transition-all ${type === 'I_OWE' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs' : 'text-[var(--text-muted)]'}`}
                  >
                    You Owe
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-medium text-[var(--text-muted)] block mb-1">Counterparty Person</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Smith"
                  value={person}
                  onChange={e => setPerson(e.target.value)}
                  className="w-full h-[34px] bg-[var(--field-bg)] border border-[var(--field-border)] focus:border-[var(--field-border-focus)] rounded-[6px] px-2.5 text-[12px] text-[var(--text-primary)] outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-medium text-[var(--text-muted)] block mb-1">Amount ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full h-[34px] bg-[var(--field-bg)] border border-[var(--field-border)] focus:border-[var(--field-border-focus)] rounded-[6px] px-2.5 text-[12px] text-[var(--text-primary)] font-mono outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-medium text-[var(--text-muted)] block mb-1">Due Date (Optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full h-[34px] bg-[var(--field-bg)] border border-[var(--field-border)] rounded-[6px] px-2.5 text-[12px] text-[var(--text-primary)] outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-medium text-[var(--text-muted)] block mb-1">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dinner bill split"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full h-[34px] bg-[var(--field-bg)] border border-[var(--field-border)] rounded-[6px] px-2.5 text-[12px] text-[var(--text-primary)] outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 h-[34px] rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-[34px] rounded-[6px] bg-[var(--accent-solid)] text-[var(--accent-text)] font-medium font-sans hover:opacity-90 cursor-pointer"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Partial Payment Modal */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] p-5 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Log Partial Payment</h3>
              <button onClick={() => setIsPaymentOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleAddPartialPayment} className="space-y-3 text-[12px]">
              <div>
                <label className="text-[10px] uppercase font-medium text-[var(--text-muted)] block mb-1">Payment Amount ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full h-[34px] bg-[var(--field-bg)] border border-[var(--field-border)] focus:border-[var(--field-border-focus)] rounded-[6px] px-2.5 text-[12px] text-[var(--text-primary)] font-mono outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-medium text-[var(--text-muted)] block mb-1">Payment Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Bank transfer reference"
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  className="w-full h-[34px] bg-[var(--field-bg)] border border-[var(--field-border)] rounded-[6px] px-2.5 text-[12px] text-[var(--text-primary)] outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="flex-1 h-[34px] rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-[34px] rounded-[6px] bg-[var(--accent-solid)] text-[var(--accent-text)] font-medium font-sans hover:opacity-90 cursor-pointer"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
