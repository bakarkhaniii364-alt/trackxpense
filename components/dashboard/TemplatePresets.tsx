import React from 'react';
import {
  Trash as Trash2
} from '@phosphor-icons/react';
import { AppData, TransactionType } from '../../types';

interface TemplatePresetsProps {
    data: AppData;
    onAddTransactionRequest: (type: TransactionType, quickData?: any) => void;
    onDeleteTemplate: (id: string) => void;
}

export const TemplatePresets: React.FC<TemplatePresetsProps> = ({ data, onAddTransactionRequest, onDeleteTemplate }) => {
    if (!data.templates || data.templates.length === 0) return null;
    const currency = data.settings.currencySymbol;

    return (
        <div className="rounded-[18px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 lg:p-6 transition-colors">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                    Saved Templates
                </span>
                <span className="text-[11px] font-medium text-[var(--text-muted)] font-mono">
                    {data.templates.length} presets
                </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
                {data.templates.map(tpl => (
                    <div key={tpl.id} className="group relative">
                        <button
                            onClick={() => onAddTransactionRequest(tpl.type, { amount: tpl.amount, category: tpl.category, note: tpl.name })}
                            className="w-full p-2.5 rounded-[8px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] hover:border-[var(--border-active)] text-left transition-colors cursor-pointer flex items-center justify-between"
                        >
                            <div className="min-w-0 pr-2">
                                <div className="text-[12px] font-medium text-[var(--text-primary)] truncate">{tpl.name}</div>
                                <div className="text-[10px] text-[var(--text-muted)] truncate">{tpl.category}</div>
                            </div>
                            <div className="text-[11px] font-mono font-medium text-[var(--text-primary)] shrink-0">
                                {currency} {tpl.amount}
                            </div>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteTemplate(tpl.id); }}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--status-error-bg)] text-[var(--status-error-fg)] border border-[var(--border-strong)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        >
                            <Trash2 size={10} strokeWidth={1.5} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
