import React, { useMemo } from 'react';
import { Sparkles, TrendingDown, Clock, Target } from 'lucide-react';
import { AppData } from '../../types';
import { PredictiveEngine } from '../../services/PredictiveEngine';

interface LocalAdvisorProps {
    data: AppData;
    formatMoney: (val: number, sym: string) => string;
}

export const LocalAdvisor: React.FC<LocalAdvisorProps> = ({ data, formatMoney }) => {
    const insights = useMemo(() => PredictiveEngine.getLocalAdvice(data), [data]);

    return (
        <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Smart Insights</span>
            </div>

            <div className="flex flex-col gap-2">
                {insights.map((insight, idx) => {
                    const isAlert = insight.includes('acceleration') || insight.includes('High frequency') || insight.includes('breach');
                    return (
                        <div key={idx} className={`p-3 rounded-md border flex gap-3 items-center group transition-all ${isAlert ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgb(var(--color-primary)/0.05)]' : 'bg-white/5 border-white/5'}`}>
                            <div className={`p-2 rounded-xl shrink-0 ${isAlert ? 'text-primary' : 'text-white/40'}`}>
                                {insight.includes('acceleration') ? <TrendingDown size={14} /> : 
                                 insight.includes('Late-night') ? <Clock size={14} /> : 
                                 insight.includes('frequency') ? <Target size={14} /> : <Sparkles size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-white/80 leading-tight group-hover:text-white transition-colors truncate">{insight}</p>
                                <div className="h-[1px] w-0 bg-primary/30 group-hover:w-full transition-all mt-1" />
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-auto pt-2 flex items-center justify-between opacity-30">
                <span className="text-[7px] font-black text-white uppercase tracking-widest">Status: Healthy</span>
                <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-primary" />
                    ))}
                </div>
            </div>
        </div>
    );
};
