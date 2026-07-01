import React, { useState } from 'react';
import { Calendar, Plus, Trash2, Tag, CreditCard } from 'lucide-react';
import { AppData, Provision } from '../types';
import { Haptics } from '../services/haptics';

interface ProvisioningCenterProps {
    data: AppData;
    updateData: (data: Partial<AppData>) => void;
    formatMoney: (val: number, sym: string) => string;
}

export const ProvisioningCenter: React.FC<ProvisioningCenterProps> = ({ data, updateData, formatMoney }) => {
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
        Haptics.success();
    };

    const removeProvision = (id: string) => {
        updateData({ provisions: data.provisions.filter(p => p.id !== id) });
        Haptics.light();
    };

    const totalProvisioned = data.provisions.reduce((sum, p) => sum + p.amount, 0);

    return (
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-8 px-2 lg:px-0 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 overflow-x-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {/* Entry Form */}
                <div className="liquid-glass p-4 md:p-8 rounded-lg space-y-4 md:space-y-6">
                    <h3 className="text-sm font-bold text-main uppercase tracking-wider">Add Upcoming Expense</h3>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-muted/40 uppercase tracking-[0.2em]">Expense Name</label>
                            <div className="relative">
                                <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="e.g., MacBook Pro, Q3 Taxes..."
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-black/20 rounded-sm pl-12 pr-4 py-4 text-sm text-main border border-white/5 focus:border-primary/40 outline-none transition-all"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted/40 uppercase tracking-[0.2em]">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 font-bold text-sm">{data.settings.currencySymbol}</span>
                                    <input 
                                        type="number" 
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="w-full bg-black/20 rounded-sm pl-10 pr-4 py-4 text-sm text-main border border-white/5 focus:border-primary/40 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-muted/40 uppercase tracking-[0.2em]">Target Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30" size={16} />
                                    <input 
                                        type="date" 
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="w-full bg-black/20 rounded-sm pl-12 pr-4 py-4 text-sm text-main border border-white/5 focus:border-primary/40 outline-none transition-all color-scheme-dark"
                                    />
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={addProvision}
                            className="w-full py-4 bg-primary text-white rounded-sm font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 active:scale-95 transition-all mt-4"
                        >
                            Add Upcoming Expense
                        </button>
                    </div>
                </div>

                {/* Status Card */}
                <div className="space-y-4 md:space-y-6">
                    <div className="liquid-glass p-4 md:p-8 rounded-lg bg-gradient-to-br from-primary/10 to-transparent border-primary/10">
                         <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Upcoming Expenses</p>
                         <h2 className="text-4xl font-bold text-main mb-2">{formatMoney(totalProvisioned, data.settings.currencySymbol)}</h2>
                         <p className="text-xs text-muted leading-relaxed">This shows the total money you have set aside or plan to spend on future goals.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                        <div className="glass-card p-4 md:p-6 rounded-md">
                             <p className="text-[9px] font-black text-muted/40 uppercase tracking-widest mb-1">Item Count</p>
                             <p className="text-xl font-bold text-main">{data.provisions.length}</p>
                        </div>
                        <div className="glass-card p-4 md:p-6 rounded-md">
                             <p className="text-[9px] font-black text-muted/40 uppercase tracking-widest mb-1">Avg per Item</p>
                             <p className="text-xl font-bold text-main">
                                 {data.provisions.length > 0 ? formatMoney(totalProvisioned / data.provisions.length, data.settings.currencySymbol) : '—'}
                             </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-muted/40 uppercase tracking-[0.3em] px-2">Scheduled Expenses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.provisions.map(p => (
                        <div key={p.id} className="glass-card p-5 rounded-md flex flex-col gap-4 group hover:border-white/20 transition-all">
                             <div className="flex justify-between items-start">
                                 <div className="p-3 bg-primary/10 rounded-md text-primary">
                                     <CreditCard size={20} />
                                 </div>
                                 <button onClick={() => removeProvision(p.id)} className="p-2 text-muted/20 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100">
                                     <Trash2 size={16} />
                                 </button>
                             </div>
                             <div>
                                 <h4 className="font-bold text-main tracking-tight">{p.name}</h4>
                                 <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-0.5">{new Date(p.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                             </div>
                             <div className="pt-4 border-t border-white/5 flex justify-between items-end">
                                 <span className="text-[9px] font-black text-muted/40 uppercase tracking-widest">Amount</span>
                                 <span className="text-lg font-bold text-main">{formatMoney(p.amount, data.settings.currencySymbol)}</span>
                             </div>
                        </div>
                    ))}
                    {data.provisions.length === 0 && (
                        <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-lg">
                             <p className="text-muted/40 text-sm font-bold uppercase tracking-widest">No upcoming expenses yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
