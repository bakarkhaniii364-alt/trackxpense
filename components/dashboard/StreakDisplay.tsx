import React from 'react';
import { AppData, Streak } from '../../types';

interface StreakDisplayProps {
    data: AppData;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ data }) => {
    const streaks = Object.entries(data.streaks || {});
    const totalActiveDays = (streaks as [string, Streak][]).reduce((sum, [, s]) => sum + (s.current || 0), 0);
    const maxStreak = Math.max(0, ...(streaks as [string, Streak][]).map(([, s]) => s.current || 0));

    // Consistency score calculation
    const totalCategories = Math.max(1, streaks.length);
    const maintainedCategories = (streaks as [string, Streak][]).filter(([, s]) => (s.current || 0) > 0).length;
    const consistencyScore = streaks.length > 0 ? Math.round((maintainedCategories / totalCategories) * 100) : 100;

    return (
        <div className="rounded-[12px] sm:rounded-[18px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-3.5 sm:p-5 lg:p-6 flex flex-col justify-between transition-colors h-full">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)] truncate">
                        Consistency
                    </span>
                    <span className="text-[10px] font-medium text-[var(--text-muted)] font-mono">
                        {consistencyScore}%
                    </span>
                </div>

                <div className="mb-2">
                    <div className="text-base sm:text-xl lg:text-2xl font-semibold text-[var(--text-primary)] tracking-tight font-mono">
                        {maxStreak} <span className="text-[11px] font-normal text-[var(--text-secondary)]">Days</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                        {streaks.length > 0 ? `${maintainedCategories} within cap` : 'Zero active breaches'}
                    </p>
                </div>

                {/* Categories Streak List */}
                {streaks.length > 0 ? (
                    <div className="space-y-2.5 max-h-[140px] overflow-y-auto no-scrollbar pr-1">
                        {(streaks as [string, Streak][]).slice(0, 3).map(([name, streak]) => (
                            <div key={name} className="flex items-center justify-between py-1 border-b border-[var(--border-default)] last:border-none">
                                <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${streak.current > 0 ? 'bg-[var(--status-success-fg)]' : 'bg-[var(--text-muted)]'}`} />
                                    <span className="text-[12px] font-medium text-[var(--text-primary)] truncate max-w-[120px]">{name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                        {[...Array(5)].map((_, i) => (
                                            <div 
                                                key={i} 
                                                className={`h-1 w-2 rounded-full ${i < streak.current ? 'bg-[var(--accent-solid)]' : 'bg-[var(--bg-subtle)]'}`} 
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[11px] font-mono text-[var(--text-secondary)] w-7 text-right">
                                        {streak.current}d
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-3 text-[12px] text-[var(--text-muted)]">
                        No active category breaches recorded.
                    </div>
                )}
            </div>

            <div className="pt-3 mt-3 border-t border-[var(--border-default)] flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                <span className="font-normal">Discipline Score</span>
                <span className="font-medium text-[var(--text-primary)] font-mono">{totalActiveDays} Total Points</span>
            </div>
        </div>
    );
};
