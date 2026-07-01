import React from 'react';
import { Zap, Flame } from 'lucide-react';
import { AppData } from '../../types';
import { StreakDisplay } from './StreakDisplay';
import { LocalAdvisor } from './LocalAdvisor';

interface IntelligenceRunwayProps {
    data: AppData;
    formatMoney: (val: number, sym: string) => string;
}

export const IntelligenceRunway: React.FC<IntelligenceRunwayProps> = ({ data, formatMoney }) => {
    return (
        <div className="flex flex-col gap-3 h-full animate-in fade-in slide-in-from-right-4 duration-1000 relative">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <h3 className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Insights & Streaks</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
                {/* Insights Column */}
                <div className="glass-card bento-card p-4 flex flex-col gap-4 overflow-hidden relative group h-full">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-30 transition-opacity">
                        <Zap size={32} className="text-primary" />
                    </div>
                    <LocalAdvisor data={data} formatMoney={formatMoney} />
                </div>

                {/* Streaks Column */}
                <div className="glass-card bento-card p-4 flex flex-col gap-4 overflow-hidden relative group h-full">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-30 transition-opacity">
                        <Flame size={32} className="text-orange-500" />
                    </div>
                    <StreakDisplay data={data} />
                </div>
            </div>


        </div>
    );
};
