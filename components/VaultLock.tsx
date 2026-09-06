import React, { useState } from 'react';
import {
  Lock,
  Backspace as Delete
} from '@phosphor-icons/react';
import { Haptics } from '../services/haptics';
import { verifyVaultPasscode, hashVaultPasscode } from '../services/crypto';

interface VaultLockProps {
  storedHash: string;
  storedSalt?: string;
  onUnlock: () => void;
  onMigratePasscode?: (hash: string, salt: string) => void;
}

export const VaultLock: React.FC<VaultLockProps> = ({ 
  storedHash, 
  storedSalt, 
  onUnlock, 
  onMigratePasscode 
}) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleKeypad = async (num: string) => {
    if (isVerifying || passcode.length >= 6) return;

    const newCode = passcode + num;
    setPasscode(newCode);
    Haptics.light();

    if (newCode.length >= 4) {
      const isValid = await verifyVaultPasscode(newCode, storedHash, storedSalt);
      if (isValid) {
        setIsVerifying(true);
        Haptics.success();
        onUnlock();
        return;
      }
    }

    if (newCode.length >= 6) {
      setIsVerifying(true);
      Haptics.warning();
      setError(true);
      setTimeout(() => {
        setPasscode('');
        setError(false);
        setIsVerifying(false);
      }, 400);
    }
  };

  const handleDelete = () => {
    if (isVerifying) return;
    setPasscode(prev => prev.slice(0, -1));
    Haptics.light();
  };

  return (
    <div className="fixed inset-0 z-[var(--z-stealth,10000)] bg-black/90 flex items-center justify-center p-4 select-none">
      <div className={`w-full max-w-xs bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[12px] p-6 flex flex-col items-center text-center animate-in zoom-in-95 duration-200 shadow-2xl ${error ? 'animate-shake' : ''}`}>
        
        {/* Unboxed Header Icon */}
        <div className="mb-4 text-[var(--accent-solid)]">
          <Lock size={32} strokeWidth={1.5} className="stroke-[1.5px]" />
        </div>

        <h2 className="text-[16px] font-semibold text-[var(--text-primary)] tracking-tight">
          Vault Locked
        </h2>
        <p className="text-[12px] text-[var(--text-secondary)] mt-1 mb-6">
          Enter your security passcode
        </p>

        {/* 6 PIN Dots */}
        <div className="flex justify-center gap-2.5 mb-8">
          {[0, 1, 2, 3, 4, 5].map(i => {
            const isFilled = passcode.length > i;
            return (
              <div 
                key={i} 
                className={`w-2.5 h-2.5 rounded-full transition-all duration-200 border ${
                  isFilled 
                    ? 'bg-[var(--accent-solid)] border-[var(--accent-solid)] scale-110' 
                    : 'bg-transparent border-[var(--border-strong)]'
                }`} 
              />
            );
          })}
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[240px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button
              key={n}
              type="button"
              disabled={isVerifying}
              onClick={() => handleKeypad(n.toString())}
              className="h-12 rounded-[8px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-mono text-[16px] font-medium flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {n}
            </button>
          ))}
          <div />
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleKeypad('0')}
            className="h-12 rounded-[8px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-default)] text-[var(--text-primary)] font-mono text-[16px] font-medium flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            disabled={isVerifying || passcode.length === 0}
            onClick={handleDelete}
            className="h-12 rounded-[8px] bg-transparent hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center active:scale-95 transition-all cursor-pointer disabled:opacity-30"
            title="Delete"
          >
            <Delete size={20} strokeWidth={1.5} />
          </button>
        </div>

        {error && (
          <span className="text-[11px] text-[var(--status-error-fg)] mt-4 font-medium animate-in fade-in">
            Incorrect passcode. Try again.
          </span>
        )}
      </div>
    </div>
  );
};
