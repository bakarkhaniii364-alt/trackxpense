import React, { useState } from 'react';
import {
  Check,
  X
} from '@phosphor-icons/react';
import { AppData } from '../../types';

interface DailyBudgetProps {
    dailySpent: number;
    dailyLimit: number;
    dailyProgress: number;
    isOverBudget: boolean;
    data: AppData;
    updateData: (d: Partial<AppData>) => void;
    formatMoney: (val: number, sym: string) => string;
}

export const DailyBudget: React.FC<DailyBudgetProps> = ({
    dailySpent,
    dailyLimit,
    dailyProgress,
    isOverBudget,
    data,
    updateData,
    formatMoney
}) => {
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [tempGoal, setTempGoal] = useState(dailyLimit ? dailyLimit.toString() : '');

    const saveGoal = () => {
        const val = parseFloat(tempGoal);
        if (!isNaN(val) && val >= 0) {
            updateData({ profile: { ...data.profile, dailyGoal: val } });
        }
        setIsEditingGoal(false);
    };

    const currency = data.settings.currencySymbol;
    const remaining = Math.max(0, dailyLimit - dailySpent);
    const isApproaching = !isOverBudget && dailyProgress > 80;

    return (
        <div className="rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-4 sm:p-5 flex flex-col justify-between transition-colors h-full">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)] truncate">
                        Daily Budget
                    </span>
                    {isEditingGoal ? (
                        <div className="flex items-center gap-1 animate-in fade-in">
                            <input
                                autoFocus
                                type="number"
                                className="w-16 bg-[var(--bg-subtle)] text-[var(--text-primary)] text-[11px] px-1.5 py-0.5 rounded-[4px] outline-none border border-[var(--border-active)] font-mono"
                                value={tempGoal}
                                onChange={e => setTempGoal(e.target.value)}
                                placeholder="Limit..."
                            />
                            <button 
                                onClick={saveGoal} 
                                className="p-0.5 rounded bg-[var(--status-success-bg)] text-[var(--status-success-fg)] hover:opacity-80"
                            >
                                <Check size={12} strokeWidth={1.5} />
                            </button>
                            <button 
                                onClick={() => setIsEditingGoal(false)} 
                                className="p-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)]"
                            >
                                <X size={12} strokeWidth={1.5} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setTempGoal(dailyLimit > 0 ? dailyLimit.toString() : ''); setIsEditingGoal(true); }}
                            className="text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                            {dailyLimit > 0 ? 'Edit' : '+ Set'}
                        </button>
                    )}
                </div>

                <div className="mb-2">
                    <div className="text-base sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] tracking-tight font-mono">
                        {formatMoney(dailySpent, currency)}
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-normal truncate">
                        {dailyLimit > 0 ? (
                            <span>of {formatMoney(dailyLimit, currency)} cap</span>
                        ) : (
                            <span>No daily limit set</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress Bar & Status */}
            <div>
                <div className="h-1.5 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden mb-2.5">
                    {dailyLimit > 0 ? (
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${
                                isOverBudget
                                    ? 'bg-[var(--status-error-fg)]'
                                    : isApproaching
                                        ? 'bg-[var(--status-warning-fg)]'
                                        : 'bg-[var(--status-success-fg)]'
                            }`}
                            style={{ width: `${Math.min(dailyProgress, 100)}%` }}
                        />
                    ) : (
                        <div className="h-full w-full bg-[var(--bg-subtle)]" />
                    )}
                </div>

                <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                            dailyLimit === 0 
                                ? 'bg-[var(--text-muted)]' 
                                : isOverBudget 
                                    ? 'bg-[var(--status-error-fg)]' 
                                    : isApproaching 
                                        ? 'bg-[var(--status-warning-fg)]' 
                                        : 'bg-[var(--status-success-fg)]'
                        }`} />
                        <span className="text-[var(--text-secondary)] font-normal">
                            {dailyLimit === 0 
                                ? 'Uncapped' 
                                : isOverBudget 
                                    ? 'Daily limit breached' 
                                    : isApproaching 
                                        ? 'Approaching limit' 
                                        : 'Within budget pace'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
