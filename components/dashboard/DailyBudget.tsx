import React, { useState } from 'react';
import { Zap, Check, X } from 'lucide-react';
import { AppData } from '../../types';

interface DailyBudgetProps {
    dailySpent: number;
    dailyLimit: number;
    dailyProgress: number;
    isOverBudget: boolean;
    data: AppData;
    updateData: (d: Partial<AppData>) => void;
    formatMoney: (val: number, sym: string) => string;
}

export const DailyBudget: React.FC<DailyBudgetProps> = ({
    dailySpent,
    dailyLimit,
    dailyProgress,
    isOverBudget,
    data,
    updateData,
    formatMoney
}) => {
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [tempGoal, setTempGoal] = useState(dailyLimit ? dailyLimit.toString() : '');

    const saveGoal = () => {
        const val = parseFloat(tempGoal);
        if (!isNaN(val) && val >= 0) {
            updateData({ profile: { ...data.profile, dailyGoal: val }});
        }
        setIsEditingGoal(false);
    };

    const getStatusColor = () => {
        if (dailyLimit <= 0) return 'primary';
        if (isOverBudget) return 'rose-500';
        if (dailyProgress > 85) return 'amber-500';
        return 'emerald-500';
    };

    const statusColor = getStatusColor();
    const glowClass = isOverBudget 
        ? 'bg-rose-500/5 border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.15)]' 
        : dailyProgress > 85 
            ? 'bg-amber-500/5 border-amber-500/30 shadow-[0_0_25px_rgba(245,158,11,0.1)]' 
            : 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]';

    return (
        <div className={`glass-card bento-card flex-row items-center gap-3.5 lg:gap-5 transition-all duration-700 ${glowClass}`}>
            <div className={`p-3 lg:p-4 rounded-sm shadow-sm border transition-all duration-700 ${
                isOverBudget 
                    ? 'bg-rose-500 border-rose-400 text-white animate-pulse' 
                    : dailyProgress > 85 
                        ? 'bg-amber-500/20 border-amber-500/30 text-amber-500' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
            }`}>
                <Zap size={18} />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-black text-muted/40 uppercase tracking-[0.2em]">Daily Spending Cap</span>
                    
                    {isEditingGoal ? (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                            <input 
                                autoFocus
                                type="number" 
                                className="w-24 bg-main/5 text-main text-xs px-3 py-1.5 rounded-md outline-none border border-main/10 focus:border-primary/40 font-bold"
                                value={tempGoal}
                                onChange={e => setTempGoal(e.target.value)}
                                placeholder="Limit..."
                             />
                            <button onClick={saveGoal} className="p-1.5 bg-emerald-500/20 text-emerald-500 rounded-md hover:bg-emerald-500/30 active:scale-90"><Check size={14}/></button>
                            <button onClick={() => setIsEditingGoal(false)} className="p-1.5 bg-main/5 text-muted rounded-md hover:bg-main/10 active:scale-90"><X size={14}/></button>
                        </div>
                    ) : (
                        dailyLimit > 0 ? (
                            <button onClick={() => { setTempGoal(dailyLimit.toString()); setIsEditingGoal(true); }} className={`text-[10px] font-black tracking-tight ${isOverBudget ? 'text-rose-500' : 'text-muted/60'} hover:text-primary transition-colors px-2.5 py-1 bg-main/5 border border-main/10 rounded-md`}>
                                {formatMoney(dailySpent, data.settings.currencySymbol)} / {formatMoney(dailyLimit, data.settings.currencySymbol)}
                            </button>
                        ) : (
                            <button 
                                onClick={() => { setTempGoal(''); setIsEditingGoal(true); }} 
                                className="btn btn--primary text-[10px] uppercase tracking-[0.15em] px-3 py-1.5"
                            >
                                Set Daily Goal
                            </button>
                        )
                    )}
                </div>
                
                {!isEditingGoal && (
                    <>
                        <div className="h-1.5 bg-main/10 rounded-full overflow-hidden border border-main/10">
                            {dailyLimit > 0 ? (
                                <div className={`h-full transition-all duration-700 ease-out shadow-sm ${
                                    isOverBudget ? 'bg-rose-500' : dailyProgress > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`} style={{ width: `${Math.min(dailyProgress, 100)}%` }} />
                            ) : (
                                <div className="h-full bg-muted/10 w-full" />
                            )}
                        </div>
                        {isOverBudget && <p className="text-[9px] text-rose-500 font-black uppercase tracking-[0.1em] mt-2 animate-in slide-in-from-top-1">Daily Limit Reached</p>}
                        {!isOverBudget && dailyProgress > 85 && <p className="text-[9px] text-amber-500 font-black uppercase tracking-[0.1em] mt-2 animate-in slide-in-from-top-1">Approaching Limit</p>}
                    </>
                )}
            </div>
        </div>
    );
};
