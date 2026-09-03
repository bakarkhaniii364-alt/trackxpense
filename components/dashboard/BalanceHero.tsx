import React, { useRef } from 'react';
import {
  Eye,
  EyeSlash as EyeOff
} from '@phosphor-icons/react';
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
            className={`w-full h-full min-h-[175px] sm:min-h-[190px] p-5 lg:p-6 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] transition-colors select-none cursor-pointer flex flex-col justify-between overflow-hidden text-[var(--text-primary)] ${className || ''}`}
        >
            {/* Top Row: Eyebrow + Live Dot + Privacy Toggle */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--status-success-fg)]" />
                    <span className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em]">
                        {currentWallet?.type === 'GOAL' ? 'Savings Goal' : 'Total Balance'}
                    </span>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); updateData({ settings: { ...data.settings, privacyMode: !data.settings.privacyMode } }) }} 
                    className="w-7 h-7 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                    title={data.settings.privacyMode ? "Show balance" : "Hide balance"}
                >
                    {data.settings.privacyMode ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
            </div>

            {/* Center: Big Metric Readout (28-32px per Lumen specification) */}
            <div className="my-auto py-2">
                <h1 className="text-[30px] font-bold text-[var(--text-primary)] tracking-tight font-mono">
                    {!data.settings.privacyMode ? formatMoney(balance, walletSymbol) : '•••• ••••'}
                </h1>
            </div>

            {/* Bottom: Key-Value Sub-Readouts separated by a 1px hairline */}
            {currentWallet?.type !== 'GOAL' ? (
                <div className="pt-3 border-t border-[var(--border-default)] flex items-center justify-between text-[12px]">
                    <div className="flex items-center gap-5">
                        <div 
                            onClick={(e) => { e.stopPropagation(); onAddTransactionRequest(TransactionType.INCOME); }}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <span className="text-[10px] text-[var(--text-muted)] uppercase font-medium block tracking-[0.05em]">Income</span>
                            <span className="text-[13px] font-medium text-[var(--status-success-fg)] font-mono">
                                {!data.settings.privacyMode ? formatMoney(totalIncome, walletSymbol) : '•••'}
                            </span>
                        </div>
                        <div 
                            onClick={(e) => { e.stopPropagation(); onAddTransactionRequest(TransactionType.EXPENSE); }}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <span className="text-[10px] text-[var(--text-muted)] uppercase font-medium block tracking-[0.05em]">Expense</span>
                            <span className="text-[13px] font-medium text-[var(--status-error-fg)] font-mono">
                                {!data.settings.privacyMode ? formatMoney(totalExpense, walletSymbol) : '•••'}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-[var(--text-muted)] uppercase font-medium block tracking-[0.05em]">Available</span>
                        <span className="text-[13px] font-medium text-[var(--text-primary)] font-mono">
                            {formatMoney(adjustedBalance, walletSymbol)}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="pt-3 border-t border-[var(--border-default)]">
                    <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-2 font-medium">
                        <span>{Math.round(goalProgress)}% Saved</span>
                        <span className="font-mono">Target: {formatMoney(currentWallet.targetAmount || 0, walletSymbol)}</span>
                    </div>
                    <div className="h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden border border-[var(--border-default)]">
                        <div 
                            className="h-full bg-[var(--accent-solid)] rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, goalProgress)}%` }} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
