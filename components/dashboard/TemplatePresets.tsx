import React from 'react';
import { Trash2, Zap } from 'lucide-react';
import { AppData, TransactionType } from '../../types';
import { CategoryIcon } from '../shared/CategoryIcon';

interface TemplatePresetsProps {
    data: AppData;
    onAddTransactionRequest: (type: TransactionType, quickData?: any) => void;
    onDeleteTemplate: (id: string) => void;
}

export const TemplatePresets: React.FC<TemplatePresetsProps> = ({ data, onAddTransactionRequest, onDeleteTemplate }) => {
    if (!data.templates || data.templates.length === 0) return null;

    return (
        <div className="glass-card p-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-main">Templates</h3>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                {data.templates.map(tpl => (
                    <div key={tpl.id} className="group relative">
                        <button 
                            onClick={() => onAddTransactionRequest(tpl.type, { amount: tpl.amount, category: tpl.category, note: tpl.name })}
                            className="w-full flex items-center gap-3 p-3 bg-black/20 hover:bg-primary/10 border border-white/5 hover:border-primary/40 rounded-md transition-all active:scale-[0.98] text-left"
                        >
                            <div className="w-8 h-8 rounded-sm bg-black/40 flex items-center justify-center shrink-0">
                                <CategoryIcon category={tpl.category} size={16} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-bold text-main truncate">{tpl.name}</span>
                                <span className="text-[8px] font-black text-muted/60 uppercase tracking-widest">
                                    {data.settings.currencySymbol} {tpl.amount}
                                </span>
                            </div>
                            <Zap size={10} className="text-primary ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteTemplate(tpl.id); }}
                            className="absolute -top-1 -right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                            <Trash2 size={8} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};
