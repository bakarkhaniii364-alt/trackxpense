import React from 'react';
import { TransactionType, AppData } from '../../types';

interface QuickActionsProps {
    quickActions: string[];
    data: AppData;
    onAddTransactionRequest: (type: TransactionType, quickData?: any) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ quickActions, data, onAddTransactionRequest }) => {
    if (quickActions.length === 0) return null;

    return (
        <div className="rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 sm:p-5 transition-colors">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                    Quick Log
                </span>
                <span className="text-[11px] font-medium text-[var(--text-muted)]">
                    1-Tap Entry
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {quickActions.map((category, idx) => (
                    <button
                        key={idx}
                        onClick={() => onAddTransactionRequest(TransactionType.EXPENSE, { category })}
                        className="py-2.5 px-3 rounded-[8px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] hover:border-[var(--border-active)] text-left transition-colors cursor-pointer group flex items-center justify-between"
                    >
                        <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                            {category}
                        </span>
                        <span className="text-[11px] text-[var(--text-muted)] group-hover:text-[var(--text-primary)] font-mono">
                            +
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
};
