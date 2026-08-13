import React, { useState } from 'react';
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
    return (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => { Haptics.light(); onClose(); }} />
            <div className="relative bg-card w-full max-w-xs rounded-[24px] p-6 border border-main/10 shadow-2xl animate-in zoom-in-95">
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4 border border-rose-500/20">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-main mb-2">Are you sure?</h3>
                    <p className="text-sm text-muted mb-6">{message}</p>
                    <div className="flex gap-3 w-full">
                        <button onClick={() => { Haptics.light(); onClose(); }} className="flex-1 py-3 rounded-md bg-main/5 text-muted font-bold text-sm hover:bg-main/10 transition-colors">Cancel</button>
                        <button onClick={() => { Haptics.success(); onConfirm(); }} className="flex-1 py-3 rounded-md bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition-colors">Confirm</button>
                    </div>
                </div>
            </div>
        </div>
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

    return (
        <div className="animate-in fade-in duration-500 space-y-8 pb-8 w-full mx-auto">
            
            {/* Summary Card */}
            <div className="flex-none px-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4 lg:mb-6">
                    <div>
                        <h2 className="text-xl lg:text-3xl font-bold text-main tracking-tight">Debts & Loans</h2>
                        <p className="text-[9px] lg:text-[10px] text-muted/40 font-black uppercase tracking-[0.2em] mt-0.5 lg:mt-1">Track what you owe and what you are owed</p>
                    </div>
                    <button 
                        onClick={() => {
                            Haptics.light();
                            setIsAddOpen(true);
                        }} 
                        className="flex items-center gap-1.5 lg:gap-2 bg-primary text-white hover:bg-primary/90 active:scale-95 transition-all py-2 px-4 lg:py-3 lg:px-6 rounded-md shadow-lg shadow-primary/20 text-[9px] font-black uppercase tracking-[0.2em] border border-main/10"
                    >
                        <PlusCircle size={13} className="lg:size-[14px]" /> Add Record
                    </button>
                </div>
                
                <div className="liquid-glass rounded-2xl lg:rounded-md p-4 lg:p-10 border border-main/10 relative overflow-hidden shadow-2xl group transition-all hover:border-main/20">
                    <div className="absolute inset-0 bg-main/5 pointer-events-none" />
                    <div className="flex flex-col md:flex-row items-center md:items-stretch justify-between gap-6 lg:gap-8 relative z-10">
                          <div className="text-center md:text-left">
                              <p className="text-muted/40 text-[9px] font-black uppercase tracking-[0.2em] mb-1 lg:mb-2">Net Balance</p>
                              <h1 className={`text-3xl lg:text-6xl font-bold tracking-tighter ${netPosition >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                 {netPosition >= 0 ? '+' : ''}{formatMoney(netPosition, data.settings.currencySymbol)}
                              </h1>
                          </div>
                          <div className="flex flex-row md:flex-col lg:flex-row items-center gap-3 lg:gap-4 w-full md:w-auto">
                              <div className="flex-1 md:flex-initial flex flex-col items-center md:items-start lg:items-center justify-center gap-1 bg-emerald-500/10 p-3 lg:p-5 rounded-xl lg:rounded-sm border border-emerald-500/20 w-full md:w-44 transition-all hover:bg-emerald-500/20">
                                  <div className="flex items-center gap-1 lg:gap-2 text-emerald-400 mb-0.5 lg:mb-1">
                                     <ArrowUpRight size={12} className="lg:size-[14px]" />
                                     <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em]">Owed to Me</span>
                                  </div>
                                  <span className="text-base lg:text-xl font-bold text-emerald-400 tracking-tight">{formatMoney(totalOwesMe, data.settings.currencySymbol)}</span>
                              </div>
                              <div className="flex-1 md:flex-initial flex flex-col items-center md:items-start lg:items-center justify-center gap-1 bg-rose-500/10 p-3 lg:p-5 rounded-xl lg:rounded-sm border border-rose-500/20 w-full md:w-44 transition-all hover:bg-rose-500/20">
                                  <div className="flex items-center gap-1 lg:gap-2 text-rose-400 mb-0.5 lg:mb-1">
                                     <ArrowDownRight size={12} className="lg:size-[14px]" />
                                     <span className="text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em]">I Owe</span>
                                  </div>
                                  <span className="text-base lg:text-xl font-bold text-rose-400 tracking-tight">{formatMoney(totalIOwe, data.settings.currencySymbol)}</span>
                              </div>
                          </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="px-2">
                <h3 className="text-sm font-black text-muted uppercase tracking-widest mb-4 px-2">Active Debts</h3>
                {data.debts.length === 0 ? (
                    <EmptyStateSeeder 
                        data={data} 
                        updateData={updateData} 
                        title="Your Debt Tracker is Empty" 
                        description="Start tracking money you owe or are owed, or seed sample debt records to see partial payments and progress tracking." 
                        onActionClick={() => setIsAddOpen(true)} 
                        actionLabel="Add Debt" 
                    />
                ) : (
                    <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.debts.slice((currentPage - 1) * DEBTS_PER_PAGE, currentPage * DEBTS_PER_PAGE).map((d: Debt) => (
                            <div key={d.id} className={`glass-card p-3 lg:p-5 rounded-2xl lg:rounded-sm flex items-center justify-between transition-all duration-300 group ${d.isSettled ? 'opacity-30 grayscale' : 'hover:border-main/20 shadow-lg'}`}>
                                <div className="flex items-center gap-3 lg:gap-4">
                                    <div className={`w-9 h-9 lg:w-12 lg:h-12 rounded-xl lg:rounded-md flex items-center justify-center border transition-all group-hover:scale-105 ${d.type === 'OWES_ME' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                                        {d.type === 'OWES_ME' ? <ArrowUpRight size={isMobile ? 16 : 20} /> : <ArrowDownRight size={isMobile ? 16 : 20} />}
                                    </div>
                                    <div>
                                        <h4 className="text-main font-bold text-xs lg:text-sm tracking-tight leading-tight">{d.person}</h4>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1 lg:mt-1.5">
                                            <span className={`text-[7px] lg:text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded border ${d.type === 'OWES_ME' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                                                {d.type === 'OWES_ME' ? 'OWED' : 'I OWE'}
                                            </span>
                                            {d.isSettled ? (
                                                <span className="text-[7px] lg:text-[8px] font-black tracking-widest text-muted/40 bg-main/5 px-1.5 py-0.5 rounded border border-main/10">SETTLED</span>
                                            ) : (
                                                d.dueDate && (
                                                    <span className={`flex items-center gap-1 text-[7px] lg:text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded border ${isOverdue(d.dueDate) ? 'bg-rose-500/20 border-rose-500/40 text-rose-500' : 'bg-main/5 text-muted/60 border-main/10'}`}>
                                                        <Clock size={8} />
                                                        {new Date(d.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                 <div className="flex flex-col items-end gap-1.5 lg:gap-2">
                                     <div className="flex flex-col items-end">
                                         <span className="text-base lg:text-lg font-bold text-main tracking-tighter">{formatMoney(d.amount, data.settings.currencySymbol)}</span>
                                         {d.payments && d.payments.length > 0 && (
                                             <div className="flex flex-col items-end w-full max-w-[80px] lg:max-w-[100px] mt-0.5 lg:mt-1">
                                                 <div className="w-full h-1 bg-main/5 rounded-full overflow-hidden border border-main/10">
                                                     <div 
                                                         className="h-full bg-emerald-500 transition-all duration-500" 
                                                         style={{ width: `${Math.min((d.payments.reduce((s, p) => s + p.amount, 0) / d.amount) * 100, 100)}%` }} 
                                                     />
                                                 </div>
                                                 <span className="text-[6px] lg:text-[7px] font-black text-emerald-500/60 uppercase tracking-widest mt-0.5">
                                                     {formatMoney(d.payments.reduce((s, p) => s + p.amount, 0), data.settings.currencySymbol)} Paid
                                                 </span>
                                             </div>
                                         )}
                                     </div>
                                     {!d.isSettled && (
                                         <div className="flex gap-1">
                                             <button 
                                                 onClick={() => { Haptics.light(); setActiveDebtId(d.id); setIsPaymentOpen(true); }}
                                                 className="p-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all active:scale-90"
                                                 title="Add Payment"
                                             >
                                                 <PlusCircle size={isMobile ? 12 : 14}/>
                                             </button>
                                             <button 
                                                 onClick={() => {
                                                     Haptics.success();
                                                     toggleSettle(d);
                                                 }} 
                                                 className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all active:scale-90" 
                                                 title="Settle Full"
                                             >
                                                 <Check size={isMobile ? 12 : 14}/>
                                             </button>
                                             <button 
                                                 onClick={() => {
                                                     Haptics.warning();
                                                     setDeleteId(d.id);
                                                 }} 
                                                 className="p-1.5 bg-main/5 rounded-md text-muted/40 hover:text-rose-500 border border-main/10 transition-all active:scale-90" 
                                                 title="Delete"
                                             >
                                                <Trash2 size={isMobile ? 12 : 14}/>
                                             </button>
                                         </div>
                                     )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={Math.ceil(data.debts.length / DEBTS_PER_PAGE)}
                      totalItems={data.debts.length}
                      itemsPerPage={DEBTS_PER_PAGE}
                      onPageChange={setCurrentPage}
                    />
                    </>
                )}
            </div>

            {/* Record Add Modal */}
            {isAddOpen && (
                  <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
                     <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={() => { Haptics.light(); setIsAddOpen(false); }}/>
                     <div className="relative z-50 bg-[rgba(var(--bg-core),0.92)] backdrop-blur-xl w-full max-w-md rounded-[24px] border border-main/10 shadow-2xl animate-in zoom-in-95 pb-6 overflow-hidden">

                         <div className="px-6 pt-3 pb-6">
                             {/* Header */}
                             <div className="flex items-center justify-between mb-6">
                                 <h3 className="text-xl font-bold text-main tracking-tight">Add Record</h3>
                                 <button 
                                     onClick={() => {
                                         Haptics.light();
                                         setIsAddOpen(false);
                                     }} 
                                     className="p-2 bg-main/5 hover:bg-main/10 border border-main/10 rounded-full text-muted hover:text-main transition-colors"
                                 >
                                     <X size={16}/>
                                 </button>
                             </div>

                             {/* Type Toggle */}
                             <div className="flex bg-main/5 rounded-md p-1 border border-main/10 mb-6 shadow-inner">
                                 <button onClick={() => { Haptics.light(); setType('OWES_ME'); }} className={`flex-1 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${type === 'OWES_ME' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-muted hover:text-main'}`}>THEY OWE ME</button>
                                 <button onClick={() => { Haptics.light(); setType('I_OWE'); }} className={`flex-1 py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${type === 'I_OWE' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-muted hover:text-main'}`}>I OWE THEM</button>
                             </div>
                             
                             {/* Amount Input */}
                             <div className="mb-6 group">
                                <p className="text-[8px] font-black text-muted uppercase tracking-[0.2em] mb-2 text-center">Amount to Track</p>
                                <div className="flex items-center justify-center relative bg-main/5 rounded-md p-6 border border-main/10 focus-within:border-primary/45 transition-colors">
                                    <span className="text-3xl font-bold text-muted/30 absolute left-8">{data.settings.currencySymbol}</span>
                                    <input 
                                        type="number" 
                                        inputMode="decimal"
                                        value={amount} 
                                        onChange={e => setAmount(e.target.value)} 
                                        placeholder="0.00" 
                                        className="w-full bg-transparent text-center text-4xl font-bold text-main placeholder:text-muted/10 outline-none"
                                        autoFocus
                                    />
                                </div>
                             </div>

                             {/* Form Fields */}
                             <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1 no-scrollbar">
                                 <div className="relative">
                                     <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none"/>
                                     <input 
                                         type="text" 
                                         placeholder="Full Name" 
                                         value={person} 
                                         onChange={e => setPerson(e.target.value)} 
                                         className="w-full bg-main/5 text-main pl-11 pr-4 py-3 rounded-md outline-none border border-main/10 focus:border-primary/45 transition-colors text-xs font-bold" 
                                     />
                                 </div>

                                 <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-main/5 rounded-md px-4 py-3 border border-main/10 flex items-center justify-between focus-within:border-primary/45 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <CalendarIcon size={16} className="text-muted shrink-0" />
                                            <span className="text-[10px] text-muted font-black uppercase tracking-widest">Due Date</span>
                                        </div>
                                        <input 
                                            type="date" 
                                            value={dueDate} 
                                            onChange={e => setDueDate(e.target.value)} 
                                            className="bg-transparent text-xs font-bold text-main outline-none text-right" 
                                        />
                                    </div>
                                    <input 
                                        type="text" 
                                        placeholder="Add a detailed note..." 
                                        value={note} 
                                        onChange={e => setNote(e.target.value)} 
                                        className="w-full bg-main/5 text-main px-4 py-3 rounded-md outline-none border border-main/10 focus:border-primary/45 transition-colors text-xs font-medium"
                                     />
                                 </div>

                                 <button 
                                    onClick={() => {
                                        Haptics.success();
                                        handleAddDebt();
                                    }} 
                                    disabled={!amount || !person} 
                                    className="w-full bg-primary text-white font-black text-[9px] uppercase tracking-[0.2em] py-4 rounded-md shadow-2xl shadow-primary/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4 active:scale-95 transition-all"
                                 >
                                     <span>Save Transaction</span>
                                     <ArrowRight size={16} />
                                 </button>
                             </div>
                         </div>
                    </div>
                 </div>
            )}
            
             {/* Partial Payment Modal */}
             {isPaymentOpen && activeDebtId && (
                  <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
                     <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={() => { Haptics.light(); setIsPaymentOpen(false); }}/>
                     <div className="relative z-50 bg-[rgba(var(--bg-core),0.92)] backdrop-blur-xl w-full max-w-md rounded-[24px] border border-main/10 shadow-2xl animate-in zoom-in-95 pb-6 overflow-hidden">

                          <div className="px-6 pt-3 pb-6">
                              <div className="flex items-center justify-between mb-6">
                                  <h3 className="text-xl font-bold text-main tracking-tight">Add Payment</h3>
                                  <button 
                                      onClick={() => {
                                          Haptics.light();
                                          setIsPaymentOpen(false);
                                      }} 
                                      className="p-2 bg-main/5 hover:bg-main/10 border border-main/10 rounded-full text-muted hover:text-main transition-colors"
                                  >
                                      <X size={16}/>
                                  </button>
                              </div>

                              <div className="mb-6">
                                 <p className="text-[8px] font-black text-muted uppercase tracking-[0.2em] mb-2 text-center">Payment Amount</p>
                                 <div className="flex items-center justify-center relative bg-main/5 rounded-md p-6 border border-main/10 focus-within:border-primary/45 transition-colors">
                                     <span className="text-3xl font-bold text-muted/30 absolute left-8">{data.settings.currencySymbol}</span>
                                     <input 
                                         type="number" 
                                         inputMode="decimal"
                                         value={paymentAmount} 
                                         onChange={e => setPaymentAmount(e.target.value)} 
                                         placeholder="0.00" 
                                         className="w-full bg-transparent text-center text-4xl font-bold text-main placeholder:text-muted/10 outline-none"
                                         autoFocus
                                     />
                                 </div>
                              </div>

                              <div className="space-y-4">
                                  <input 
                                     type="text" 
                                     placeholder="Add a note (optional)..." 
                                     value={paymentNote} 
                                     onChange={e => setPaymentNote(e.target.value)} 
                                     className="w-full bg-main/5 text-main px-4 py-3 rounded-md outline-none border border-main/10 focus:border-primary/45 transition-colors text-xs font-medium"
                                  />

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
                                         }
                                     }} 
                                     disabled={!paymentAmount} 
                                     className="w-full bg-emerald-500 text-white font-black text-[9px] uppercase tracking-[0.2em] py-4 rounded-md shadow-2xl shadow-emerald-500/30 disabled:opacity-30 flex items-center justify-center gap-3 mt-4 active:scale-95 transition-all"
                                  >
                                      <span>Add Payment</span>
                                      <Check size={16} />
                                  </button>
                              </div>
                          </div>
                     </div>
                  </div>
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
