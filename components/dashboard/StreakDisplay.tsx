import React from 'react';
import { Flame, Zap } from 'lucide-react';
import { AppData, Streak } from '../../types';

interface StreakDisplayProps {
    data: AppData;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({ data }) => {
    const streaks = Object.entries(data.streaks || {});
    
    if (streaks.length === 0) {
        return (
            <div className="glass-card bento-card flex flex-col items-center justify-center text-center p-[var(--bento-padding)] min-h-[120px]">
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-main/5 border border-main/10 flex items-center justify-center text-muted mb-3">
                    <Zap size={16} className="lg:size-[18px]" />
                </div>
                <h3 className="text-[11px] font-black text-main uppercase tracking-[0.2em]">No Streaks Yet</h3>
                <p className="text-[9px] text-muted font-bold mt-1 max-w-[180px]">Maintain budget limits to build category streaks.</p>
            </div>
        );
    }

    return (
        <div className="glass-card bento-card flex flex-col gap-3 h-full">
            <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-muted/40 uppercase tracking-[0.2em]">Active Streaks</span>
            </div>
            
            <div className="flex flex-col gap-2 overflow-y-auto no-scrollbar max-h-[220px]">
                {(streaks as [string, Streak][]).map(([name, streak]) => (
                    <div key={name} className="flex items-center justify-between p-2 lg:p-2.5 bg-main/5 border border-main/10 rounded-md group hover:border-orange-500/40 transition-all active:scale-[0.98]">
                        <div className="flex items-center gap-2 lg:gap-2.5">
                            <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-md flex items-center justify-center transition-all ${streak.current > 0 ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-main/5 text-muted/40'}`}>
                                <Flame size={14} className={`lg:size-[16px] ${streak.current > 0 ? 'animate-pulse' : ''}`} />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-main tracking-tight uppercase">{name}</span>
                                <div className="flex gap-0.5 mt-1">
                                    {[...Array(7)].map((_, i) => (
                                        <div key={i} className={`h-0.5 w-2 lg:w-2.5 rounded-full transition-all duration-700 ${i < streak.current ? 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.5)]' : 'bg-main/15'}`} />
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-base lg:text-lg font-black text-main leading-none tracking-tighter">{streak.current}</span>
                            <p className="text-[6px] font-black text-muted uppercase tracking-[0.2em]">Days</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-auto pt-2 flex items-center justify-between border-t border-main/10">
                <span className="text-[7px] font-black text-muted uppercase tracking-widest">Consistency Score</span>
                <span className="text-[10px] font-black text-orange-500">88%</span>
            </div>
        </div>
    );
};
