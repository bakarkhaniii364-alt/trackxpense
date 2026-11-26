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
  Receipt,
  DotsThree
} from '@phosphor-icons/react';
import { Debt, AppData, Transaction, TransactionType, Category, DebtPayment } from '../types';
import { Haptics } from '../services/haptics';
import { GlassCheckbox } from './shared/CommonUI';
import { Table } from './shared/Table';
import { EmptyStateSeeder } from './shared/EmptyStateSeeder';
import { LayerCard } from './shared/LayerCard';
import { HorizontalScrollArea } from './shared/HorizontalScrollArea';

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
  const [activeRowMenu, setActiveRowMenu] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => setActiveRowMenu(null);
    if (activeRowMenu) {
      window.addEventListener('click', handleCloseMenu);
    }
    return () => window.removeEventListener('click', handleCloseMenu);
  }, [activeRowMenu]);

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
      id: crypto.randomUUID(),
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
        id: crypto.randomUUID(),
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
          <h2 className="text-[18px] sm:text-[22px] font-semibold text-[var(--text-primary)]">
            Debts & liabilities
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Track obligations you owe and credit extended to counterparties.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="h-[34px] px-3 bg-[var(--status-error-bg)] text-[var(--status-error-fg)] border border-[var(--status-error-fg)]/30 rounded-[6px] text-sm font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={15} strokeWidth={1.5} />
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={() => setIsAddOpen(true)}
            className="btn btn--primary px-4 text-sm flex items-center gap-2 cursor-pointer"
          >
            <Plus size={15} strokeWidth={1.5} className="btn__icon" />
            <span>Add record</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <LayerCard className="px-5 py-4 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-[var(--text-muted)] block">
              You owe (payable)
            </span>
            <span className="text-[18px] font-semibold font-mono text-[var(--status-error-fg)] mt-0.5 block">
              {formatMoney(totalIOwe, currencySymbol)}
            </span>
          </div>
          <ArrowDownRight size={22} strokeWidth={1.5} className="text-[var(--status-error-fg)] shrink-0" />
        </LayerCard>

        <LayerCard className="px-5 py-4 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-[var(--text-muted)] block">
              Owed to you (receivable)
            </span>
            <span className="text-[18px] font-semibold font-mono text-[var(--status-success-fg)] mt-0.5 block">
              {formatMoney(totalOwesMe, currencySymbol)}
            </span>
          </div>
          <ArrowUpRight size={22} strokeWidth={1.5} className="text-[var(--status-success-fg)] shrink-0" />
        </LayerCard>

        <LayerCard className="px-5 py-4 flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-[var(--text-muted)] block">
              Net liability position
            </span>
            <span className={`text-[18px] font-semibold font-mono mt-0.5 block ${
              netPosition >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--status-error-fg)]'
            }`}>
              {formatMoney(netPosition, currencySymbol)}
            </span>
          </div>
          <HandCoins size={22} strokeWidth={1.5} className="text-[var(--accent-solid)] shrink-0" />
        </LayerCard>
      </div>

      {/* Cloudflare Underline Tab Bar (No Pill Shapes, No Boxed Segmented Controls) */}
      <HorizontalScrollArea
        wrapperClassName="border-b border-[var(--border-default)] pt-1"
        className="flex items-center gap-6"
        fadeWidth={28}
      >
        {[
          { id: 'ALL', label: 'All' },
          { id: 'ACTIVE', label: 'Active' },
          { id: 'I_OWE', label: 'I owe' },
          { id: 'OWES_ME', label: 'Owes me' },
          { id: 'SETTLED', label: 'Settled' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { Haptics.light(); setTypeFilter(tab.id as any); }}
            className={`pb-2.5 text-sm font-medium border-b-2 cursor-pointer whitespace-nowrap shrink-0 ${
              typeFilter === tab.id
                ? 'border-[var(--text-primary)] text-[var(--text-primary)] font-semibold'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </HorizontalScrollArea>

      {/* Flat Toolbar: Search */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="w-full sm:max-w-md flex items-center gap-2 bg-[var(--bg-surface)] rounded-[6px] px-3 h-[36px] border border-[var(--border-default)] focus-within:border-[var(--border-active)]">
          <Search size={15} className="text-[var(--text-muted)] shrink-0 stroke-[1.5px]" />
          <input
            type="text"
            placeholder="Search person or note..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent text-sm text-[var(--text-primary)] w-full outline-none placeholder:text-[var(--text-muted)]"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer">
              <X size={13} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Debt List / Table */}
      {filteredDebts.length === 0 ? (
        <div className="p-12 text-center rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[12px] text-[var(--text-muted)]">
          No records match the current filters.
        </div>
      ) : (
        <LayerCard className="overflow-hidden">
          {/* Table Section Header (Cloudflare / Lumen layout) */}
          <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
            <span className="text-[13px] font-medium text-[var(--text-primary)]">
              All records
            </span>
            <span className="text-[11px] text-[var(--text-muted)] font-mono">
              {filteredDebts.length} {filteredDebts.length === 1 ? 'record' : 'records'}
            </span>
          </div>
          
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

          {/* Desktop/Tablet Table Layout */}
          <div className="hidden md:block">
            <Table className="w-full text-left border-collapse">
              <Table.Header>
                <Table.Row className="border-b border-[var(--color-kumo-hairline)] bg-[var(--bg-surface)] text-[12px] font-medium text-[var(--text-secondary)]">
                  {selectedIds.length > 0 && (
                    <Table.Head className="px-4 py-2.5 w-10">
                      <GlassCheckbox
                        checked={filteredDebts.length > 0 && filteredDebts.every(d => selectedIds.includes(d.id))}
                        onChange={() => {
                          if (selectedIds.length === filteredDebts.length) setSelectedIds([]);
                          else setSelectedIds(filteredDebts.map(d => d.id));
                        }}
                      />
                    </Table.Head>
                  )}
                  <Table.Head className="px-4 py-2.5">Person / counterparty</Table.Head>
                  <Table.Head className="px-4 py-2.5">Direction</Table.Head>
                  <Table.Head className="px-4 py-2.5 text-right">Total amount</Table.Head>
                  <Table.Head className="px-4 py-2.5 text-right">Remaining</Table.Head>
                  <Table.Head className="px-4 py-2.5">Due date</Table.Head>
                  <Table.Head className="px-3 py-2.5 w-10 text-right"></Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body className="divide-y divide-[var(--color-kumo-hairline)]">
                {filteredDebts.map((d, idx) => {
                  const debtId = d.id ? String(d.id) : `debt_${idx}`;
                  const isSelected = selectedIds.includes(debtId);
                  const isMenuOpen = activeRowMenu === debtId;
                  const totalPaid = (d.payments || []).reduce((s, p) => s + p.amount, 0);
                  const remaining = Math.max(0, d.amount - totalPaid);
                  const openUpwards = idx >= Math.max(1, filteredDebts.length - 2);

                  return (
                    <Table.Row 
                      key={debtId} 
                      variant={isSelected ? 'selected' : 'default'}
                      className={`hover:bg-[var(--bg-surface-hover)] cursor-pointer ${isSelected ? 'bg-[var(--bg-subtle)]' : ''}`}
                    >
                      {selectedIds.length > 0 && (
                        <Table.Cell className="px-4 py-2.5">
                          <GlassCheckbox checked={isSelected} onChange={() => toggleSelect(debtId)} />
                        </Table.Cell>
                      )}
                      <Table.Cell className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium text-[var(--text-primary)]">
                            {d.person}
                          </span>
                          {d.note && (
                            <span className="text-[12px] text-[var(--text-muted)] truncate max-w-[200px]">
                              · {d.note}
                            </span>
                          )}
                        </div>
                      </Table.Cell>
                      <Table.Cell className="px-4 py-2 whitespace-nowrap">
                        <span className={`pill ${
                          d.type === 'I_OWE' 
                            ? 'pill--error' 
                            : 'pill--success'
                        }`}>
                          {d.type === 'I_OWE' ? 'You owe' : 'Owed to you'}
                        </span>
                      </Table.Cell>
                      <Table.Cell className="px-4 py-2 text-right font-mono text-[14px] font-medium text-[var(--text-primary)] whitespace-nowrap">
                        {formatMoney(d.amount, currencySymbol)}
                      </Table.Cell>
                      <Table.Cell className="px-4 py-2 text-right font-mono text-[14px] font-semibold text-[var(--text-primary)] whitespace-nowrap">
                        {d.isSettled ? (
                          <span className="text-[var(--status-success-fg)]">Settled</span>
                        ) : (
                          formatMoney(remaining, currencySymbol)
                        )}
                      </Table.Cell>
                      <Table.Cell className="px-4 py-2 text-[12.5px] font-mono text-[var(--text-muted)] whitespace-nowrap">
                        {d.dueDate || 'No date'}
                      </Table.Cell>
                      <Table.Cell className="px-3 py-2 text-right whitespace-nowrap relative" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveRowMenu(isMenuOpen ? null : debtId);
                          }}
                          className="w-6 h-6 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] inline-flex items-center justify-center cursor-pointer"
                          title="More options"
                        >
                          <DotsThree size={16} weight="regular" />
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
                            <div className={`absolute right-3 z-[50] w-36 bg-[var(--bg-surface)] border border-[var(--border-default)] ring-1 ring-[var(--border-strong)] rounded-[6px] shadow-[0_8px_20px_rgba(0,0,0,0.4)] p-1 text-[13px] animate-in fade-in zoom-in-95 duration-100 text-left select-none ${
                              openUpwards ? 'bottom-8' : 'top-9'
                            }`}>
                              <button
                                type="button"
                                onClick={() => {
                                  toggleSelect(debtId);
                                  setActiveRowMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer"
                              >
                                <Check size={13} strokeWidth={1.5} />
                                <span>{isSelected ? 'Deselect' : 'Select'}</span>
                              </button>
                              {!d.isSettled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDebtId(d.id);
                                    setIsPaymentOpen(true);
                                    setActiveRowMenu(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer"
                                >
                                  <HandCoins size={13} strokeWidth={1.5} />
                                  <span>Log payment</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  toggleSettle(d);
                                  setActiveRowMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer"
                              >
                                <Check size={13} strokeWidth={1.5} />
                                <span>{d.isSettled ? 'Reopen' : 'Settle'}</span>
                              </button>
                              <div className="my-1 border-t border-[var(--border-default)]" />
                              <button
                                type="button"
                                onClick={() => {
                                  handleDelete(d.id);
                                  setActiveRowMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--status-error-fg)] hover:bg-[var(--status-error-bg)] cursor-pointer"
                              >
                                <Trash2 size={13} strokeWidth={1.5} />
                                <span>Delete</span>
                              </button>
                            </div>
                          </>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          </div>

          {/* Mobile Card List Layout */}
          <div className="block md:hidden divide-y divide-[var(--border-default)]">
            {filteredDebts.map((d, idx) => {
              const debtId = d.id ? String(d.id) : `debt_${idx}`;
              const isSelected = selectedIds.includes(debtId);
              const isMenuOpen = activeRowMenu === debtId;
              const totalPaid = (d.payments || []).reduce((s, p) => s + p.amount, 0);
              const remaining = Math.max(0, d.amount - totalPaid);

              return (
                <div key={debtId} className={`p-3.5 space-y-2.5 hover:bg-[var(--bg-surface-hover)] ${isSelected ? 'bg-[var(--bg-subtle)]' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      {selectedIds.length > 0 && (
                        <div onClick={e => e.stopPropagation()}>
                          <GlassCheckbox checked={isSelected} onChange={() => toggleSelect(debtId)} />
                        </div>
                      )}
                      <div>
                        <span className="text-[13px] font-medium text-[var(--text-primary)] block">{d.person}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-[4px] inline-block mt-0.5 ${
                          d.type === 'I_OWE' ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)]' : 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)]'
                        }`}>
                          {d.type === 'I_OWE' ? 'You Owe' : 'Owed to You'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right font-mono">
                        <span className="text-[14px] font-semibold text-[var(--text-primary)] block">
                          {d.isSettled ? <span className="text-[var(--status-success-fg)]">Settled</span> : formatMoney(remaining, currencySymbol)}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          of {formatMoney(d.amount, currencySymbol)}
                        </span>
                      </div>

                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveRowMenu(isMenuOpen ? null : debtId);
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
                                  toggleSelect(debtId);
                                  setActiveRowMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors"
                              >
                                <Check size={13} strokeWidth={1.5} />
                                <span>{isSelected ? 'Deselect' : 'Select'}</span>
                              </button>
                              {!d.isSettled && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDebtId(d.id);
                                    setIsPaymentOpen(true);
                                    setActiveRowMenu(null);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors"
                                >
                                  <HandCoins size={13} strokeWidth={1.5} />
                                  <span>Log payment</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  toggleSettle(d);
                                  setActiveRowMenu(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer transition-colors"
                              >
                                <Check size={13} strokeWidth={1.5} />
                                <span>{d.isSettled ? 'Reopen' : 'Settle'}</span>
                              </button>
                              <div className="my-1 border-t border-[var(--border-default)]" />
                              <button
                                type="button"
                                onClick={() => {
                                  handleDelete(debtId);
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

                  {d.note && (
                    <p className="text-[11px] text-[var(--text-secondary)] pl-1">
                      {d.note}
                    </p>
                  )}

                  <div className="flex items-center justify-between pl-1 pt-1 text-[10px] text-[var(--text-muted)] font-mono">
                    <span>Due: {d.dueDate || 'N/A'}</span>
                  </div>
                </div>
              );
            })}
          </div>

        </LayerCard>
      )}

      {/* Add Debt Modal */}
      {isAddOpen && createPortal(
        <div className="fixed inset-0 z-[var(--z-modal,600)] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/80 transition-opacity animate-in fade-in duration-150" 
            onClick={() => setIsAddOpen(false)} 
          />
          <div className="relative z-10 w-full max-w-[420px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 text-[var(--text-primary)]">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-base font-medium text-[var(--text-primary)]">Add liability record</h3>
              <button 
                type="button"
                onClick={() => setIsAddOpen(false)} 
                className="w-7 h-7 rounded-[6px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleAddDebt} className="space-y-3.5 text-[12px]">
              <div>
                <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1.5">Direction</label>
                <div className="flex p-0.5 rounded-[6px] bg-[var(--field-bg)] border border-[var(--border-default)]">
                  <button
                    type="button"
                    onClick={() => setType('OWES_ME')}
                    className={`flex-1 py-1.5 rounded-[5px] text-[12px] font-medium transition-all ${type === 'OWES_ME' ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                  >
                    Owed to You
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('I_OWE')}
                    className={`flex-1 py-1.5 rounded-[5px] text-[12px] font-medium transition-all ${type === 'I_OWE' ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xs' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}
                  >
                    You Owe
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1.5">Counterparty Person</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Smith"
                  value={person}
                  onChange={e => setPerson(e.target.value)}
                  className="w-full h-[36px] bg-[var(--field-bg)] border border-[var(--border-default)] focus:border-[var(--accent)] rounded-[6px] px-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1.5">Amount ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full h-[36px] bg-[var(--field-bg)] border border-[var(--border-default)] focus:border-[var(--accent)] rounded-[6px] px-3 text-[13px] text-[var(--text-primary)] font-mono placeholder:text-[var(--text-muted)]/50 outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1.5">Due Date (Optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                  className="w-full h-[36px] bg-[var(--field-bg)] border border-[var(--border-default)] focus:border-[var(--accent)] rounded-[6px] px-3 text-[13px] text-[var(--text-primary)] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1.5">Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dinner bill split"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full h-[36px] bg-[var(--field-bg)] border border-[var(--border-default)] focus:border-[var(--accent)] rounded-[6px] px-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="btn btn--outline px-4 text-sm font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary px-4 text-sm font-medium cursor-pointer"
                >
                  Save record
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Partial Payment Modal */}
      {isPaymentOpen && createPortal(
        <div className="fixed inset-0 z-[var(--z-modal,600)] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/80 animate-in fade-in duration-150" 
            onClick={() => setIsPaymentOpen(false)} 
          />
          <div className="relative z-10 w-full max-w-[420px] bg-[var(--bg-surface)] border border-[var(--border-default)] ring-1 ring-white/5 rounded-[8px] px-6 py-5 space-y-4 animate-in zoom-in-95 duration-150 text-[var(--text-primary)]">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Log partial payment</h3>
              <button 
                type="button"
                onClick={() => setIsPaymentOpen(false)} 
                className="w-7 h-7 rounded-[6px] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] cursor-pointer"
                aria-label="Close"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleAddPartialPayment} className="space-y-3.5 text-sm">
              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Payment amount ({currencySymbol})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full h-[36px] bg-[var(--field-bg)] border border-[var(--border-default)] focus:border-[var(--accent)] rounded-[6px] px-3 text-sm text-[var(--text-primary)] font-mono placeholder:text-[var(--text-muted)]/50 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[var(--text-secondary)] block mb-1.5">Payment note (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Bank transfer reference"
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  className="w-full h-[36px] bg-[var(--field-bg)] border border-[var(--border-default)] focus:border-[var(--accent)] rounded-[6px] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="btn btn--outline px-4 text-sm font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary px-4 text-sm font-medium cursor-pointer"
                >
                  Record payment
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};
