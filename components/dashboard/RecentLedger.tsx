import React from 'react';
import { Transaction, TransactionType, CategoryItem, AppData } from '../../types';
import { CategoryIcon } from '../shared/CategoryIcon';

interface RecentLedgerProps {
    walletTransactions: Transaction[];
    data: AppData;
    setView: (v: any) => void;
    onEditTransaction: (t: Transaction) => void;
    formatMoney: (val: number, sym: string) => string;
}

export const RecentLedger: React.FC<RecentLedgerProps> = ({
    walletTransactions,
    data,
    setView,
    onEditTransaction,
    formatMoney
}) => {
    return (
        <div className="bento-grid gap-y-3 lg:gap-y-4 pb-8">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-base lg:text-xl font-bold text-main tracking-tight">Recent Transactions</h2>
                <button onClick={() => setView('history')} className="text-[9px] text-primary font-black uppercase tracking-[0.2em] active:opacity-70 px-3 py-1.5 lg:px-4 lg:py-2 bg-primary/10 border border-primary/20 rounded-lg lg:rounded-xl hover:bg-primary/20 transition-colors">View All</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                {walletTransactions.slice(0, 6).map((t: Transaction) => {
                    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
                    return (
                        <div key={t.id} onClick={() => onEditTransaction(t)} className="glass-card bento-card p-3 lg:p-4 flex-row items-center justify-between active:scale-[0.99] transition-all cursor-pointer hover:border-white/20 group">
                            <div className="flex items-center gap-3 lg:gap-4">
                                <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-lg lg:rounded-xl bg-black/20 flex items-center justify-center border border-white/5 text-muted group-hover:scale-105 transition-transform shrink-0">
                                    <CategoryIcon category={t.category} size={isMobile ? 16 : 20} color={data.categories.find((c: CategoryItem) => c.name === t.category)?.color} />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-main text-[11px] leading-tight tracking-tight truncate">{t.note || t.category}</p>
                                    <p className="text-[9px] font-black text-muted/40 uppercase tracking-widest mt-1">{new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="text-right ml-2 shrink-0">
                                <p className={`font-bold text-sm tracking-tight ${t.type === TransactionType.INCOME ? 'text-emerald-400' : 'text-main'}`}>
                                {t.type === TransactionType.INCOME ? '+' : ''}{formatMoney(t.amount, data.settings.currencySymbol)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
