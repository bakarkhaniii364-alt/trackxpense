import React from 'react';
import { Target } from 'lucide-react';
import { AppData, Wallet, Transaction } from '../../types';

interface GoalSummaryProps {
    goalWallets: Wallet[];
    currentWallet?: Wallet;
    data: AppData;
    updateData: (d: Partial<AppData>) => void;
}

export const GoalSummary: React.FC<GoalSummaryProps> = ({ goalWallets, currentWallet, data, updateData }) => {
    if (goalWallets.length === 0 || currentWallet?.type === 'GOAL') return null;

    return (
        <div className="bento-grid gap-y-3">
            <div className="flex justify-between items-end px-1">
                <h3 className="text-[9px] font-black text-muted/40 uppercase tracking-[0.2em]">Savings Goals</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {goalWallets.map((w: Wallet) => {
                    const wTx = data.transactions.filter((t: Transaction) => t.walletId === w.id);
                    const bal = wTx.reduce((acc: number, t: Transaction) => acc + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
                    const prog = Math.min((bal / (w.targetAmount || 1)) * 100, 100);
                    return (
                        <button key={w.id} onClick={() => updateData({ currentWalletId: w.id })} className="glass-card bento-card p-5 text-left hover:border-primary/50 transition-all active:scale-[0.98] group">
                            <Target size={18} className="text-primary mb-3 group-hover:scale-110 transition-transform"/>
                            <p className="font-bold text-main text-xs truncate tracking-tight">{w.name}</p>
                            <div className="w-full h-1.5 bg-black/20 rounded-full mt-auto overflow-hidden border border-white/5">
                                <div className="h-full bg-primary shadow-[0_0_10px_rgb(var(--color-primary)/0.3)]" style={{ width: `${prog}%` }} />
                            </div>
                            <p className="text-[8px] text-muted font-black mt-2 text-right uppercase tracking-widest">{Math.round(prog)}%</p>
                        </button>
                    )
                })}
            </div>
        </div>
    );
};
