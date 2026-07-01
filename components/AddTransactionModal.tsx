import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Info, ArrowRight, Wallet as WalletIcon, Save, EyeOff } from 'lucide-react';
import { TransactionType, Category, AppData, Wallet, Transaction, Debt, CategoryItem } from '../types';
import { CategoryIcon } from './shared/CategoryIcon';
import { GlassDateInput } from './shared/CommonUI';
import { Haptics } from '../services/haptics';

interface AddModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: AppData;
    onAdd: (t: Transaction) => void;
    onEdit?: (t: Transaction) => void;
    onTransfer: (amount: number, from: string, to: string, note: string, date: string) => void;
    onAddDebt?: (debt: Debt) => void;
    getDateTime: (d: string) => string;
    initialData?: { type: TransactionType, category?: string, amount?: number, note?: string };
    editingTransaction?: Transaction | null;
    lastUsedCategoryMap: Record<string, string>;
    onSaveTemplate?: (tpl: any) => void;
}

export const AddTransactionModal: React.FC<AddModalProps> = ({ isOpen, onClose, data, onAdd, onEdit, onTransfer, onAddDebt, getDateTime, initialData, editingTransaction, lastUsedCategoryMap, onSaveTemplate }) => {
    const [type, setType] = useState<TransactionType>(initialData?.type || TransactionType.EXPENSE);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [category, setCategory] = useState<string>(Category.OTHER);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [toWalletId, setToWalletId] = useState('');
    const [lenderName, setLenderName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [isTemplate, setIsTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [isSplit, setIsSplit] = useState(false);
    const [splits, setSplits] = useState<{ category: string, amount: string, note: string }[]>([
        { category: Category.OTHER, amount: '', note: '' }
    ]);

    const isEditing = !!editingTransaction;

    // Auto-Taxonomy Logic
    useEffect(() => {
        if (!isEditing && note.trim()) {
            const normalizedNote = note.trim().toLowerCase();
            const matchedCategory = lastUsedCategoryMap?.[normalizedNote];
            if (matchedCategory) {
                setCategory(matchedCategory);
            }
        }
    }, [note, isEditing, lastUsedCategoryMap]);

    useEffect(() => {
        if (isOpen) {
            if (editingTransaction) {
                setType(editingTransaction.type);
                setAmount(editingTransaction.amount.toString());
                setNote(editingTransaction.note || '');
                setCategory(editingTransaction.category);
                setDate(editingTransaction.date.split('T')[0]);
                setToWalletId('');
                setLenderName('');
            } else {
                setType(initialData?.type || TransactionType.EXPENSE);
                setAmount(initialData?.amount ? initialData.amount.toString() : '');
                setNote(initialData?.note || '');
                setCategory(initialData?.category || Category.OTHER);
                setIsPrivate(false);
                setIsTemplate(false);
                setTemplateName('');
                setIsSplit(false);
                setSplits([{ category: Category.OTHER, amount: '', note: '' }]);
            }
        }
    }, [isOpen, initialData, editingTransaction]);

    const addSplit = () => {
        Haptics.light();
        setSplits([...splits, { category: Category.OTHER, amount: '', note: '' }]);
    };

    const removeSplit = (index: number) => {
        Haptics.warning();
        if (splits.length > 1) {
            setSplits(splits.filter((_, i) => i !== index));
        }
    };

    const updateSplit = (index: number, field: string, value: string) => {
        const newSplits = [...splits];
        (newSplits[index] as any)[field] = value;
        setSplits(newSplits);
    };

    const calculateExpression = (expr: string): number | null => {
        const sanitized = expr.replace(/[^0-9+\-*/.]/g, '');
        if (!sanitized) return null;
        try {
            const tokens = sanitized.match(/(\d+\.?\d*)|([+\-*/])/g);
            if (!tokens) return null;

            const values: number[] = [];
            const ops: string[] = [];

            let i = 0;
            while (i < tokens.length) {
                const token = tokens[i];
                if (/[+\-*/]/.test(token)) {
                    ops.push(token);
                    i++;
                } else {
                    const val = parseFloat(token);
                    if (isNaN(val)) return null;
                    values.push(val);
                    i++;
                }
            }

            if (values.length === 0) return null;

            const valuesAfterMD: number[] = [values[0]];
            const opsAfterMD: string[] = [];

            for (let j = 0; j < ops.length; j++) {
                const op = ops[j];
                const nextVal = values[j + 1];
                if (nextVal === undefined) return null;

                if (op === '*' || op === '/') {
                    const prevVal = valuesAfterMD.pop();
                    if (prevVal === undefined) return null;
                    if (op === '*') {
                        valuesAfterMD.push(prevVal * nextVal);
                    } else {
                        if (nextVal === 0) return null;
                        valuesAfterMD.push(prevVal / nextVal);
                    }
                } else {
                    opsAfterMD.push(op);
                    valuesAfterMD.push(nextVal);
                }
            }

            let result = valuesAfterMD[0];
            for (let j = 0; j < opsAfterMD.length; j++) {
                const op = opsAfterMD[j];
                const nextVal = valuesAfterMD[j + 1];
                if (nextVal === undefined) return null;

                if (op === '+') {
                    result += nextVal;
                } else if (op === '-') {
                    result -= nextVal;
                }
            }

            return (isFinite(result) && !isNaN(result)) ? result : null;
        } catch (e) {
            return null;
        }
    };

    const handleSave = () => {
        if (!amount) return;
        
        const calculated = calculateExpression(amount);
        if (calculated === null || calculated <= 0) return;

        const numAmount = parseFloat(calculated.toFixed(2));
        
        if (editingTransaction && onEdit) {
            Haptics.success();
            const updatedTx: Transaction = {
                ...editingTransaction,
                amount: numAmount,
                type,
                category,
                date: getDateTime(date),
                note: lenderName ? `${note ? note + ' ' : ''}(Lender: ${lenderName})` : note,
            };
            onEdit(updatedTx);
        } else {
            if (type === TransactionType.TRANSFER) {
                if (!toWalletId || toWalletId === data.currentWalletId) {
                    Haptics.warning();
                    alert("Please select a valid destination wallet");
                    return;
                }
                Haptics.success();
                onTransfer(numAmount, data.currentWalletId, toWalletId, note, date);
            } else {
                const newTx: Transaction = {
                    id: Date.now().toString(),
                    amount: numAmount,
                    type,
                    category,
                    date: getDateTime(date),
                    note: lenderName ? `${note ? note + ' ' : ''}(Lender: ${lenderName})` : note,
                    walletId: data.currentWalletId,
                    isPrivate,
                    splits: isSplit ? splits.map(s => ({
                        category: s.category,
                        amount: calculateExpression(s.amount) || 0,
                        note: s.note
                    })) : undefined
                };
                
                if (isSplit) {
                    const splitTotal = splits.reduce((sum, s) => sum + (calculateExpression(s.amount) || 0), 0);
                    if (Math.abs(splitTotal - numAmount) > 0.01) {
                        Haptics.warning();
                        alert(`Split total (${splitTotal}) must match aggregate amount (${numAmount})`);
                        return;
                    }
                }
                
                if (type === TransactionType.INCOME && category === Category.LOAN && lenderName && onAddDebt) {
                    const newDebt: Debt = {
                        id: Date.now().toString(),
                        person: lenderName,
                        amount: numAmount,
                        type: 'I_OWE',
                        note: `Added via Income (Loan): ${note}`,
                        isSettled: false,
                        dueDate: undefined 
                    };
                    onAddDebt(newDebt);
                }

                if (isTemplate && templateName && onSaveTemplate) {
                    onSaveTemplate({
                        name: templateName,
                        amount: numAmount,
                        type,
                        category,
                        note: note
                    });
                }

                Haptics.success();
                onAdd(newTx);
            }
        }
    };

    if (!isOpen) return null;

    const availableCategories = (data.categories || []).filter((c: CategoryItem) => c.type === type);
    const otherWallets = (data.wallets || []).filter((w: Wallet) => w.id !== data.currentWalletId);

    return (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={() => { Haptics.light(); onClose(); }} />
            
            <div className="relative z-50 bg-[rgba(var(--bg-core),0.92)] backdrop-blur-xl border border-main/10 w-full max-w-md rounded-[24px] shadow-2xl animate-in zoom-in-95 duration-300 pb-6 overflow-hidden">

                {/* 1. Header & Tabs */}
                <div className="flex items-center justify-between px-6 pt-3 pb-4">
                     <div className="flex bg-main/5 rounded-md p-1 border border-main/10 shadow-inner">
                        {[TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.TRANSFER].map(t => (
                            <button 
                                key={t} 
                                onClick={() => {
                                    Haptics.light();
                                    if (!isEditing) setType(t);
                                }}
                                disabled={isEditing && t !== type}
                                className={`px-4 py-1.5 rounded-sm text-[9px] font-black tracking-widest uppercase transition-all ${type === t ? (t === TransactionType.EXPENSE ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : t === TransactionType.INCOME ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-blue-500 text-white shadow-lg shadow-blue-500/20') : 'text-muted hover:text-main'} ${isEditing && t !== type ? 'opacity-30' : ''}`}
                            >
                                {t}
                            </button>
                        ))}
                     </div>
                     <button 
                         onClick={() => {
                             Haptics.light();
                             onClose();
                         }} 
                         className="p-2 bg-main/5 hover:bg-main/10 rounded-full text-muted hover:text-main active:scale-90 transition-all border border-main/10"
                     >
                         <X size={16}/>
                     </button>
                </div>

                {/* 2. Main Amount Input */}
                <div className="px-6 py-3">
                    <p className="text-[8px] font-black text-muted/40 uppercase tracking-[0.2em] mb-2 text-center">Volume Input</p>
                    <div className="flex items-center justify-center relative bg-main/5 rounded-md p-3.5 md:p-6 border border-main/10 group focus-within:border-primary/40 transition-colors">
                        <span className="text-xl md:text-2xl font-bold text-muted/30 absolute left-8">{data.settings.currencySymbol}</span>
                        <input 
                            type="text" 
                            inputMode="decimal" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSave()}
                            placeholder="0.00" 
                            className="w-full bg-transparent text-center text-2xl md:text-4xl font-bold text-main placeholder:text-muted/10 outline-none tracking-tighter"
                            autoFocus
                        />
                    </div>
                </div>

                {/* 3. Details Section */}
                <div className="px-6 pb-6 space-y-3.5 max-h-[32vh] md:max-h-[50vh] overflow-y-auto no-scrollbar">
                    
                    {/* Note & Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-7 bg-main/5 rounded-md px-4 py-2.5 md:py-3 flex items-center gap-3 border border-main/10 focus-within:border-primary/40 transition-colors group">
                            <Info size={16} className="text-muted/50 group-focus-within:text-primary transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Annotation..." 
                                value={note} 
                                onChange={e => setNote(e.target.value)}
                                className="bg-transparent w-full text-xs text-main placeholder:text-muted/45 outline-none font-medium"
                            />
                        </div>
                         <div className="sm:col-span-5">
                             <GlassDateInput value={date} onChange={setDate} />
                         </div>
                    </div>

                    {/* Transfer or Category */}
                    {type === TransactionType.TRANSFER && !isEditing ? (
                         <div className="bg-main/5 rounded-md p-5 border border-main/10">
                             <label className="text-[8px] font-black text-muted/40 uppercase tracking-[0.2em] block mb-4 px-1">Destination Vault</label>
                             
                             {otherWallets.length === 0 ? (
                                <div className="text-center py-6 px-4 rounded-md bg-main/5 text-muted border border-dashed border-main/10">
                                    <div className="flex justify-center mb-2 opacity-20"><WalletIcon size={24} /></div>
                                    <p className="text-[10px] font-bold text-main/50">No secondary vaults</p>
                                </div>
                             ) : (
                                 <div className="grid grid-cols-2 gap-2">
                                     {otherWallets.map((w: Wallet) => (
                                         <button 
                                            key={w.id} 
                                            type="button"
                                            onClick={() => {
                                                Haptics.light();
                                                setToWalletId(w.id);
                                            }}
                                            className={`px-3 py-3 rounded-md border text-[11px] font-bold transition-all flex items-center gap-3 ${toWalletId === w.id ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/10' : 'bg-main/5 border-main/10 text-muted hover:border-main/20'}`}
                                         >
                                             <WalletIcon size={14} className={toWalletId === w.id ? 'text-primary' : 'text-muted/50'} />
                                             <span className="truncate flex-1 text-left">{w.name}</span>
                                         </button>
                                     ))}
                                 </div>
                             )}
                         </div>
                    ) : null}

                    {!isSplit && type !== TransactionType.TRANSFER && (
                        <div className="space-y-3">
                            <label className="text-[8px] font-black text-muted/40 uppercase tracking-[0.2em] block px-1">Taxonomy Selection</label>
                            <div className="flex overflow-x-auto overflow-y-hidden gap-3 pb-2 no-scrollbar snap-x w-full">
                                {availableCategories.map(cat => (
                                    <button 
                                        key={cat.id} 
                                        onClick={() => {
                                            Haptics.light();
                                            setCategory(cat.name);
                                        }}
                                        className={`flex-none w-[72px] flex flex-col items-center gap-1.5 transition-all duration-300 group snap-center ${category === cat.name ? 'scale-100' : 'opacity-40 hover:opacity-100'}`}
                                    >
                                        <div className={`w-full aspect-square rounded-md flex items-center justify-center border transition-all ${category === cat.name ? 'bg-primary/20 border-primary shadow-lg shadow-primary/10' : 'bg-main/5 border-main/10 group-hover:border-main/20'}`}>
                                            <CategoryIcon category={cat.name} color={category === cat.name ? cat.color : undefined} />
                                        </div>
                                        <span className={`text-[8px] font-black uppercase tracking-tight truncate w-full text-center ${category === cat.name ? 'text-primary' : 'text-muted'}`}>{cat.name}</span>
                                    </button>
                                ))}
                            </div>
                            
                            {/* Loan Source Input */}
                            {type === TransactionType.INCOME && category === Category.LOAN && !isEditing && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-amber-500/5 rounded-md p-3 border border-amber-500/20">
                                        <label className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em] block mb-2 px-1">Lender Identification</label>
                                        <input 
                                            type="text" 
                                            placeholder="Identity Tag..." 
                                            value={lenderName} 
                                            onChange={e => setLenderName(e.target.value)}
                                            className="w-full bg-main/5 text-amber-500 placeholder:text-amber-500/30 text-[11px] px-3 py-2.5 rounded-md outline-none border border-main/10 font-bold"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Split Toggle */}
                    {!isEditing && type !== TransactionType.TRANSFER && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1 py-1">
                                <div className="flex items-center gap-3">
                                    <ArrowRight size={14} className={`rotate-45 ${isSplit ? 'text-primary' : 'text-muted/40'}`} />
                                    <span className="text-[10px] text-muted font-bold uppercase tracking-widest">Enable Split Breakdown</span>
                                </div>
                                <button 
                                    onClick={() => {
                                        Haptics.light();
                                        setIsSplit(!isSplit);
                                    }}
                                    className={`w-10 h-5 rounded-full transition-all relative ${isSplit ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-main/10 border border-main/10'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isSplit ? 'left-6' : 'left-1 opacity-20'}`} />
                                </button>
                            </div>

                            {isSplit && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                                    {splits.map((s, idx) => (
                                        <div key={idx} className="bg-main/5 rounded-md p-3 border border-main/10 space-y-2 relative group/split">
                                            <div className="flex items-center gap-2">
                                                <select 
                                                    value={s.category} 
                                                    onChange={e => updateSplit(idx, 'category', e.target.value)}
                                                    className="flex-1 bg-main/5 border border-main/10 rounded-sm px-2 py-1.5 text-[9px] font-bold text-main outline-none"
                                                >
                                                    {availableCategories.map(c => (
                                                        <option key={c.id} value={c.name}>{c.name}</option>
                                                    ))}
                                                </select>
                                                <input 
                                                    type="text" 
                                                    placeholder="Amount" 
                                                    value={s.amount} 
                                                    onChange={e => updateSplit(idx, 'amount', e.target.value)}
                                                    className="w-20 bg-main/5 border border-main/10 rounded-sm px-2 py-1.5 text-[9px] font-bold text-main text-right outline-none"
                                                />
                                                {splits.length > 1 && (
                                                    <button onClick={() => removeSplit(idx)} className="text-rose-500 opacity-0 group-hover/split:opacity-100 transition-opacity">
                                                        <X size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            <input 
                                                type="text" 
                                                placeholder="Sub-note (Optional)" 
                                                value={s.note} 
                                                onChange={e => updateSplit(idx, 'note', e.target.value)}
                                                className="w-full bg-transparent text-[8px] text-muted font-bold px-2 outline-none"
                                            />
                                        </div>
                                    ))}
                                    <button 
                                        onClick={addSplit}
                                        className="w-full py-2 bg-main/5 rounded-md border border-dashed border-main/15 text-[8px] font-black uppercase tracking-widest text-muted hover:text-main transition-colors"
                                    >
                                        + Add Allocation
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Privacy Toggle */}
                    <div className="flex items-center justify-between px-1 py-1">
                        <div className="flex items-center gap-3">
                            <EyeOff size={14} className={isPrivate ? 'text-primary' : 'text-muted/40'} />
                            <span className="text-[10px] text-muted font-bold uppercase tracking-widest">Vault Stealth (Ghost Mode)</span>
                        </div>
                        <button 
                            onClick={() => {
                                Haptics.light();
                                setIsPrivate(!isPrivate);
                            }}
                            className={`w-10 h-5 rounded-full transition-all relative ${isPrivate ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-main/10 border border-main/10'}`}
                        >
                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isPrivate ? 'left-6' : 'left-1 opacity-20'}`} />
                        </button>
                    </div>

                    {/* Template Logic */}
                    {!isEditing && type !== TransactionType.TRANSFER && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-1 py-1">
                                <div className="flex items-center gap-3">
                                    <Save size={14} className={isTemplate ? 'text-primary' : 'text-muted/40'} />
                                    <span className="text-[10px] text-muted font-bold uppercase tracking-widest">Create Preset (Template)</span>
                                </div>
                                <button 
                                    onClick={() => {
                                        Haptics.light();
                                        setIsTemplate(!isTemplate);
                                    }}
                                    className={`w-10 h-5 rounded-full transition-all relative ${isTemplate ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-main/10 border border-main/10'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isTemplate ? 'left-6' : 'left-1 opacity-20'}`} />
                                </button>
                            </div>
                            
                            {isTemplate && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <input 
                                        type="text" 
                                        placeholder="Template Label (e.g. Morning Coffee)" 
                                        value={templateName} 
                                        onChange={e => setTemplateName(e.target.value)}
                                        className="w-full bg-main/5 text-main placeholder:text-muted/20 text-[11px] px-3 py-2.5 rounded-md outline-none border border-main/10 font-bold"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button 
                        onClick={handleSave} 
                        disabled={!amount}
                        className="w-full bg-primary text-white font-black text-[9px] uppercase tracking-[0.2em] py-4 rounded-md shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        <span>{isEditing ? 'Commit Changes' : 'Execute Transaction'}</span>
                        {isEditing ? <Save size={16} /> : <ArrowRight size={16} />}
                    </button>
                </div>
            </div>
        </div>
    );
};
