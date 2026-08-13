import React from 'react';
import { Transaction, TransactionType, AppData } from '../../types';
import { EmptyStateSeeder } from '../shared/EmptyStateSeeder';
import { CategoryIcon } from '../shared/CategoryIcon';

interface RecentLedgerProps {
    walletTransactions: Transaction[];
    data: AppData;
    updateData?: (d: Partial<AppData>) => void;
    setView: (v: any) => void;
    onEditTransaction: (t: Transaction) => void;
    formatMoney: (val: number, sym: string) => string;
}

export const RecentLedger: React.FC<RecentLedgerProps> = ({
    walletTransactions,
    data,
    updateData,
    setView,
    onEditTransaction,
    formatMoney
}) => {
    const currency = data.settings.currencySymbol;

    return (
        <div className="rounded-[18px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 lg:p-6 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)] block mb-0.5">
                        Audit Log
                    </span>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                        Recent Transactions
                    </h3>
                </div>
                <button
                    onClick={() => setView('history')}
                    className="text-[11px] font-medium text-[var(--text-primary)] hover:text-white bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] px-3 py-1.5 rounded-[6px] transition-colors cursor-pointer"
                >
                    View All History
                </button>
            </div>

            {walletTransactions.length === 0 ? (
                <EmptyStateSeeder
                    data={data}
                    updateData={updateData || (() => {})}
                    compact
                    title="No Recent Transactions"
                    description="You have no recorded activity in this wallet. Load 1-click sample data to test metrics and charts."
                />
            ) : (
                <div className="divide-y divide-[var(--border-default)]">
                    {walletTransactions.slice(0, 6).map((t: Transaction) => (
                        <div
                            key={t.id}
                            onClick={() => onEditTransaction(t)}
                            className="py-3 px-2 flex items-center justify-between hover:bg-[var(--bg-surface-hover)] -mx-2 px-3 rounded-[8px] transition-colors cursor-pointer group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <CategoryIcon category={t.category} size={16} strokeWidth={1.5} />
                                <div className="min-w-0">
                                    <p className="text-[13px] font-medium text-[var(--text-primary)] leading-tight truncate">
                                        {t.note || t.category}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] font-mono text-[var(--text-muted)]">
                                            {new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="text-[10px] text-[var(--text-muted)]">•</span>
                                        <span className="text-[11px] text-[var(--text-secondary)]">
                                            {t.category}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="text-right shrink-0 ml-4">
                                <span className={`text-[13px] font-mono font-medium ${
                                    t.type === TransactionType.INCOME
                                        ? 'text-[var(--status-success-fg)]'
                                        : 'text-[var(--text-primary)]'
                                }`}>
                                    {t.type === TransactionType.INCOME ? '+' : '-'}{formatMoney(t.amount, currency)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
