
import React, { useState } from 'react';
import { ArrowRight, CheckCircle, WifiOff, ShieldCheck } from 'lucide-react';

interface OnboardingProps {
    isOpen: boolean;
    onComplete: (name: string, balance: number, dailyGoal: number) => void;
}

export const OnboardingModal: React.FC<OnboardingProps> = ({ isOpen, onComplete }) => {
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [balance, setBalance] = useState('');
    const [dailyGoal, setDailyGoal] = useState('');

    if (!isOpen) return null;

    const handleNext = () => {
        if (step < 2) setStep(step + 1);
        else {
            onComplete(name || 'User', parseFloat(balance) || 0, parseFloat(dailyGoal) || 0);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center p-6">
             <div className="bg-noise" />
             
             <div className="w-full max-w-sm relative liquid-glass p-8 rounded-[32px] shadow-2xl">
                {/* Progress Bar */}
                <div className="flex gap-2 mb-8">
                    {[0, 1, 2].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= step ? 'bg-primary' : 'bg-surface'}`} />
                    ))}
                </div>

                <div className="min-h-[300px]">
                    {step === 0 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
                            <div className="w-16 h-16 bg-primary/20 rounded-2xl mx-auto flex items-center justify-center mb-6 text-primary border border-primary/20 shadow-glow">
                                <ShieldCheck size={32} />
                            </div>
                            <h1 className="text-2xl font-bold text-main mb-2">Welcome</h1>
                            <p className="text-muted text-[11px] mb-8 leading-relaxed font-bold uppercase tracking-tight">
                                Offline First: Your data is stored safely on your device.
                            </p>
                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                                <WifiOff size={12} />
                                <span>Works Offline</span>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                            <h2 className="text-xl font-bold text-main mb-6 tracking-tight">Your Profile</h2>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] ml-1">Your Name</label>
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="Enter your name..."
                                        className="w-full bg-black/20 text-sm px-4 py-3.5 rounded-xl outline-none border border-white/5 focus:border-primary/40 text-main placeholder:text-muted/10 transition-all font-bold"
                                        autoFocus
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                            <h2 className="text-xl font-bold text-main mb-6 tracking-tight">Initial Setup</h2>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] ml-1">Current Balance</label>
                                    <input 
                                        type="number" 
                                        value={balance}
                                        onChange={e => setBalance(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-black/20 text-xl px-4 py-3.5 rounded-xl outline-none border border-white/5 focus:border-primary/40 text-main placeholder:text-muted/10 transition-all font-bold"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-muted uppercase tracking-[0.2em] ml-1">Daily Spending Limit</label>
                                    <input 
                                        type="number" 
                                        value={dailyGoal}
                                        onChange={e => setDailyGoal(e.target.value)}
                                        placeholder="Enter daily limit..."
                                        className="w-full bg-black/20 text-sm px-4 py-3.5 rounded-xl outline-none border border-white/5 focus:border-primary/40 text-main placeholder:text-muted/10 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <button 
                    onClick={handleNext}
                    className="btn btn--primary w-full justify-center text-[10px] uppercase tracking-[0.2em] mt-8"
                >
                    {step === 2 ? 'Get Started' : 'Continue'}
                    {step === 2 ? <CheckCircle size={14} /> : <ArrowRight size={14} />}
                </button>
             </div>
        </div>
    );
};
