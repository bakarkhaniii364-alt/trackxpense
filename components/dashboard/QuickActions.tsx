import React from 'react';
import { TransactionType, AppData } from '../../types';
import { CategoryIcon } from '../shared/CategoryIcon';

interface QuickActionsProps {
    quickActions: string[];
    data: AppData;
    onAddTransactionRequest: (type: TransactionType, quickData?: any) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ quickActions, data, onAddTransactionRequest }) => {
    if (quickActions.length === 0) return null;

    return (
        <div className="glass-card bento-card">
            <h3 className="text-[9px] font-black text-muted/40 uppercase tracking-[0.2em] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-4 gap-3">
                {quickActions.map((category, idx) => (
                    <button 
                        key={idx}
                        onClick={() => onAddTransactionRequest(TransactionType.EXPENSE, { category })}
                        className="flex flex-col items-center justify-center gap-2 transition-all active:scale-90 group"
                    >
                        <div className="w-12 h-12 bg-black/20 rounded-sm flex items-center justify-center text-muted/60 border border-white/5 group-hover:scale-110 group-hover:border-primary/40 transition-all">
                            <CategoryIcon category={category} color={data.categories.find(c => c.name === category)?.color} />
                        </div>
                        <span className="text-[9px] font-bold text-main truncate max-w-full tracking-tight">{category}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
