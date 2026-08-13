import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, Check, Trash2, AlertTriangle, Calendar as CalendarIcon, Clock, User, ArrowUpRight, ArrowDownRight, X, ArrowRight } from 'lucide-react';
import { Debt, AppData, Transaction, TransactionType, Category } from '../types';
import { Haptics } from '../services/haptics';
import { Pagination } from './shared/CommonUI';
import { EmptyStateSeeder } from './shared/EmptyStateSeeder';

interface DebtProps {
    data: AppData;
    updateData: (d: Partial<AppData>) => void;
    formatMoney: (val: number, sym: string) => string;
    onSettleTransaction: (t: Transaction) => void;
    onAddPayment: (debtId: string, payment: any) => void;
}

const ConfirmModal = ({ isOpen, onClose, onConfirm, message }: any) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity" onClick={() => { Haptics.light(); onClose(); }} />
            <div className="relative bg-[var(--bg-surface)] w-full max-w-[380px] rounded-[12px] p-6 border border-[var(--border-default)] shadow-2xl animate-in zoom-in-95 space-y-4">
                <div className="flex flex-col items-center text-center">
                    <div className="text-rose-500 mb-2">
                        <AlertTriangle size={28} strokeWidth={1.5} />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Are you sure?</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{message}</p>
                </div>
                <div className="flex gap-2.5 w-full pt-2">
                    <button onClick={() => { Haptics.light(); onClose(); }} className="btn btn--outline flex-1 h-[38px] text-[13px]">Cancel</button>
                    <button onClick={() => { Haptics.success(); onConfirm(); }} className="btn btn--danger flex-1 h-[38px] text-[13px]">Delete</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export const DebtView: React.FC<DebtProps> = ({ data, updateData, formatMoney, onSettleTransaction, onAddPayment }) => {
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
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const DEBTS_PER_PAGE = 5;
    const [currentPage, setCurrentPage] = useState(1);

    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleAddDebt = () => {
        if (!amount) return;
        const newDebt: Debt = {
            id: Date.now().toString(),
            person: person.trim() || "Unspecified",
            amount: parseFloat(amount),
            type,
            note,
            isSettled: false,
            dueDate: dueDate || undefined
        };
        updateData({ debts: [newDebt, ...(data.debts || [])] });
        setIsAddOpen(false);
        setPerson(''); setAmount(''); setNote(''); setDueDate('');
    };

    const toggleSettle = (debt: Debt) => {
        const isSettling = !debt.isSettled;
        
        // Update Debt Status
        const updated = data.debts.map((d: Debt) => d.id === debt.id ? { ...d, isSettled: isSettling } : d);
        updateData({ debts: updated });

        // If creating a settlement, add transaction
        if (isSettling) {
            const isExpense = debt.type === 'I_OWE';
            const newTx: Transaction = {
                id: Date.now().toString(),
                amount: debt.amount,
                type: isExpense ? TransactionType.EXPENSE : TransactionType.INCOME,
                category: isExpense ? Category.LOAN_PAYMENT : Category.LOAN,
                date: new Date().toISOString(),
                note: isExpense ? `Debt paid to ${debt.person}` : `Debt repayment from ${debt.person}`,
                walletId: data.currentWalletId
            };
            onSettleTransaction(newTx);
        }
    };

    const confirmDelete = () => {
        if (deleteId) {
            updateData({ debts: data.debts.filter((d: Debt) => d.id !== deleteId) });
            setDeleteId(null);
        }
    };

    const isOverdue = (dateStr?: string) => {
        if (!dateStr) return false;
        return new Date(dateStr) < new Date() && new Date(dateStr).toDateString() !== new Date().toDateString();
    };

    // Calculate Summary
    const totalIOwe = data.debts.filter((d:Debt) => !d.isSettled && d.type === 'I_OWE').reduce((a:number,b:Debt)=>a+b.amount,0);
    const totalOwesMe = data.debts.filter((d:Debt) => !d.isSettled && d.type === 'OWES_ME').reduce((a:number,b:Debt)=>a+b.amount,0);
    const netPosition = totalOwesMe - totalIOwe;

    const [typeFilter, setTypeFilter] = useState<'ALL' | 'ACTIVE' | 'SETTLED' | 'OWES_ME' | 'I_OWE'>('ALL');

    const filteredDebts = React.useMemo(() => {
        return (data.debts || []).filter(d => {
            if (typeFilter === 'ACTIVE') return !d.isSettled;
            if (typeFilter === 'SETTLED') return d.isSettled;
            if (typeFilter === 'OWES_ME') return d.type === 'OWES_ME';
            if (typeFilter === 'I_OWE') return d.type === 'I_OWE';
            return true;
        });
    }, [data.debts, typeFilter]);

    return (
        <div className="animate-in fade-in duration-500 space-y-4 pb-8 w-full mx-auto">
            
            {/* Header + Add Record */}
            <div className="flex justify-between items-center px-1">
                <div>
                    <h2 className="text-xl lg:text-3xl font-semibold text-[var(--text-primary)] tracking-tight">Debts & Loans</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Track and settle what you owe and what you are owed.</p>
                </div>
                <button 
                    onClick={() => {
                        Haptics.light();
                        setIsAddOpen(true);
                    }} 
                    className="btn btn--primary h-[32px] px-3 text-[12px] flex items-center gap-1.5 font-medium"
                >
                    <PlusCircle size={14} className="btn__icon" /> <span>Add Record</span>
                </button>
            </div>

            {/* Bento KPI Banner */}
            <div className="rounded-[12px] bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 lg:p-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] tracking-[0.06em] block mb-1">Net Balance</span>
                        <div className={`text-2xl lg:text-4xl font-semibold font-mono tracking-tight ${netPosition >= 0 ? 'text-[var(--status-success-fg)]' : 'text-[var(--status-error-fg)]'}`}>
                            {netPosition >= 0 ? '+' : ''}{formatMoney(netPosition, data.settings.currencySymbol)}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
                        <div className="bg-[var(--bg-subtle)] border border-[var(--border-default)] p-2.5 rounded-[8px] min-w-[120px]">
                            <div className="flex items-center gap-1 text-[var(--status-success-fg)] text-[10px] uppercase font-semibold tracking-wider mb-0.5">
                                <ArrowUpRight size={12} />
                                <span>Owed to Me</span>
                            </div>
                            <span className="text-sm font-semibold font-mono text-[var(--text-primary)]">{formatMoney(totalOwesMe, data.settings.currencySymbol)}</span>
                        </div>

                        <div className="bg-[var(--bg-subtle)] border border-[var(--border-default)] p-2.5 rounded-[8px] min-w-[120px]">
                            <div className="flex items-center gap-1 text-[var(--status-error-fg)] text-[10px] uppercase font-semibold tracking-wider mb-0.5">
                                <ArrowDownRight size={12} />
                                <span>I Owe</span>
                            </div>
                            <span className="text-sm font-semibold font-mono text-[var(--text-primary)]">{formatMoney(totalIOwe, data.settings.currencySymbol)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
                {[
                    { id: 'ALL', label: 'All Records' },
                    { id: 'ACTIVE', label: 'Active' },
                    { id: 'SETTLED', label: 'Settled' },
                    { id: 'OWES_ME', label: 'Owed to Me' },
                    { id: 'I_OWE', label: 'I Owe' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { Haptics.light(); setTypeFilter(tab.id as any); setCurrentPage(1); }}
                        className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap border transition-all ${
                            typeFilter === tab.id
                                ? 'bg-[var(--accent-solid)] text-[var(--accent-text)] border-[var(--accent-solid)] font-semibold'
                                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="min-h-[250px]">
                {filteredDebts.length === 0 ? (
                    <EmptyStateSeeder 
                        data={data} 
                        updateData={updateData} 
                        title="No Debt Records Found" 
                        description="Start tracking money you owe or are owed, or seed sample debt records to see partial payments and progress tracking." 
                        onActionClick={() => setIsAddOpen(true)} 
                        actionLabel="Add Record" 
                    />
                ) : (
                    <>
                    <div className="rounded-[12px] bg-[var(--bg-surface)] border border-[var(--border-default)] divide-y divide-[var(--border-default)] px-3.5 lg:px-5">
                        {filteredDebts.slice((currentPage - 1) * DEBTS_PER_PAGE, currentPage * DEBTS_PER_PAGE).map((d: Debt) => (
                            <div key={d.id} className={`py-3.5 flex items-center justify-between transition-all group ${d.isSettled ? 'opacity-40' : ''}`}>
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-8 h-8 rounded-[6px] flex items-center justify-center border shrink-0 ${d.type === 'OWES_ME' ? 'bg-[var(--status-success-bg)] border-[rgba(34,197,94,0.2)] text-[var(--status-success-fg)]' : 'bg-[var(--status-error-bg)] border-[rgba(239,68,68,0.2)] text-[var(--status-error-fg)]'}`}>
                                        {d.type === 'OWES_ME' ? <ArrowUpRight size={15} strokeWidth={1.5} /> : <ArrowDownRight size={15} strokeWidth={1.5} />}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[13px] font-medium text-[var(--text-primary)] leading-tight truncate">{d.person}</h4>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                                            <span className={`text-[9px] font-mono font-medium px-1.5 py-0.2 rounded border ${d.type === 'OWES_ME' ? 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)] border-[rgba(34,197,94,0.2)]' : 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)] border-[rgba(239,68,68,0.2)]'}`}>
                                                {d.type === 'OWES_ME' ? 'OWED' : 'I OWE'}
                                            </span>
                                            {d.isSettled ? (
                                                <span className="text-[9px] font-mono text-[var(--text-muted)] bg-[var(--bg-subtle)] px-1.5 py-0.2 rounded border border-[var(--border-default)]">SETTLED</span>
                                            ) : (
                                                d.dueDate && (
                                                    <span className={`flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded border ${isOverdue(d.dueDate) ? 'bg-[var(--status-error-bg)] text-[var(--status-error-fg)] border-[rgba(239,68,68,0.2)]' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border-[var(--border-default)]'}`}>
                                                        <Clock size={9} strokeWidth={1.5} />
                                                        {new Date(d.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                 <div className="flex items-center gap-3 shrink-0 ml-3 text-right">
                                     <div className="flex flex-col items-end">
                                         <span className="text-[13px] font-mono font-semibold text-[var(--text-primary)]">{formatMoney(d.amount, data.settings.currencySymbol)}</span>
                                         {d.payments && d.payments.length > 0 && (
                                             <div className="flex flex-col items-end w-full max-w-[80px] mt-0.5">
                                                 <div className="w-full h-1 bg-[var(--bg-subtle)] rounded-full overflow-hidden border border-[var(--border-default)]">
                                                     <div 
                                                         className="h-full bg-[var(--status-success-fg)] transition-all duration-500" 
                                                         style={{ width: `${Math.min((d.payments.reduce((s, p) => s + p.amount, 0) / d.amount) * 100, 100)}%` }} 
                                                     />
                                                 </div>
                                                 <span className="text-[8px] font-mono text-[var(--status-success-fg)] mt-0.5">
                                                     {formatMoney(d.payments.reduce((s, p) => s + p.amount, 0), data.settings.currencySymbol)} Paid
                                                 </span>
                                             </div>
                                         )}
                                     </div>
                                     {!d.isSettled && (
                                         <div className="flex items-center gap-1">
                                             <button 
                                                 onClick={() => { Haptics.light(); setActiveDebtId(d.id); setIsPaymentOpen(true); }}
                                                 className="p-1.5 rounded-[5px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] text-[var(--accent-solid)] transition-all"
                                                 title="Add Partial Payment"
                                             >
                                                 <PlusCircle size={13} strokeWidth={1.5} />
                                             </button>
                                             <button 
                                                 onClick={() => {
                                                     Haptics.success();
                                                     toggleSettle(d);
                                                 }} 
                                                 className="p-1.5 rounded-[5px] bg-[var(--status-success-bg)] hover:opacity-80 border border-[rgba(34,197,94,0.2)] text-[var(--status-success-fg)] transition-all" 
                                                 title="Settle in Full"
                                             >
                                                 <Check size={13} strokeWidth={1.5} />
                                             </button>
                                             <button 
                                                 onClick={() => {
                                                     Haptics.warning();
                                                     setDeleteId(d.id);
                                                 }} 
                                                 className="p-1.5 rounded-[5px] bg-[var(--bg-subtle)] hover:bg-[var(--status-error-bg)] hover:text-[var(--status-error-fg)] border border-[var(--border-default)] text-[var(--text-muted)] transition-all" 
                                                 title="Delete Record"
                                             >
                                                <Trash2 size={13} strokeWidth={1.5} />
                                             </button>
                                         </div>
                                     )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(filteredDebts.length / DEBTS_PER_PAGE) || 1}
                        totalItems={filteredDebts.length}
                        itemsPerPage={DEBTS_PER_PAGE}
                        onPageChange={setCurrentPage}
                    />
                    </>
                )}
            </div>

            {/* Record Add Modal */}
            {isAddOpen && createPortal(
                  <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                     <div className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity" onClick={() => { Haptics.light(); setIsAddOpen(false); }}/>
                     <div className="relative z-50 bg-[var(--bg-surface)] w-full max-w-md rounded-[12px] border border-[var(--border-default)] shadow-2xl animate-in zoom-in-95 p-6 space-y-4">

                         {/* Header */}
                         <div className="flex items-center justify-between">
                             <h3 className="text-base font-semibold text-[var(--text-primary)]">Add Record</h3>
                             <button 
                                 onClick={() => {
                                     Haptics.light();
                                     setIsAddOpen(false);
                                 }} 
                                 className="btn btn--outline btn--icon-sm shrink-0"
                             >
                                 <X size={15} strokeWidth={1.5} />
                             </button>
                         </div>

                         {/* Type Toggle */}
                         <div className="tabs w-full flex">
                             <button onClick={() => { Haptics.light(); setType('OWES_ME'); }} className={`tab flex-1 justify-center ${type === 'OWES_ME' ? 'is-active text-emerald-400' : ''}`}>Receivable (They owe)</button>
                             <button onClick={() => { Haptics.light(); setType('I_OWE'); }} className={`tab flex-1 justify-center ${type === 'I_OWE' ? 'is-active text-rose-400' : ''}`}>Liability (I owe)</button>
                         </div>
                         
                         {/* Amount Input */}
                         <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-primary)]">Amount ({data.settings.currencySymbol})</label>
                            <input 
                                type="number" 
                                inputMode="decimal"
                                value={amount} 
                                onChange={e => setAmount(e.target.value)} 
                                placeholder="0.00" 
                                className="w-full h-[40px] bg-[var(--bg-subtle)] rounded-[8px] px-3.5 text-[14px] text-[var(--text-primary)] border border-[var(--border-default)] focus:border-[#2563EB] outline-none transition-all font-mono"
                                autoFocus
                            />
                         </div>

                         {/* Form Fields */}
                         <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 no-scrollbar">
                             <div className="space-y-1.5">
                                 <label className="text-[13px] font-medium text-[var(--text-primary)]">Person / Counterparty</label>
                                 <input 
                                     type="text" 
                                     placeholder="Full Name..." 
                                     value={person} 
                                     onChange={e => setPerson(e.target.value)} 
                                     className="w-full h-[40px] bg-[var(--bg-subtle)] rounded-[8px] px-3.5 text-[13px] text-[var(--text-primary)] border border-[var(--border-default)] focus:border-[#2563EB] outline-none transition-all" 
                                 />
                             </div>

                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[var(--text-primary)]">Due Date (Optional)</label>
                                    <input 
                                        type="date" 
                                        value={dueDate} 
                                        onChange={e => setDueDate(e.target.value)} 
                                        className="w-full h-[40px] bg-[var(--bg-subtle)] rounded-[8px] px-3 text-[13px] text-[var(--text-primary)] border border-[var(--border-default)] outline-none color-scheme-dark" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[13px] font-medium text-[var(--text-primary)]">Note (Optional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Add note..." 
                                        value={note} 
                                        onChange={e => setNote(e.target.value)} 
                                        className="w-full h-[40px] bg-[var(--bg-subtle)] rounded-[8px] px-3.5 text-[13px] text-[var(--text-primary)] border border-[var(--border-default)] outline-none"
                                    />
                                </div>
                             </div>
                         </div>

                         <div className="flex justify-end gap-2.5 pt-2">
                             <button
                                 type="button"
                                 onClick={() => setIsAddOpen(false)}
                                 className="btn btn--outline h-[38px] px-4 text-[13px]"
                             >
                                 Cancel
                             </button>
                             <button 
                                onClick={() => {
                                    Haptics.success();
                                    handleAddDebt();
                                }} 
                                disabled={!amount || !person} 
                                className="btn btn--primary h-[38px] px-5 text-[13px]"
                             >
                                 Save Record
                             </button>
                         </div>
                     </div>
                  </div>,
                  document.body
            )}
            
             {/* Partial Payment Modal */}
             {isPaymentOpen && activeDebtId && createPortal(
                  <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                     <div className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity" onClick={() => { Haptics.light(); setIsPaymentOpen(false); }}/>
                     <div className="relative z-50 bg-[var(--bg-surface)] w-full max-w-md rounded-[12px] border border-[var(--border-default)] shadow-2xl animate-in zoom-in-95 p-6 space-y-4">
                          <div className="flex items-center justify-between">
                              <h3 className="text-base font-semibold text-[var(--text-primary)] tracking-tight">Add Payment</h3>
                              <button 
                                  onClick={() => {
                                      Haptics.light();
                                      setIsPaymentOpen(false);
                                  }} 
                                  className="btn btn--outline btn--icon-sm shrink-0"
                              >
                                  <X size={15} strokeWidth={1.5} />
                              </button>
                          </div>

                          <div>
                             <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1">Payment Amount ({data.settings.currencySymbol})</label>
                             <input 
                                 type="number" 
                                 inputMode="decimal"
                                 value={paymentAmount} 
                                 onChange={e => setPaymentAmount(e.target.value)} 
                                 placeholder="0.00" 
                                 className="w-full h-[40px] bg-[var(--bg-subtle)] rounded-[8px] px-3.5 text-[14px] font-mono text-[var(--text-primary)] border border-[var(--border-default)] focus:border-[#2563EB] outline-none transition-all"
                                 autoFocus
                             />
                          </div>

                          <div>
                              <label className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1">Payment Note (Optional)</label>
                              <input 
                                 type="text" 
                                 placeholder="Add a note (optional)..." 
                                 value={paymentNote} 
                                 onChange={e => setPaymentNote(e.target.value)} 
                                 className="w-full h-[40px] bg-[var(--bg-subtle)] rounded-[8px] px-3.5 text-[13px] text-[var(--text-primary)] border border-[var(--border-default)] focus:border-[#2563EB] outline-none transition-all"
                              />
                          </div>

                          <div className="flex justify-end gap-2.5 pt-2">
                              <button
                                  type="button"
                                  onClick={() => setIsPaymentOpen(false)}
                                  className="btn btn--outline h-[38px] px-4 text-[13px]"
                              >
                                  Cancel
                              </button>
                              <button 
                                 onClick={() => {
                                     if (paymentAmount) {
                                         Haptics.success();
                                         onAddPayment(activeDebtId, {
                                             amount: parseFloat(paymentAmount),
                                             date: new Date().toISOString(),
                                             note: paymentNote
                                         });
                                         
                                         // Also log as transaction
                                         const debt = data.debts.find(d => d.id === activeDebtId);
                                         if (debt) {
                                             const isExpense = debt.type === 'I_OWE';
                                             const newTx: Transaction = {
                                                 id: Date.now().toString(),
                                                 amount: parseFloat(paymentAmount),
                                                 type: isExpense ? TransactionType.EXPENSE : TransactionType.INCOME,
                                                 category: isExpense ? Category.LOAN_PAYMENT : Category.LOAN,
                                                 date: new Date().toISOString(),
                                                 note: isExpense ? `Partial payment to ${debt.person}` : `Partial repayment from ${debt.person}`,
                                                 walletId: data.currentWalletId
                                             };
                                             onSettleTransaction(newTx);
                                         }

                                         setIsPaymentOpen(false);
                                         setPaymentAmount('');
                                         setPaymentNote('');
                                         setActiveDebtId(null);
                                     }
                                 }} 
                                 disabled={!paymentAmount} 
                                 className="btn btn--primary h-[38px] px-5 text-[13px]"
                              >
                                 Confirm Payment
                              </button>
                          </div>
                     </div>
                  </div>,
                  document.body
            )}

             <ConfirmModal 
                isOpen={!!deleteId} 
                onClose={() => setDeleteId(null)} 
                onConfirm={confirmDelete}
                message="Delete this record permanently?" 
            />
        </div>
    );
};
