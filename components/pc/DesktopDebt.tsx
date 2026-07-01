
import React, { useState, useMemo } from 'react';
import { PlusCircle, Check, Trash2, AlertTriangle, Calendar as CalendarIcon, Clock, User, ArrowUpRight, ArrowDownRight, X, ArrowRight, Search, Filter } from 'lucide-react';
import { Debt, AppData, Transaction, TransactionType, Category } from '../../types';

interface DesktopDebtProps {
    data: AppData;
    updateData: (d: Partial<AppData>) => void;
    formatMoney: (val: number, sym: string) => string;
    onSettleTransaction: (t: Transaction) => void;
    onAddPayment: (debtId: string, payment: any) => void;
}

export const DesktopDebt: React.FC<DesktopDebtProps> = ({ data, updateData, formatMoney, onSettleTransaction, onAddPayment }) => {
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
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'I_OWE' | 'OWES_ME'>('ALL');

    // Stats
    const stats = useMemo(() => {
        const toPay = data.debts.filter(d => !d.isSettled && d.type === 'I_OWE').reduce((s, d) => s + d.amount, 0);
        const toCollect = data.debts.filter(d => !d.isSettled && d.type === 'OWES_ME').reduce((s, d) => s + d.amount, 0);
        return { toPay, toCollect, net: toCollect - toPay };
    }, [data.debts]);

    const filteredDebts = useMemo(() => {
        return data.debts.filter(d => {
            const matchesSearch = d.person.toLowerCase().includes(searchTerm.toLowerCase()) || d.note?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesType = typeFilter === 'ALL' || d.type === typeFilter;
            return matchesSearch && matchesType;
        });
    }, [data.debts, searchTerm, typeFilter]);

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

    const handleQuickAddOwed = () => {
        setType('OWES_ME');
        setPerson(''); setAmount(''); setNote(''); setDueDate('');
        setIsAddOpen(true);
    };

    const handleQuickAddIOwe = () => {
        setType('I_OWE');
        setPerson(''); setAmount(''); setNote(''); setDueDate('');
        setIsAddOpen(true);
    };

    const handleAddDebt = () => {
        if (!amount) return;
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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-2 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto pb-6 overflow-x-hidden">
            
            {/* --- Left Column: Summary & Actions (4 cols) --- */}
            <div className="lg:col-span-4 space-y-5">
                <div className="liquid-glass p-6 rounded-sm shadow-xl relative overflow-hidden group">
                    <p className="text-[9px] font-black text-muted uppercase tracking-[0.2em] mb-4">Debt Overview</p>
                    <h2 className={`text-3xl font-bold tracking-tight mb-6 ${stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {stats.net >= 0 ? '+' : ''}{formatMoney(stats.net, data.settings.currencySymbol)}
                    </h2>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="glass-card p-4 rounded-md group/item hover:border-emerald-500/30 transition-all">
                             <p className="text-[8px] font-black text-muted/40 uppercase tracking-[0.2em] mb-1">Owed to Me</p>
                             <span className="text-sm font-bold text-emerald-400">{formatMoney(stats.toCollect, data.settings.currencySymbol)}</span>
                        </div>
                        <div className="glass-card p-4 rounded-md group/item hover:border-rose-500/30 transition-all">
                             <p className="text-[8px] font-black text-muted/40 uppercase tracking-[0.2em] mb-1">I Owe</p>
                             <span className="text-sm font-bold text-rose-400">{formatMoney(stats.toPay, data.settings.currencySymbol)}</span>
                        </div>
                    </div>

                    <button 
                        onClick={() => setIsAddOpen(true)}
                        className="w-full mt-6 bg-primary text-white font-bold text-[9px] uppercase tracking-[0.2em] py-3.5 rounded-md shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <PlusCircle size={14} />
                        Add New Debt
                    </button>
                </div>

                {/* Filter Sidebar */}
                <div className="liquid-glass p-5 rounded-sm shadow-lg space-y-4">
                    <p className="text-[8px] font-black text-muted uppercase tracking-widest px-1">Filters</p>
                    <div className="space-y-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted/40 group-focus-within:text-primary transition-colors" size={14} />
                            <input 
                                type="text" 
                                placeholder="Search names..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-black/20 border border-white/5 rounded-sm pl-10 pr-4 py-2.5 text-[11px] text-main outline-none focus:border-primary/40 transition-all font-bold"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                            {['ALL', 'I_OWE', 'OWES_ME'].map((f: any) => (
                                <button 
                                    key={f}
                                    onClick={() => setTypeFilter(f)}
                                    className={`px-4 py-2 rounded-sm text-[8px] font-black uppercase tracking-[0.2em] text-left transition-all ${typeFilter === f ? 'bg-primary text-white shadow-md' : 'bg-black/20 text-muted/60 hover:bg-black/30 border border-white/5'}`}
                                >
                                    {f.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Right Column: Debt Ledger (8 cols) --- */}
            <div className="lg:col-span-8 space-y-5">
                <div className="liquid-glass rounded-sm shadow-xl overflow-hidden">
                    <div className="p-5 border-b border-white/5 flex justify-between items-center bg-black/20">
                        <h3 className="text-xs font-bold text-main tracking-tight">Current Debts</h3>
                        <span className="text-[8px] font-black text-muted/40 uppercase tracking-[0.2em] bg-black/20 px-3 py-1.5 rounded-sm border border-white/5">{filteredDebts.length} active entries</span>
                    </div>
                    <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto no-scrollbar">
                        {filteredDebts.length === 0 ? (
                            <div className="p-20 text-center">
                                <div className="p-6 bg-white/5 rounded-md inline-block mb-4"><User size={24} className="text-muted/20" /></div>
                                <p className="text-[11px] font-bold text-muted">No records identified</p>
                            </div>
                        ) : (
                            filteredDebts.map((d) => (
                                <div key={d.id} className={`p-4 group hover:bg-white/5 transition-all flex items-center justify-between ${d.isSettled ? 'opacity-30 grayscale' : ''}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-9 h-9 rounded-sm flex items-center justify-center border shadow-sm transition-all group-hover:scale-105 ${d.type === 'OWES_ME' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                            {d.type === 'OWES_ME' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                        </div>
                                        <div>
                                            <h4 className="text-[11px] font-bold text-main tracking-tight group-hover:text-primary transition-colors">{d.person}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-[7px] font-black tracking-[0.1em] px-1.5 py-0.5 rounded-md ${d.type === 'OWES_ME' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                    {d.type === 'OWES_ME' ? 'RECEIVABLE' : 'PAYABLE'}
                                                </span>
                                                {d.dueDate && (
                                                    <span className="flex items-center gap-1 text-[7px] font-black tracking-widest text-muted/50 uppercase">
                                                        <Clock size={8} /> {new Date(d.dueDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-5">
                                        <div className="text-right">
                                            <p className={`text-sm font-black tracking-tighter ${d.type === 'OWES_ME' ? 'text-emerald-400' : 'text-main'}`}>
                                                {formatMoney(d.amount, data.settings.currencySymbol)}
                                            </p>
                                            {d.payments && d.payments.length > 0 && (
                                                <div className="flex flex-col items-end w-[100px] mt-1 ml-auto">
                                                    <div className="w-full h-1 bg-black/20 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-emerald-500 transition-all duration-500" 
                                                            style={{ width: `${Math.min((d.payments.reduce((s, p) => s + p.amount, 0) / d.amount) * 100, 100)}%` }} 
                                                        />
                                                    </div>
                                                    <p className="text-[7px] font-black text-emerald-500/60 uppercase tracking-widest mt-0.5">
                                                        {formatMoney(d.payments.reduce((s, p) => s + p.amount, 0), data.settings.currencySymbol)} Paid
                                                    </p>
                                                </div>
                                             )}
                                            {d.note && <p className="text-[8px] text-muted/40 font-bold mt-0.5 truncate max-w-[120px] uppercase tracking-tighter">{d.note}</p>}
                                        </div>
                                        {!d.isSettled && (
                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                <button 
                                                     onClick={() => { setActiveDebtId(d.id); setIsPaymentOpen(true); }}
                                                     className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-sm transition-all active:scale-90"
                                                     title="Add Payment"
                                                 >
                                                     <PlusCircle size={14} />
                                                 </button>
                                                <button 
                                                    onClick={() => handleToggleSettle(d)}
                                                    className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-sm transition-all active:scale-90"
                                                >
                                                    <Check size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => setDeleteId(d.id)}
                                                    className="p-2 bg-white/5 text-muted hover:text-rose-500 rounded-sm border border-white/5 hover:border-rose-500/20 transition-all active:scale-90"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Add Record Modal */}
            {isAddOpen && (
                <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsAddOpen(false)} />
                    <div className="relative liquid-glass w-full max-w-sm rounded-sm shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-muted/40 uppercase tracking-[0.2em] mb-1">Entry Details</span>
                                    <h3 className="text-lg font-bold text-main tracking-tight">New Entry</h3>
                                </div>
                                <button onClick={() => setIsAddOpen(false)} className="p-2 bg-white/5 rounded-full text-muted hover:text-main border border-white/5"><X size={16} /></button>
                            </div>

                            <div className="space-y-4">
                                <div className="flex bg-black/20 rounded-sm p-1 border border-white/5">
                                    <button onClick={() => setType('OWES_ME')} className={`flex-1 py-2 ${type === 'OWES_ME' ? 'bg-emerald-500 text-white rounded-sm shadow-lg' : 'text-muted/60 hover:text-main' } text-[9px] font-black uppercase tracking-[0.2em] transition-all`}>Receivable</button>
                                    <button onClick={() => setType('I_OWE')} className={`flex-1 py-2 ${type === 'I_OWE' ? 'bg-rose-500 text-white rounded-sm shadow-lg' : 'text-muted/60 hover:text-main' } text-[9px] font-black uppercase tracking-[0.2em] transition-all`}>Liability</button>
                                </div>

                                <div className="mb-4">
                                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-2">Amount to Track</p>
                                    <div className="flex items-center relative bg-black/20 rounded-sm p-4 border border-white/5">
                                        <span className="text-xl font-bold text-muted/50 absolute left-4">{data.settings.currencySymbol}</span>
                                        <input 
                                            type="number"
                                            inputMode="decimal"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-transparent text-right text-2xl font-bold text-main placeholder:text-muted/20 outline-none pl-10"
                                        />
                                    </div>
                                </div>

                                <div className="relative">
                                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={person}
                                        onChange={e => setPerson(e.target.value)}
                                        className="w-full bg-surface text-main pl-10 pr-4 py-3 rounded-md outline-none border border-white/5 focus:border-primary transition-colors text-sm font-bold"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <div className="bg-surface rounded-md px-4 py-3 border border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <CalendarIcon size={16} className="text-muted shrink-0" />
                                            <span className="text-xs text-muted font-black uppercase tracking-widest">Due Date</span>
                                        </div>
                                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-transparent text-sm font-bold text-main outline-none text-right" />
                                    </div>

                                    <input
                                        type="text"
                                        placeholder="Add a detailed note..."
                                        value={note}
                                        onChange={e => setNote(e.target.value)}
                                        className="w-full bg-surface text-main px-4 py-3 rounded-md outline-none border border-white/5 focus:border-primary transition-colors text-sm font-medium"
                                    />
                                </div>

                                <button
                                    onClick={handleAddDebt}
                                    disabled={!amount || !person}
                                    className="w-full bg-primary text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-sm shadow-2xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-2 hover:scale-[1.02] active:scale-95 transition-all"
                                >
                                    <span>Save Record</span>
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Partial Payment Modal */}
             {isPaymentOpen && activeDebtId && (
                 <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsPaymentOpen(false)} />
                    <div className="relative liquid-glass w-full max-w-sm rounded-sm shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-8">
                             <div className="flex justify-between items-center mb-6">
                                 <div className="flex flex-col">
                                     <span className="text-[8px] font-black text-muted/40 uppercase tracking-[0.2em] mb-1">Installment</span>
                                     <h3 className="text-lg font-bold text-main tracking-tight">Record Payment</h3>
                                 </div>
                                 <button onClick={() => setIsPaymentOpen(false)} className="p-2 bg-white/5 rounded-full text-muted hover:text-main border border-white/5"><X size={16} /></button>
                             </div>

                             <div className="space-y-4">
                                <div className="mb-4">
                                    <p className="text-[10px] font-black text-muted uppercase tracking-widest mb-2">Payment Amount</p>
                                    <div className="flex items-center relative bg-black/20 rounded-sm p-4 border border-white/5">
                                        <span className="text-xl font-bold text-muted/50 absolute left-4">{data.settings.currencySymbol}</span>
                                        <input 
                                            type="number"
                                            inputMode="decimal"
                                            value={paymentAmount}
                                            onChange={e => setPaymentAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-transparent text-right text-2xl font-bold text-main placeholder:text-muted/20 outline-none pl-10"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <input
                                    type="text"
                                    placeholder="Add a note (optional)..."
                                    value={paymentNote}
                                    onChange={e => setPaymentNote(e.target.value)}
                                    className="w-full bg-surface text-main px-4 py-3 rounded-md outline-none border border-white/5 focus:border-primary transition-colors text-sm font-medium"
                                />

                                <button
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
                                    className="w-full bg-emerald-500 text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-sm shadow-2xl disabled:opacity-30 flex items-center justify-center gap-3 mt-2 active:scale-95 transition-all"
                                >
                                    <span>Execute Payment</span>
                                    <Check size={16} />
                                </button>
                             </div>
                        </div>
                    </div>
                 </div>
             )}

            {/* Delete confirm modal */}
            {deleteId && (
                <div className="fixed inset-0 z-[6100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
                    <div className="relative bg-card w-full max-w-xs rounded-sm p-6 border border-white/10 shadow-2xl animate-in zoom-in-95">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mb-4 border border-rose-500/20">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-main mb-2">Are you sure?</h3>
                            <p className="text-sm text-muted mb-6">Delete this record permanently?</p>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-sm bg-surface text-muted font-bold text-sm hover:bg-black/10 transition-colors">Cancel</button>
                                <button onClick={confirmDelete} className="flex-1 py-3 rounded-sm bg-rose-500 text-white font-bold text-sm hover:bg-rose-600 transition-colors">Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
