import React, { useState, useMemo } from 'react';
import { AppData, Transaction, TransactionType, RecurringRule } from '../types';
import { Calendar, CheckCircle2, Ghost, Plus, AlertCircle, TrendingUp, X, Trash2 } from 'lucide-react';
import { Haptics } from '../services/haptics';
import { Modal } from './shared/Modal';

interface SubscriptionManagerProps {
    data: AppData;
    updateData: (data: Partial<AppData>) => void;
    formatMoney: (val: number, sym: string) => string;
}

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ data, updateData, formatMoney }) => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [subName, setSubName] = useState('');
    const [subAmount, setSubAmount] = useState('');
    const [subFreq, setSubFreq] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');
    
    // Logic to detect potential subscriptions from transactions
    const detectedSubscriptions = useMemo(() => {
        const potential: Record<string, Transaction[]> = {};
        
        (data.transactions || []).forEach(tx => {
            if (tx.type === TransactionType.EXPENSE && tx.note) {
                const key = `${tx.note.toLowerCase()}_${tx.amount}`;
                if (!potential[key]) potential[key] = [];
                potential[key].push(tx);
            }
        });

        return Object.entries(potential)
            .filter(([_, instances]) => instances.length >= 2)
            .map(([key, instances]) => {
                const sorted = instances.sort((a,b) => b.date.localeCompare(a.date));
                const lastDate = new Date(sorted[0].date);
                const isStale = (Date.now() - lastDate.getTime()) > (45 * 24 * 60 * 60 * 1000);
                return {
                    id: instances[0].id,
                    name: instances[0].note || 'Untitled Service',
                    amount: instances[0].amount,
                    frequency: 'Monthly',
                    instances: instances.length,
                    lastDate: sorted[0].date,
                    isStale,
                    isConfirmed: instances.some(tx => tx.isSubscription)
                };
            });
    }, [data.transactions]);

    const toggleSubscriptionStatus = (name: string, amount: number) => {
        const updatedTransactions = data.transactions.map(tx => {
            if (tx.note?.toLowerCase() === name.toLowerCase() && tx.amount === amount) {
                return { ...tx, isSubscription: !tx.isSubscription };
            }
            return tx;
        });
        updateData({ transactions: updatedTransactions });
        Haptics.success();
    };

    const registerRecurringRule = (name: string, amount: number, freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' = 'MONTHLY') => {
        const newRule: RecurringRule = {
            id: Date.now().toString(),
            name,
            amount,
            type: TransactionType.EXPENSE,
            category: data.transactions.find(t => t.note?.toLowerCase() === name.toLowerCase())?.category || 'Fixed',
            frequency: freq,
            nextDueDate: new Date().toISOString().split('T')[0],
            walletId: data.currentWalletId,
            isActive: true,
            note: name
        };
        updateData({ recurringRules: [...(data.recurringRules || []), newRule] });
        Haptics.success();
    };

    const handleManualAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (subName && subAmount) {
            registerRecurringRule(subName, parseFloat(subAmount), subFreq);
            setSubName('');
            setSubAmount('');
            setIsAddModalOpen(false);
        }
    };

    const deleteRule = (id: string) => {
        updateData({ recurringRules: data.recurringRules.filter(r => r.id !== id) });
    };

    const toggleRuleActive = (id: string) => {
        updateData({ 
            recurringRules: data.recurringRules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r) 
        });
    };

    const monthlyTotal = (data.recurringRules || [])
        .filter(r => r.isActive)
        .reduce((sum, r) => sum + (r.frequency === 'YEARLY' ? r.amount / 12 : r.amount), 0);

    const activeRules = data.recurringRules || [];
    const hasAnySubscriptions = activeRules.length > 0 || detectedSubscriptions.length > 0;

    return (
        <div className="w-full mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 px-0.5 pt-0.5">
            
            {/* Cloudflare-Style Section Header Outside Card */}
            <div className="flex items-center justify-between pb-2">
                <div>
                    <h2 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Subscriptions</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Track active recurring services and auto-detected monthly subscriptions.</p>
                </div>
                <button
                    onClick={() => {
                        setSubName('');
                        setSubAmount('');
                        setIsAddModalOpen(true);
                    }}
                    className="btn btn--primary h-[32px] px-3.5 text-[12px] shrink-0"
                >
                    <Plus size={14} />
                    <span>Add subscription</span>
                </button>
            </div>

            {/* Monthly Burn Rate Summary Card */}
            {hasAnySubscriptions && (
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 rounded-[10px] flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Monthly Subscription Burn</p>
                        <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight mt-1">
                            {formatMoney(monthlyTotal, data.settings.currencySymbol)}
                        </p>
                    </div>
                    <div className="px-3 py-1.5 rounded-[6px] bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[12px] font-medium">
                        {activeRules.length} active service{activeRules.length === 1 ? '' : 's'}
                    </div>
                </div>
            )}

            {/* Active Subscriptions Grid */}
            {hasAnySubscriptions ? (
                <div className="space-y-6">
                    {/* Active Rules Section */}
                    {activeRules.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Configured Subscriptions</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {activeRules.map(rule => (
                                    <div 
                                        key={rule.id} 
                                        className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 rounded-[10px] flex items-center justify-between group transition-all"
                                    >
                                        <div className="flex items-center gap-3.5">
                                            <Ghost size={20} strokeWidth={1.5} className={rule.isActive ? 'text-blue-400' : 'text-[var(--text-muted)]'} />
                                            <div>
                                                <h4 className="text-[14px] font-medium text-[var(--text-primary)] flex items-center gap-2">
                                                    {rule.name}
                                                    {!rule.isActive && <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-medium rounded border border-amber-500/20">Paused</span>}
                                                </h4>
                                                <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                                                    {formatMoney(rule.amount, data.settings.currencySymbol)} • {rule.frequency.toLowerCase()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button 
                                                onClick={() => toggleRuleActive(rule.id)}
                                                className={`btn btn--xs ${rule.isActive ? 'btn--secondary text-blue-400' : 'btn--outline text-[var(--text-muted)]'}`}
                                            >
                                                {rule.isActive ? 'Active' : 'Resume'}
                                            </button>
                                            <button 
                                                onClick={() => deleteRule(rule.id)}
                                                className="btn btn--ghost btn--icon-sm text-[var(--text-muted)] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Delete subscription"
                                            >
                                                <Trash2 size={15} strokeWidth={1.5} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Auto-Detected Subscriptions Section */}
                    {detectedSubscriptions.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">Auto-Detected Recurring Charges</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {detectedSubscriptions.map(sub => {
                                    const isAlreadyRegistered = activeRules.some(r => r.name.toLowerCase() === sub.name.toLowerCase() && r.amount === sub.amount);
                                    return (
                                        <div key={sub.id} className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 rounded-[10px] flex items-center justify-between group transition-all">
                                            <div className="flex items-center gap-3.5">
                                                <Ghost size={20} strokeWidth={1.5} className="text-[var(--text-muted)]" />
                                                <div>
                                                    <h4 className="text-[14px] font-medium text-[var(--text-primary)]">{sub.name}</h4>
                                                    <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
                                                        {formatMoney(sub.amount, data.settings.currencySymbol)} • {sub.instances} billing occurrences
                                                    </p>
                                                </div>
                                            </div>
                                            {!isAlreadyRegistered && (
                                                <button 
                                                    onClick={() => registerRecurringRule(sub.name, sub.amount)}
                                                    className="btn btn--primary btn--sm shrink-0"
                                                >
                                                    Track Service
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Centered Empty State Box */
                <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[10px] p-12 text-center flex flex-col items-center justify-center my-4">
                    <Ghost size={32} strokeWidth={1.5} className="text-[var(--text-muted)] mb-3" />
                    <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">No active subscriptions</h3>
                    <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-6 leading-relaxed">
                        Track your recurring software, streaming services, or monthly bills to prevent hidden subscription drift.
                    </p>
                    <button
                        onClick={() => {
                            setSubName('');
                            setSubAmount('');
                            setIsAddModalOpen(true);
                        }}
                        className="btn btn--primary h-[32px] px-3.5 text-[12px]"
                    >
                        <Plus size={14} />
                        <span>Add subscription</span>
                    </button>
                </div>
            )}

            {/* --- MODAL: Add Subscription --- */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Add a Subscription"
            >
                <form onSubmit={handleManualAdd} className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-[var(--text-primary)]">Service Name</label>
                        <input 
                            type="text" 
                            placeholder="e.g. Netflix, Spotify, AWS, Gym..." 
                            value={subName}
                            onChange={e => setSubName(e.target.value)}
                            className="w-full h-[36px] bg-[var(--bg-subtle)] rounded-[6px] px-3 text-[12px] text-[var(--text-primary)] border border-[var(--border-default)] focus:border-[#2563EB] outline-none transition-all"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-[var(--text-primary)]">Recurring Amount ({data.settings.currencySymbol})</label>
                        <input 
                            type="number" 
                            placeholder="0.00" 
                            value={subAmount}
                            onChange={e => setSubAmount(e.target.value)}
                            className="w-full h-[36px] bg-[var(--bg-subtle)] rounded-[6px] px-3 text-[12px] text-[var(--text-primary)] border border-[var(--border-default)] focus:border-[#2563EB] outline-none transition-all"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[13px] font-medium text-[var(--text-primary)]">Billing Cycle</label>
                        <select 
                            value={subFreq} 
                            onChange={e => setSubFreq(e.target.value as any)}
                            className="w-full h-[36px] bg-[var(--bg-subtle)] rounded-[6px] px-3 text-[12px] text-[var(--text-primary)] border border-[var(--border-default)] focus:border-[#2563EB] outline-none transition-all"
                        >
                            {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0) + f.slice(1).toLowerCase()}</option>)}
                        </select>
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
                            type="submit"
                            disabled={!subName || !subAmount}
                            className="btn btn--primary h-[32px] px-4 text-[12px]"
                        >
                            Add subscription
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
