import React, { useState } from 'react';
import {
  Calendar,
  Plus,
  Trash as Trash2,
  Tag,
  X,
  Clock
} from '@phosphor-icons/react';
import { AppData, Provision } from '../types';
import { Haptics } from '../services/haptics';
import { Modal } from './shared/Modal';

interface ProvisioningCenterProps {
    data: AppData;
    updateData: (data: Partial<AppData>) => void;
    formatMoney: (val: number, sym: string) => string;
}

export const ProvisioningCenter: React.FC<ProvisioningCenterProps> = ({ data, updateData, formatMoney }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');

    const addProvision = () => {
        if (!name || !amount || !date) return;
        
        const newProvision: Provision = {
            id: `prov_${Date.now()}`,
            name,
            amount: parseFloat(amount),
            date
        };

        updateData({ provisions: [...data.provisions, newProvision] });
        setName('');
        setAmount('');
        setDate('');
        setIsAddModalOpen(false);
        Haptics.success();
    };

    const removeProvision = (id: string) => {
        updateData({ provisions: data.provisions.filter(p => p.id !== id) });
        Haptics.light();
    };

    const totalProvisioned = data.provisions.reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="w-full mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-0.5 pt-0.5">
            
            {/* Cloudflare-Style Section Header Outside Card */}
            <div className="flex items-center justify-between pb-2">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Upcoming Expenses</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Schedule planned future purchases or bills to monitor 30-day liabilities.</p>
                </div>
                <button
                    onClick={() => {
                        setName('');
                        setAmount('');
                        setDate('');
                        setIsAddModalOpen(true);
                    }}
                    className="btn btn--primary h-[32px] px-3.5 text-[12px] shrink-0"
                >
                    <Plus size={14} />
                    <span>Add expense</span>
                </button>
            </div>

            {/* Total Summary Card */}
            {data.provisions.length > 0 && (
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 rounded-[10px] flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Total Scheduled Liabilities</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight mt-1">
                            {formatMoney(totalProvisioned, data.settings.currencySymbol)}
                        </p>
                    </div>
                    <div className="pill pill--accent text-[11px] py-1 px-2.5">
                        {data.provisions.length} scheduled
                    </div>
                </div>
            )}

            {/* List / Grid Container */}
            {data.provisions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.provisions.map((p) => {
                        const daysLeft = Math.ceil((new Date(p.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                        return (
                            <div 
                                key={p.id} 
                                className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 rounded-[10px] flex items-center justify-between group transition-all"
                            >
                                <div className="space-y-1 min-w-0 pr-2">
                                    <h4 className="text-[14px] font-medium text-[var(--text-primary)] truncate">{p.name}</h4>
                                    <p className="text-base font-semibold text-[var(--text-primary)]">
                                        {formatMoney(p.amount, data.settings.currencySymbol)}
                                    </p>
                                    <div className="flex items-center gap-2 pt-1 text-[11px] text-[var(--text-muted)]">
                                        <Clock size={12} />
                                        <span>{new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        <span className={`pill text-[10px] py-0.5 px-2 ${daysLeft <= 3 ? 'pill--warning' : 'pill--expense'}`}>
                                            {daysLeft <= 0 ? 'Due' : `${daysLeft}d left`}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeProvision(p.id)}
                                    className="btn btn--ghost btn--icon-sm text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                    title="Delete expense"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Centered Empty State Box */
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[10px] p-12 text-center flex flex-col items-center justify-center my-4">
                    <Calendar size={32} strokeWidth={1.5} className="text-[var(--text-muted)] mb-3" />
                    <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No upcoming expenses</h3>
                    <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-6 leading-relaxed">
                        Schedule future purchases, recurring bills, or planned liabilities to monitor 30-day balance impact.
                    </p>
                    <button
                        onClick={() => {
                            setName('');
                            setAmount('');
                            setDate('');
                            setIsAddModalOpen(true);
                        }}
                        className="btn btn--primary h-[32px] px-3.5 text-[12px]"
                    >
                        <Plus size={14} />
                        <span>Add expense</span>
                    </button>
                </div>
            )}

            {/* --- MODAL: Add Upcoming Expense --- */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add Upcoming Expense"
            >
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-[var(--text-primary)]">Expense Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. MacBook Pro, Taxes, Rent..."
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full h-[36px] bg-[var(--field-bg)] rounded-[6px] px-3 text-[13px] text-[var(--text-primary)] border border-[var(--field-border)] outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-[var(--text-primary)]">Amount ({data.settings.currencySymbol})</label>
                        <input 
                            type="number" 
                            placeholder="0.00"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full h-[36px] bg-[var(--field-bg)] rounded-[6px] px-3 text-[13px] text-[var(--text-primary)] border border-[var(--field-border)] outline-none transition-all font-mono"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-[var(--text-primary)]">Due Date</label>
                        <input 
                            type="date" 
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full h-[36px] bg-[var(--field-bg)] rounded-[6px] px-3 text-[13px] text-[var(--text-primary)] border border-[var(--field-border)] outline-none transition-all color-scheme-dark"
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3">
                        <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="btn btn--outline h-[32px] px-3.5 text-[12px]"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={addProvision}
                            disabled={!name || !amount || !date}
                            className="btn btn--primary h-[32px] px-4 text-[12px]"
                        >
                            Add expense
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
