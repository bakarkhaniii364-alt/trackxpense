import React, { useState } from 'react';
import { AppData, TransactionType } from '../../types';
import { 
    X, 
    Play, 
    TrendingDown, 
    ArrowRight,
    Info,
    AlertTriangle
} from 'lucide-react';
import { formatMoney } from '../../utils/formatters';
import { PredictiveEngine } from '../../services/PredictiveEngine';

interface SimulationModuleProps {
    isOpen: boolean;
    onClose: () => void;
    data: AppData;
}

export const SimulationModule: React.FC<SimulationModuleProps> = ({
    isOpen,
    onClose,
    data
}) => {
    const [amount, setAmount] = useState<string>('');
    const [note, setNote] = useState<string>('');
    const [isSimulating, setIsSimulating] = useState(false);

    if (!isOpen) return null;

    const currentTotalIncome = data.transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const currentTotalExpense = data.transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    const currentBalance = currentTotalIncome - currentTotalExpense;
    const currentRunway = PredictiveEngine.getRunwayDays(data, currentBalance);

    const simAmount = parseFloat(amount) || 0;
    const simBalance = currentBalance - simAmount;
    const simRunway = PredictiveEngine.getRunwayDays(data, simBalance);
    const runwayDelta = currentRunway - simRunway;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose} />
            
            <div className="relative w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-[40px] shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 pb-4 flex justify-between items-start">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">What-If Simulator</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Scenario: Large Expense</h2>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/5 rounded-md text-white/40 hover:text-white transition-all"><X size={20}/></button>
                </div>

                <div className="p-8 space-y-8">
                    {/* Input Phase */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-2">Simulated Amount</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-white/10">{data.settings.currencySymbol}</span>
                                <input 
                                    type="number" 
                                    autoFocus
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-white/5 border border-white/5 rounded-xl pl-12 pr-6 py-5 text-3xl font-black text-white outline-none focus:border-primary/40 focus:bg-white/[0.07] transition-all"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-widest ml-2">Description / Reason</label>
                            <input 
                                type="text" 
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="e.g. New laptop, emergency repair..."
                                className="w-full bg-white/5 border border-white/5 rounded-md px-6 py-4 text-sm font-bold text-white outline-none focus:border-primary/40 transition-all"
                            />
                        </div>
                    </div>

                    {/* Projections */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 rounded-xl bg-white/5 border border-white/5 space-y-2">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block">Balance Impact</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold text-white">{formatMoney(simBalance, data.settings.currencySymbol)}</span>
                                <span className="text-[10px] font-bold text-rose-500">-{formatMoney(simAmount, data.settings.currencySymbol)}</span>
                            </div>
                        </div>
                        <div className="p-6 rounded-xl bg-white/5 border border-white/5 space-y-2">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest block">Runway Impact</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-xl font-bold text-white">{simRunway} Days</span>
                                <span className="text-[10px] font-bold text-rose-500">-{runwayDelta} Days</span>
                            </div>
                        </div>
                    </div>

                    {/* Verdict */}
                    {simAmount > 0 && (
                        <div className={`p-6 rounded-xl flex items-center gap-5 border transition-all ${simRunway < 30 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-primary/10 border-primary/20'}`}>
                            <div className={`p-3 rounded-md ${simRunway < 30 ? 'bg-rose-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
                                {simRunway < 30 ? <AlertTriangle size={24} /> : <Info size={24} />}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Result</span>
                                <p className="text-xs font-bold text-white leading-relaxed">
                                    {simRunway < 30 
                                        ? `CRITICAL: This purchase will drop your runway below the 30-day safety margin.` 
                                        : `STABLE: Your reserves remain healthy. This transaction is within safety limits.`}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 pt-0 flex flex-col gap-4">
                    <p className="text-[9px] font-black text-center text-white/20 uppercase tracking-widest italic">Note: Simulations are local and temporary. No data will be saved.</p>
                    <button 
                        onClick={onClose}
                        className="w-full py-5 bg-white/5 hover:bg-white/10 text-white rounded-[24px] font-black text-[12px] uppercase tracking-[0.2em] transition-all active:scale-95 border border-white/10 flex items-center justify-center gap-3"
                    >
                        Close Simulator
                    </button>
                </div>
            </div>
        </div>
    );
};
