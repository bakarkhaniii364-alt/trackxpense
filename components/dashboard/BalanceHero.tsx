import React, { useRef } from 'react';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';
import { AppData, TransactionType, Wallet } from '../../types';
import { Haptics } from '../../services/haptics';

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
    className?: string;
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
    refreshing,
    className
}) => {
    const walletSymbol = currentWallet?.currency || data.settings.currencySymbol;
    const lastTapRef = useRef<number>(0);

    const togglePrivacy = () => {
        Haptics.light();
        updateData({ settings: { ...data.settings, privacyMode: !data.settings.privacyMode } });
    };

    const handleCardClick = (e: React.MouseEvent) => {
        const now = Date.now();
        if (now - lastTapRef.current < 350) {
            // Double click / double tap detected
            togglePrivacy();
            lastTapRef.current = 0;
        } else {
            lastTapRef.current = now;
        }
    };

    return (
        <div 
            onClick={handleCardClick}
            onDoubleClick={togglePrivacy} 
            className={`relative w-full h-full min-h-[175px] sm:min-h-[200px] p-4 sm:p-5 lg:p-6 rounded-[14px] sm:rounded-[18px] bg-gradient-to-br from-[#24252a] via-[#16171a] to-[#0f1012] border-t border-l border-white/20 border-b border-r border-black/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.6),0_12px_32px_rgba(0,0,0,0.6)] transition-all select-none cursor-pointer group flex flex-col justify-between overflow-hidden text-[var(--text-primary)] active:scale-[0.995] ${className || ''}`}
        >
            {/* Metallic Sheen Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.01)_45%,rgba(0,0,0,0.4)_100%)] pointer-events-none z-0" />
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-gradient-to-br from-white/10 to-transparent blur-2xl rounded-full pointer-events-none z-0" />

            {/* Top Row */}
            <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    {/* Metallic Golden Chip */}
                    <div className="w-8 h-6 rounded-[4px] bg-gradient-to-br from-[#d4af37] via-[#aa8c2c] to-[#665319] border border-[#ffd700]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_1px_3px_rgba(0,0,0,0.5)] flex items-center justify-center relative overflow-hidden shrink-0">
                        <div className="absolute inset-[2px] border border-black/30 rounded-[2px]" />
                        <div className="w-full h-[1px] bg-black/40" />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--status-success-fg)] shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                        <span className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] tracking-[0.08em]">
                            {currentWallet?.type === 'GOAL' ? 'Savings Goal' : 'Total Balance'}
                        </span>
                    </div>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); updateData({ settings: { ...data.settings, privacyMode: !data.settings.privacyMode } }) }} 
                    className="w-7 h-7 rounded-[6px] bg-[#1a1b20] border border-white/15 hover:border-white/30 hover:bg-[#22232a] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                    {data.settings.privacyMode ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
            </div>

            {/* Center Balance Readout */}
            <div className="my-auto relative z-10">
                <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {!data.settings.privacyMode ? formatMoney(balance, walletSymbol) : '•••• ••••'}
                </h1>
            </div>

            {/* Bottom Stats */}
            {currentWallet?.type !== 'GOAL' ? (
                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[12px] relative z-10">
                    <div className="flex items-center gap-4">
                        <div 
                            onClick={(e) => { e.stopPropagation(); onAddTransactionRequest(TransactionType.INCOME); }}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <span className="text-[10px] text-[var(--text-muted)] uppercase font-medium block tracking-wider">Income</span>
                            <span className="text-[13px] font-semibold text-[var(--status-success-fg)] drop-shadow-xs">
                                {!data.settings.privacyMode ? formatMoney(totalIncome, walletSymbol) : '•••'}
                            </span>
                        </div>
                        <div 
                            onClick={(e) => { e.stopPropagation(); onAddTransactionRequest(TransactionType.EXPENSE); }}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <span className="text-[10px] text-[var(--text-muted)] uppercase font-medium block tracking-wider">Expense</span>
                            <span className="text-[13px] font-semibold text-[var(--status-error-fg)] drop-shadow-xs">
                                {!data.settings.privacyMode ? formatMoney(totalExpense, walletSymbol) : '•••'}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-medium block tracking-wider">Available</span>
                        <span className="text-[12px] font-semibold text-white/90">
                            {formatMoney(adjustedBalance, walletSymbol)}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="pt-3 border-t border-white/10 relative z-10">
                    <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-2 font-medium">
                        <span>{Math.round(goalProgress)}% Saved</span>
                        <span>Target: {formatMoney(currentWallet.targetAmount || 0, walletSymbol)}</span>
                    </div>
                    <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/10 p-0.5">
                        <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.5)] transition-all duration-700" 
                            style={{ width: `${Math.min(100, goalProgress)}%` }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
