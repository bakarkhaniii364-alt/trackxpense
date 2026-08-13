import React, { useMemo, useState } from 'react';
import { Sparkles, TrendingDown, Clock, Target, Zap } from 'lucide-react';
import { AppData } from '../../types';
import { PredictiveEngine } from '../../services/PredictiveEngine';
import { generateAIAdvice } from '../../services/aiService';

interface LocalAdvisorProps {
    data: AppData;
    formatMoney: (val: number, sym: string) => string;
}

export const LocalAdvisor: React.FC<LocalAdvisorProps> = ({ data, formatMoney }) => {
    const defaultInsights = useMemo(() => PredictiveEngine.getLocalAdvice(data), [data]);
    const [aiTips, setAiTips] = useState<string[] | null>(null);
    const [isLoadingAi, setIsLoadingAi] = useState(false);

    const handleAskGroqAI = async () => {
        setIsLoadingAi(true);
        const tips = await generateAIAdvice(data, data.settings.groqApiKey);
        if (tips && tips.length > 0) {
            setAiTips(tips);
        }
        setIsLoadingAi(false);
    };

    const currentInsights = aiTips || defaultInsights;

    return (
        <div className="flex flex-col gap-3 h-full">
            <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Smart Insights</span>
                <button
                    onClick={handleAskGroqAI}
                    disabled={isLoadingAi}
                    className="flex items-center gap-1 text-[9px] font-medium text-amber-400 hover:text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 transition-all disabled:opacity-50"
                >
                    <Zap size={10} />
                    <span>{isLoadingAi ? 'Consulting Groq...' : 'Ask Groq AI'}</span>
                </button>
            </div>

            <div className="flex flex-col gap-2">
                {currentInsights.map((insight, idx) => {
                    const isAlert = insight.includes('acceleration') || insight.includes('High frequency') || insight.includes('breach');
                    return (
                        <div key={idx} className={`p-3 rounded-md border flex gap-3 items-center group transition-all ${isAlert ? 'bg-primary/5 border-primary/20 shadow-[0_0_15px_rgb(var(--color-primary)/0.05)]' : 'bg-white/5 border-white/5'}`}>
                            <div className={`p-2 rounded-xl shrink-0 ${isAlert ? 'text-primary' : 'text-amber-400/80'}`}>
                                {aiTips ? <Zap size={14} /> : 
                                 insight.includes('acceleration') ? <TrendingDown size={14} /> : 
                                 insight.includes('Late-night') ? <Clock size={14} /> : 
                                 insight.includes('frequency') ? <Target size={14} /> : <Sparkles size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-black text-white/80 leading-tight group-hover:text-white transition-colors truncate">{insight}</p>
                                <div className="h-[1px] w-0 bg-amber-400/30 group-hover:w-full transition-all mt-1" />
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div className="mt-auto pt-2 flex items-center justify-between opacity-50 text-[8px] font-mono text-muted">
                <span>{aiTips ? 'Groq Llama 3.1 8B Active' : 'Status: Healthy'}</span>
                <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="w-1 h-1 rounded-full bg-amber-400/70" />
                    ))}
                </div>
            </div>
        </div>
    );
};
