import React from 'react';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';
import { AppData, TransactionType, Wallet } from '../../types';

interface BalanceHeroProps {
    balance: number;
    adjustedBalance: number;
    totalIncome: number;
    totalExpense: number;
    goalProgress: number;
    currentWallet?: Wallet;
    data: AppData;
    updateData: (d: Partial<AppData>) => void;
    formatMoney: (val: number, sym: string) => string;
    onAddTransactionRequest: (type: TransactionType) => void;
    refreshing: boolean;
}

export const BalanceHero: React.FC<BalanceHeroProps> = ({
    balance,
    adjustedBalance,
    totalIncome,
    totalExpense,
    goalProgress,
    currentWallet,
    data,
    updateData,
    formatMoney,
    onAddTransactionRequest,
    refreshing
}) => {
    const walletSymbol = currentWallet?.currency || data.settings.currencySymbol;

    const handleDoubleTap = (e: React.MouseEvent) => {
        if (e.detail === 2) {
            updateData({ settings: { ...data.settings, privacyMode: !data.settings.privacyMode } });
        }
    };

    return (
        <div onDoubleClick={() => updateData({ settings: { ...data.settings, privacyMode: !data.settings.privacyMode } })} className="relative p-5 lg:p-8 rounded-3xl lg:rounded-[40px] select-none cursor-pointer group z-10 transition-all active:scale-[0.99] shadow-2xl shadow-[0_20px_50px_rgb(var(--color-primary)/0.15)] liquid-glass border border-main/10 flex flex-col gap-4 lg:gap-6 overflow-hidden min-h-[170px] lg:min-h-[220px]">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-30 pointer-events-none" />
            <div className={`absolute -top-32 -right-32 w-80 h-80 bg-primary/20 blur-[100px] rounded-full group-active:scale-110 transition-transform duration-700 ${refreshing ? 'scale-125 opacity-40 animate-pulse' : 'opacity-20'}`} />
            
            <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        <p className="text-[10px] text-muted font-black uppercase tracking-[0.4em]">
                            {currentWallet?.type === 'GOAL' ? 'Savings Goal' : 'Total Balance'}
                        </p>
                    </div>
                    <h1 className="text-3xl lg:text-5xl font-black text-main tracking-tighter leading-none">
                        {!data.settings.privacyMode ? formatMoney(balance, walletSymbol) : '•••• ••••'}
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); updateData({ settings: { ...data.settings, privacyMode: !data.settings.privacyMode } }) }} className="text-main/40 hover:text-main transition-all p-2 lg:p-3 bg-main/5 hover:bg-main/10 rounded-xl border border-main/10 active:scale-90 shadow-lg">
                        {data.settings.privacyMode ? <Eye size={18}/> : <EyeOff size={18}/>}
                    </button>
                </div>
            </div>

            {currentWallet?.type !== 'GOAL' ? (
                <div className="flex items-center justify-between relative z-10 pt-3 lg:pt-4 border-t border-main/10 mt-auto">
                    <div className="flex items-center gap-6 lg:gap-10">
                        <div 
                            onClick={(e) => { e.stopPropagation(); onAddTransactionRequest(TransactionType.INCOME); }}
                            className="group/stat cursor-pointer active:opacity-60 transition-all"
                        >
                            <p className="text-[9px] font-black text-emerald-500/70 uppercase tracking-[0.3em] mb-1 group-hover/stat:text-emerald-400 transition-colors flex items-center gap-1">
                                <TrendingUp size={10} /> Income
                            </p>
                            <p className="text-base lg:text-lg font-black text-emerald-500 tracking-tight">
                                {!data.settings.privacyMode ? formatMoney(totalIncome, walletSymbol) : '•••'}
                            </p>
                        </div>
                        <div 
                            onClick={(e) => { e.stopPropagation(); onAddTransactionRequest(TransactionType.EXPENSE); }}
                            className="group/stat cursor-pointer active:opacity-60 transition-all"
                        >
                            <div className="text-[9px] font-black text-rose-500/70 uppercase tracking-[0.3em] mb-1 group-hover/stat:text-rose-400 transition-colors flex items-center gap-1">
                                <div className="rotate-180"><TrendingUp size={10} /></div> Expenses
                            </div>
                            <p className="text-base lg:text-lg font-black text-rose-500 tracking-tight">
                                {!data.settings.privacyMode ? formatMoney(totalExpense, walletSymbol) : '•••'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-muted uppercase tracking-[0.3em] mb-1">Available Balance</p>
                        <p className={`text-xs lg:text-sm font-black text-main/60 transition-all ${(!data.settings.privacyMode && data.provisions.length > 0) ? 'opacity-100 blur-0' : 'opacity-20 blur-[1px]'}`}>
                            {formatMoney(adjustedBalance, walletSymbol)}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="mt-auto relative z-10 pt-4">
                    <div className="flex justify-between text-[9px] text-muted mb-3 font-black uppercase tracking-[0.3em]">
                        <span className="flex items-center gap-2">
                            <div className="h-1 w-1 rounded-full bg-emerald-500" />
                            {Math.round(goalProgress)}% Saved
                        </span>
                        <span>Target: {formatMoney(currentWallet.targetAmount || 0, walletSymbol)}</span>
                    </div>
                    <div className="h-3 bg-main/10 rounded-full overflow-hidden border border-main/10 p-0.5">
                        <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all duration-1000 ease-out" style={{ width: `${goalProgress}%` }} />
                    </div>
                </div>
            )}
        </div>
    );
};
