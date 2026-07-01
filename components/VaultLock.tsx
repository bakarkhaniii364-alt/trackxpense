import React, { useState } from 'react';
import { Lock, Delete } from 'lucide-react';
import { Haptics } from '../services/haptics';

interface VaultLockProps {
    onUnlock: () => void;
    correctPasscode: string;
}

export const VaultLock: React.FC<VaultLockProps> = ({ onUnlock, correctPasscode }) => {
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState(false);

    const handleKeypad = (num: string) => {
        if (passcode.length < 4) {
            const newCode = passcode + num;
            setPasscode(newCode);
            Haptics.light();

            if (newCode.length === 4) {
                if (newCode === correctPasscode) {
                    Haptics.success();
                    onUnlock();
                } else {
                    Haptics.error();
                    setError(true);
                    setTimeout(() => {
                        setPasscode('');
                        setError(false);
                    }, 500);
                }
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-dark flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
            <div className="flex flex-col items-center gap-6 mb-12">
                <div className={`p-6 rounded-full bg-primary/10 border-2 transition-all ${error ? 'bg-rose-500/20 border-rose-500 animate-shake' : 'border-primary/20'}`}>
                    <Lock size={48} className={error ? 'text-rose-500' : 'text-primary'} />
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-main">App Locked</h1>
                    <p className="text-sm text-muted mt-2">Enter your passcode to continue</p>
                </div>
            </div>

            <div className="flex gap-4 mb-16">
                {[0, 1, 2, 3].map(i => (
                    <div 
                        key={i} 
                        className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${passcode.length > i ? 'bg-primary border-primary scale-125' : 'border-white/20'}`} 
                    />
                ))}
            </div>

            <div className="grid grid-cols-3 gap-6 w-full max-w-[280px]">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <button 
                        key={n} 
                        onClick={() => handleKeypad(n.toString())}
                        className="w-16 h-16 rounded-full glass-card flex items-center justify-center text-xl font-bold text-main active:scale-90 transition-all border-white/5"
                    >
                        {n}
                    </button>
                ))}
                <div />
                <button 
                    onClick={() => handleKeypad('0')}
                    className="w-16 h-16 rounded-full glass-card flex items-center justify-center text-xl font-bold text-main active:scale-90 transition-all border-white/5"
                >
                    0
                </button>
                <button 
                    onClick={() => { setPasscode(''); Haptics.light(); }}
                    className="w-16 h-16 rounded-full flex items-center justify-center text-muted active:scale-90 transition-all"
                >
                    <Delete size={24} />
                </button>
            </div>
        </div>
    );
};
