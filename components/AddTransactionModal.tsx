import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Info,
  Wallet as WalletIcon,
  ArrowRight,
  EyeSlash as EyeOff,
  FloppyDisk as Save,
  Check,
  PlusCircle,
  Trash as Trash2
} from '@phosphor-icons/react';
import { TransactionType, Category, CategoryItem, AppData, Wallet, Transaction } from '../types';
import { Haptics } from '../services/haptics';
import { GlassDateInput, GlassSelect } from './shared/CommonUI';
import { CategoryIcon } from './shared/CategoryIcon';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (transaction: Omit<Transaction, 'id'>, isTemplate?: boolean, templateName?: string) => void;
    data: AppData;
    initialType?: TransactionType;
    initialCategory?: string;
    editingTransaction?: Transaction | null;
    onEdit?: (transaction: Transaction) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ 
    isOpen, 
    onClose, 
    onAdd, 
    data,
    initialType = TransactionType.EXPENSE,
    initialCategory,
    editingTransaction,
    onEdit
}) => {
    const isEditing = !!editingTransaction;
    const [type, setType] = useState<TransactionType>(initialType);
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<string>(initialCategory || Category.LUNCH);
    const [note, setNote] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [toWalletId, setToWalletId] = useState<string>('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [lenderName, setLenderName] = useState('');
    
    // Template & Split States
    const [isTemplate, setIsTemplate] = useState(false);
    const [templateName, setTemplateName] = useState('');
    const [isSplit, setIsSplit] = useState(false);
    const [splits, setSplits] = useState<{ category: string; amount: string; note: string }[]>([
        { category: Category.LUNCH, amount: '', note: '' },
        { category: Category.SHOPPING, amount: '', note: '' }
    ]);

    // Drag-to-scroll & wheel scroll for category pills on PC
    const categoryScrollRef = useRef<HTMLDivElement>(null);
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!categoryScrollRef.current) return;
        setIsMouseDown(true);
        setStartX(e.pageX - categoryScrollRef.current.offsetLeft);
        setScrollLeft(categoryScrollRef.current.scrollLeft);
    };

    const handleMouseLeaveOrUp = () => {
        setIsMouseDown(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isMouseDown || !categoryScrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - categoryScrollRef.current.offsetLeft;
        const walk = (x - startX) * 1.5;
        categoryScrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (categoryScrollRef.current) {
            categoryScrollRef.current.scrollLeft += e.deltaY;
        }
    };

    useEffect(() => {
        if (editingTransaction) {
            setType(editingTransaction.type);
            setAmount(editingTransaction.amount.toString());
            setCategory(editingTransaction.category);
            setNote(editingTransaction.note || '');
            setDate(editingTransaction.date ? editingTransaction.date.split('T')[0] : new Date().toISOString().split('T')[0]);
            setToWalletId(editingTransaction.toWalletId || '');
            setIsPrivate(editingTransaction.isPrivate || false);
        } else {
            setType(initialType);
            if (initialCategory) setCategory(initialCategory);
            else {
                const cats = (data.categories || []).filter((c: CategoryItem) => {
                    if (c.type !== initialType) return false;
                    if (initialType === TransactionType.EXPENSE && (c.name === Category.TRANSFER || c.name === 'Transfer')) return false;
                    return true;
                });
                if (cats.length > 0) setCategory(cats[0].name);
            }
            setAmount('');
            setNote('');
            setDate(new Date().toISOString().split('T')[0]);
            const otherWallets = (data.wallets || []).filter((w: Wallet) => w.id !== data.currentWalletId);
            if (otherWallets.length > 0) setToWalletId(otherWallets[0].id);
            setIsPrivate(false);
            setLenderName('');
            setIsTemplate(false);
            setTemplateName('');
            setIsSplit(false);
        }
    }, [isOpen, editingTransaction, initialType, initialCategory, data]);

    useEffect(() => {
        if (!isEditing && !initialCategory) {
            const cats = (data.categories || []).filter((c: CategoryItem) => {
                if (c.type !== type) return false;
                if (type === TransactionType.EXPENSE && (c.name === Category.TRANSFER || c.name === 'Transfer')) return false;
                return true;
            });
            if (cats.length > 0 && !cats.some((c: CategoryItem) => c.name === category)) {
                setCategory(cats[0].name);
            }
        }
    }, [type, data.categories, isEditing, initialCategory]);

    if (!isOpen) return null;

    // Filter out Transfer from Expense Categories
    const availableCategories = (data.categories || []).filter((c: CategoryItem) => {
        if (c.type !== type) return false;
        if (type === TransactionType.EXPENSE && (c.name === Category.TRANSFER || c.name === 'Transfer')) return false;
        return true;
    });

    const otherWallets = (data.wallets || []).filter((w: Wallet) => w.id !== data.currentWalletId);

    const handleSave = () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;

        Haptics.light();

        if (isEditing && editingTransaction && onEdit) {
            onEdit({
                ...editingTransaction,
                amount: numAmount,
                type,
                category: type === TransactionType.TRANSFER ? Category.TRANSFER : category,
                note,
                date: new Date(date).toISOString(),
                toWalletId: type === TransactionType.TRANSFER ? toWalletId : undefined,
                isPrivate
            });
        } else {
            if (isSplit && type !== TransactionType.TRANSFER) {
                splits.forEach(s => {
                    const splitAmt = parseFloat(s.amount);
                    if (!isNaN(splitAmt) && splitAmt > 0) {
                        onAdd({
                            amount: splitAmt,
                            type,
                            category: s.category,
                            note: s.note ? `${note ? note + ' - ' : ''}${s.note}` : note,
                            date: new Date(date).toISOString(),
                            walletId: data.currentWalletId,
                            isPrivate
                        });
                    }
                });
            } else {
                onAdd(
                    {
                        amount: numAmount,
                        type,
                        category: type === TransactionType.TRANSFER ? Category.TRANSFER : category,
                        note: (type === TransactionType.INCOME && category === Category.LOAN && lenderName) 
                            ? `${note ? note + ' | ' : ''}Lender: ${lenderName}` 
                            : note,
                        date: new Date(date).toISOString(),
                        walletId: data.currentWalletId,
                        toWalletId: type === TransactionType.TRANSFER ? toWalletId : undefined,
                        isPrivate
                    },
                    isTemplate,
                    templateName || `${category} Preset`
                );
            }
        }
        onClose();
    };

    const addSplit = () => {
        setSplits([...splits, { category: availableCategories[0]?.name || Category.OTHER, amount: '', note: '' }]);
    };

    const removeSplit = (index: number) => {
        setSplits(splits.filter((_, i) => i !== index));
    };

    const updateSplit = (index: number, field: 'category' | 'amount' | 'note', value: string) => {
        const updated = [...splits];
        updated[index][field] = value;
        setSplits(updated);
    };

    return createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/80 transition-opacity" 
                onClick={() => { Haptics.light(); onClose(); }} 
            />
            
            {/* Universal Modal Container */}
            <div 
                role="dialog" 
                aria-modal="true" 
                aria-labelledby="add-tx-modal-title"
                className="relative z-50 bg-[var(--bg-surface)] border border-[var(--border-default)] w-full max-w-[460px] rounded-[8px] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200 text-[var(--text-primary)]"
            >

                {/* Header: Title, Type Switcher & Close (No border-b separator) */}
                <div className="flex items-center justify-between">
                    <h3 id="add-tx-modal-title" className="text-base font-semibold text-[var(--text-primary)]">
                        {isEditing ? 'Edit Transaction' : 'Add Transaction'}
                    </h3>

                    <div className="flex items-center gap-2">
                        {/* Segmented Type Pills */}
                        <div className="tabs">
                            {[TransactionType.EXPENSE, TransactionType.INCOME, TransactionType.TRANSFER].map(t => (
                                <button 
                                    key={t} 
                                    type="button"
                                    onClick={() => {
                                        Haptics.light();
                                        if (!isEditing) setType(t);
                                    }}
                                    disabled={isEditing && t !== type}
                                    className={`tab h-[22px] px-2.5 text-[11px] font-medium leading-none ${type === t ? 'is-active' : ''} ${isEditing && t !== type ? 'opacity-30' : ''}`}
                                >
                                    {t === TransactionType.EXPENSE ? 'Expense' : t === TransactionType.INCOME ? 'Income' : 'Transfer'}
                                </button>
                            ))}
                        </div>

                        <button 
                            type="button"
                            onClick={() => {
                                Haptics.light();
                                onClose();
                            }} 
                            className="btn btn--outline btn--icon-sm shrink-0"
                            aria-label="Close"
                        >
                            <X size={15} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                {/* Form Fields: Flat Inputs (No Nested Cards) */}
                <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">

                    {/* Amount Field */}
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-[var(--text-primary)]">
                            Amount ({data.settings.currencySymbol})
                        </label>
                        <input 
                            type="text" 
                            inputMode="decimal" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)} 
                            onKeyDown={e => e.key === 'Enter' && handleSave()}
                            className="w-full h-[46px] bg-[var(--field-bg)] border border-[var(--field-border)] rounded-[8px] px-4 font-mono text-2xl font-bold text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-all"
                            autoFocus
                        />
                    </div>

                    {/* Annotation & Date Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-7 space-y-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-primary)]">Note / Annotation</label>
                            <input 
                                type="text" 
                                placeholder="Note details..." 
                                value={note} 
                                onChange={e => setNote(e.target.value)} 
                                className="w-full h-[38px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[8px] px-3 text-[13px] text-[var(--text-primary)] outline-none transition-all"
                            />
                        </div>
                        <div className="sm:col-span-5 space-y-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-primary)]">Date</label>
                            <GlassDateInput value={date} onChange={setDate} />
                        </div>
                    </div>

                    {/* Destination Vault (If Transfer) */}
                    {type === TransactionType.TRANSFER && (
                        <div className="space-y-1.5">
                            <label className="text-[13px] font-medium text-[var(--text-primary)]">Destination Wallet</label>
                            <GlassSelect 
                                value={toWalletId} 
                                onChange={setToWalletId} 
                                options={data.wallets.filter((w: Wallet) => w.id !== data.currentWalletId).map((w: Wallet) => ({ 
                                    label: w.name, 
                                    value: w.id,
                                    icon: <WalletIcon size={14} className="text-[var(--text-muted)]" />
                                }))} 
                                placeholder="Select target wallet..."
                            />
                        </div>
                    )}

                    {/* Category Selector (If not transfer) */}
                    {type !== TransactionType.TRANSFER && (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[13px] font-medium text-[var(--text-primary)]">Category</label>
                                {type === TransactionType.EXPENSE && (
                                    <button 
                                        type="button"
                                        onClick={() => setIsSplit(!isSplit)}
                                        className="text-[11px] font-medium text-[var(--accent)] hover:underline"
                                    >
                                        {isSplit ? 'Single Category' : 'Split Category'}
                                    </button>
                                )}
                            </div>

                            {!isSplit ? (
                                <GlassSelect 
                                    value={category} 
                                    onChange={setCategory} 
                                    options={data.categories.filter((c: CategoryItem) => c.type === type).map((c: CategoryItem) => ({ 
                                        label: c.name, 
                                        value: c.name,
                                        icon: <CategoryIcon category={c.name} color={c.color} size={15} strokeWidth={1.5} />
                                    }))}
                                />
                            ) : (
                                <div className="space-y-2 pt-1">
                                    {splits.map((s, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <div className="flex-1">
                                                <GlassSelect
                                                    value={s.category}
                                                    onChange={val => updateSplit(idx, 'category', val)}
                                                    options={data.categories.filter((c: CategoryItem) => c.type === type).map((c: CategoryItem) => ({ 
                                                        label: c.name, 
                                                        value: c.name,
                                                        icon: <CategoryIcon category={c.name} color={c.color} size={15} strokeWidth={1.5} />
                                                    }))}
                                                />
                                            </div>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                value={s.amount}
                                                onChange={e => updateSplit(idx, 'amount', e.target.value)}
                                                className="w-24 h-[34px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] px-2.5 text-[12px] font-mono text-[var(--text-primary)] text-right outline-none"
                                            />
                                            {splits.length > 1 && (
                                                <button type="button" onClick={() => removeSplit(idx)} className="btn btn--ghost btn--icon-sm text-red-400">
                                                    <Trash2 size={14} strokeWidth={1.5} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button 
                                        type="button"
                                        onClick={addSplit}
                                        className="text-[12px] font-medium text-[var(--accent)] hover:underline pt-1 block"
                                    >
                                        + Add Split Category
                                    </button>
                                </div>
                            )}

                            {/* Loan Source Lender Field */}
                            {type === TransactionType.INCOME && category === Category.LOAN && !isEditing && (
                                <div className="pt-2 space-y-1">
                                    <label className="text-[12px] font-medium text-amber-400">Lender Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="Lender identity..." 
                                        value={lenderName} 
                                        onChange={e => setLenderName(e.target.value)}
                                        className="w-full h-[36px] bg-[var(--bg-subtle)] border border-amber-500/30 text-amber-400 placeholder:text-amber-400/40 text-[13px] px-3 rounded-[6px] outline-none"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stealth Ghost Mode Toggle */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <EyeOff size={15} strokeWidth={1.5} className={isPrivate ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                            <span className="text-[13px] font-medium text-[var(--text-primary)]">Vault Stealth (Ghost Mode)</span>
                        </div>
                        <button 
                            type="button"
                            role="switch"
                            aria-checked={isPrivate}
                            onClick={() => { Haptics.light(); setIsPrivate(!isPrivate); }}
                            className={`toggle-switch ${isPrivate ? 'is-active' : ''}`}
                        >
                            <div className="toggle-switch-thumb" />
                        </button>
                    </div>

                    {/* Template Preset Option */}
                    {!isEditing && type !== TransactionType.TRANSFER && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Save size={15} strokeWidth={1.5} className={isTemplate ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                                    <span className="text-[13px] font-medium text-[var(--text-primary)]">Save as Preset Template</span>
                                </div>
                                <button 
                                    type="button"
                                    role="switch"
                                    aria-checked={isTemplate}
                                    onClick={() => { Haptics.light(); setIsTemplate(!isTemplate); }}
                                    className={`toggle-switch ${isTemplate ? 'is-active' : ''}`}
                                >
                                    <div className="toggle-switch-thumb" />
                                </button>
                            </div>

                            {isTemplate && (
                                <input 
                                    type="text" 
                                    placeholder="Preset label (e.g. Daily Coffee)..." 
                                    value={templateName} 
                                    onChange={e => setTemplateName(e.target.value)}
                                    className="w-full h-[36px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[6px] px-3 text-[13px] text-[var(--text-primary)] outline-none"
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer Buttons (No border-t separator) */}
                <div className="flex justify-end gap-2.5 pt-2">
                    <button
                        type="button"
                        onClick={() => { Haptics.light(); onClose(); }}
                        className="btn btn--outline h-[32px] px-3.5 text-[12px]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!amount}
                        className="btn btn--primary h-[32px] px-4 text-[12px]"
                    >
                        {isEditing ? 'Save Changes' : 'Execute Transaction'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
