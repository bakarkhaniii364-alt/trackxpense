import React from 'react';
import { AppData, Wallet, Transaction } from '../../types';

interface GoalSummaryProps {
    goalWallets: Wallet[];
    currentWallet?: Wallet;
    data: AppData;
    updateData: (d: Partial<AppData>) => void;
}

export const GoalSummary: React.FC<GoalSummaryProps> = ({ goalWallets, currentWallet, data, updateData }) => {
    if (goalWallets.length === 0 || currentWallet?.type === 'GOAL') return null;
    const currency = data.settings.currencySymbol;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                    Savings Vaults & Goals
                </span>
                <span className="text-[11px] font-medium text-[var(--text-secondary)] font-mono">
                    {goalWallets.length} active
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-5">
                {goalWallets.map((w: Wallet) => {
                    const wTx = data.transactions.filter((t: Transaction) => t.walletId === w.id);
                    const bal = wTx.reduce((acc: number, t: Transaction) => acc + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
                    const target = w.targetAmount || 1;
                    const prog = Math.min((bal / target) * 100, 100);
                    const isSelected = currentWallet?.id === w.id;

                    return (
                        <button
                            key={w.id}
                            onClick={() => updateData({ currentWalletId: w.id })}
                            className={`rounded-[8px] bg-[var(--bg-surface)] border ${isSelected ? 'border-[var(--accent-solid)]' : 'border-[var(--border-default)] hover:border-[var(--border-active)]'} p-4 sm:p-5 text-left transition-colors cursor-pointer flex flex-col justify-between`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)] block mb-0.5">
                                        Vault Target
                                    </span>
                                    <div className="text-base font-semibold text-[var(--text-primary)] truncate max-w-[160px]">
                                        {w.name}
                                    </div>
                                </div>
                                <div className="text-right font-mono">
                                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                                        {currency} {bal.toLocaleString()}
                                    </div>
                                    <div className="text-[11px] text-[var(--text-muted)]">
                                        of {currency} {target.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden mb-2">
                                    <div 
                                        className="h-full rounded-full bg-[var(--status-success-fg)] transition-all duration-700" 
                                        style={{ width: `${Math.max(2, prog)}%` }} 
                                    />
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-[var(--text-secondary)] font-normal">Progress</span>
                                    <span className="font-mono font-medium text-[var(--status-success-fg)]">{Math.round(prog)}%</span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
