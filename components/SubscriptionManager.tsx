import React, { useMemo } from 'react';
import { AppData, Transaction, TransactionType, RecurringRule } from '../types';
import { Calendar, CheckCircle2, Ghost, Plus, AlertCircle, TrendingUp } from 'lucide-react';
import { Haptics } from '../services/haptics';

interface SubscriptionManagerProps {
    data: AppData;
    updateData: (data: Partial<AppData>) => void;
    formatMoney: (val: number, sym: string) => string;
}

const FREQUENCIES = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const;

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ data, updateData, formatMoney }) => {
    
    // Logic to detect potential subscriptions
    const detectedSubscriptions = useMemo(() => {
        const potential: Record<string, Transaction[]> = {};
        
        data.transactions.forEach(tx => {
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

    const registerRecurringRule = (name: string, amount: number) => {
        const newRule: RecurringRule = {
            id: Date.now().toString(),
            name,
            amount,
            type: TransactionType.EXPENSE,
            category: data.transactions.find(t => t.note?.toLowerCase() === name.toLowerCase())?.category || 'Fixed',
            frequency: 'MONTHLY',
            nextDueDate: new Date().toISOString().split('T')[0],
            walletId: data.currentWalletId,
            isActive: true,
            note: name
        };
        updateData({ recurringRules: [...(data.recurringRules || []), newRule] });
        Haptics.success();
    };

    const deleteRule = (id: string) => {
        updateData({ recurringRules: data.recurringRules.filter(r => r.id !== id) });
    };

    const toggleRuleActive = (id: string) => {
        updateData({ 
            recurringRules: data.recurringRules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r) 
        });
    };

    const monthlyTotal = detectedSubscriptions
        .filter(s => s.isConfirmed)
        .reduce((sum, s) => sum + s.amount, 0);

    return (
        <div className="max-w-5xl mx-auto space-y-4 lg:space-y-8 px-2 lg:px-0 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 overflow-x-hidden">
            <header className="flex items-center justify-end">
                <div className="liquid-glass px-4 py-3 lg:px-6 lg:py-4 rounded-md flex items-center gap-3 lg:gap-4 border-primary/20">
                     <TrendingUp className="text-primary" size={20} />
                     <div>
                         <p className="text-[8px] font-black text-muted/50 uppercase tracking-widest">Total Monthly Subscriptions</p>
                         <p className="text-xl font-bold text-primary">{formatMoney(monthlyTotal, data.settings.currencySymbol)}</p>
                     </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                <div className="lg:col-span-8 space-y-6 lg:space-y-8">
                    {/* Active Rules */}
                    {data.recurringRules && data.recurringRules.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] px-2">Active Subscriptions</h3>
                            <div className="space-y-3">
                                {data.recurringRules.map(rule => (
                                    <div key={rule.id} className="glass-card p-4 lg:p-5 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-primary/20 bg-primary/5">
                                        <div className="flex items-center gap-3 lg:gap-4">
                                            <div className={`p-4 rounded-sm ${rule.isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-muted/40'}`}>
                                                <CheckCircle2 size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-main tracking-tight flex items-center gap-2">
                                                    {rule.name}
                                                    {!rule.isActive && <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[6px] font-black uppercase tracking-widest rounded border border-amber-500/20">Paused</span>}
                                                </h4>
                                                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">
                                                    {formatMoney(rule.amount, data.settings.currencySymbol)} • {rule.frequency}
                                                </p>
                                                <div className="mt-2 flex gap-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] text-white/20 font-black uppercase tracking-widest">1-Year Cost</span>
                                                        <span className="text-[10px] font-bold text-white/60">{formatMoney(rule.amount * 12, data.settings.currencySymbol)}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] text-white/20 font-black uppercase tracking-widest">3-Year Cost</span>
                                                        <span className="text-[10px] font-bold text-white/60">{formatMoney(rule.amount * 36, data.settings.currencySymbol)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:justify-start">
                                            <button 
                                                onClick={() => toggleRuleActive(rule.id)}
                                                className={`p-2 rounded-md transition-all ${rule.isActive ? 'text-primary hover:bg-primary/10' : 'text-muted/30 hover:bg-white/5'}`}
                                            >
                                                {rule.isActive ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                            </button>
                                            <button 
                                                onClick={() => deleteRule(rule.id)}
                                                className="p-2 text-muted/20 hover:text-rose-500 transition-colors"
                                            >
                                                <Plus size={18} className="rotate-45" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                                                        <h3 className="text-[10px] font-black text-muted/40 uppercase tracking-[0.3em] px-2">Detected Subscriptions</h3>
                        <div className="space-y-3">
                            {detectedSubscriptions.map(sub => {
                                const isAlreadyRegistered = data.recurringRules?.some(r => r.name.toLowerCase() === sub.name.toLowerCase() && r.amount === sub.amount);
                                return (
                                    <div key={sub.id} className={`glass-card p-4 lg:p-5 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${sub.isConfirmed ? 'border-emerald-500/30 bg-emerald-500/5' : 'hover:border-white/10'}`}>
                                        <div className="flex items-center gap-3 lg:gap-4">
                                            <div className={`p-4 rounded-sm ${sub.isConfirmed ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-muted/40'}`}>
                                                <Ghost size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-main tracking-tight flex items-center gap-2">
                                                    {sub.name}
                                                    {sub.isStale && <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-500 text-[6px] font-black uppercase tracking-widest rounded border border-rose-500/20 flex items-center gap-1"><AlertCircle size={8} /> Stale</span>}
                                                </h4>
                                                <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">
                                                    {formatMoney(sub.amount, data.settings.currencySymbol)} • {sub.instances} instances
                                                </p>
                                                <div className="mt-2 flex gap-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[7px] text-white/20 font-black uppercase tracking-widest">Yearly Cost</span>
                                                        <span className="text-[10px] font-bold text-white/60">{formatMoney(sub.amount * 12, data.settings.currencySymbol)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 w-full sm:w-auto justify-end sm:justify-start">
                                            <button 
                                                onClick={() => toggleSubscriptionStatus(sub.name, sub.amount)}
                                                className={`px-3 py-2 rounded-md font-bold text-[8px] uppercase tracking-widest transition-all ${sub.isConfirmed ? 'bg-white/10 text-main' : 'bg-black/20 text-muted hover:text-main border border-white/5'}`}
                                            >
                                                {sub.isConfirmed ? 'Confirmed' : 'Confirm'}
                                            </button>
                                            {!isAlreadyRegistered && (
                                                <button 
                                                    onClick={() => registerRecurringRule(sub.name, sub.amount)}
                                                    className="px-4 py-2 bg-primary text-white rounded-md font-bold text-[8px] uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                                >
                                                    Add Subscription
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {detectedSubscriptions.length === 0 && (
                                <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-lg">
                                    <AlertCircle className="mx-auto text-muted/20 mb-4" size={32} />
                                    <p className="text-muted/40 text-sm font-bold uppercase tracking-widest">No recurring patterns identified yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-4 lg:space-y-6">
                    <div className="liquid-glass p-4 lg:p-6 rounded-md space-y-4">
                        <h4 className="text-[9px] font-black text-muted/40 uppercase tracking-widest">Add Subscription Manually</h4>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const name = (form.elements.namedItem('name') as HTMLInputElement).value;
                            const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
                            const frequency = (form.elements.namedItem('freq') as HTMLSelectElement).value as any;
                            if (name && amount) {
                                const newRule: RecurringRule = {
                                    id: Date.now().toString(),
                                    name,
                                    amount,
                                    type: TransactionType.EXPENSE,
                                    category: 'Fixed',
                                    frequency,
                                    nextDueDate: new Date().toISOString().split('T')[0],
                                    walletId: data.currentWalletId,
                                    isActive: true
                                };
                                updateData({ recurringRules: [...(data.recurringRules || []), newRule] });
                                form.reset();
                                Haptics.success();
                            }
                        }} className="space-y-3">
                            <input name="name" placeholder="Service Name..." className="w-full bg-black/20 border border-white/5 rounded-md px-4 py-2.5 text-xs text-main outline-none focus:border-primary/40" required />
                            <input name="amount" type="number" placeholder="Amount..." className="w-full bg-black/20 border border-white/5 rounded-md px-4 py-2.5 text-xs text-main outline-none focus:border-primary/40" required />
                            <select name="freq" className="w-full bg-black/20 border border-white/5 rounded-md px-4 py-2.5 text-xs text-main outline-none focus:border-primary/40">
                                {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                            <button type="submit" className="w-full py-3 bg-primary text-white rounded-md font-black text-[9px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20">+ Add Subscription</button>
                        </form>
                    </div>

                    <div className="liquid-glass p-4 lg:p-6 rounded-md space-y-4 opacity-60">
                        <h4 className="text-[9px] font-black text-muted/40 uppercase tracking-widest">Subscription Tips</h4>
                        <p className="text-xs text-muted leading-relaxed">
                            "Automate" creates a recurring task that generates transactions on the specified frequency. Useful for rent, wifi, or Netflix.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
