import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowLeft
} from '@phosphor-icons/react';
import { AiStarIcon } from './shared/AiStarIcon';
import { Haptics } from '../services/haptics';

interface OnboardingProps {
  isOpen: boolean;
  onComplete: (name: string, balance: number, dailyGoal: number, currencySymbol?: string, enableAi?: boolean) => void;
}

const COMMON_CURRENCIES = [
  { symbol: '৳', code: 'BDT', name: 'Bangladeshi Taka' },
  { symbol: '$', code: 'USD', name: 'US Dollar' },
  { symbol: '€', code: 'EUR', name: 'Euro' },
  { symbol: '£', code: 'GBP', name: 'British Pound' },
  { symbol: '₹', code: 'INR', name: 'Indian Rupee' },
  { symbol: '¥', code: 'JPY', name: 'Japanese Yen' },
  { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar' },
  { symbol: 'A$', code: 'AUD', name: 'Australian Dollar' }
];

export const OnboardingModal: React.FC<OnboardingProps> = ({ isOpen, onComplete }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('৳');
  const [balance, setBalance] = useState('');
  const [dailyGoal, setDailyGoal] = useState('');
  const [enableAi, setEnableAi] = useState(true);

  if (!isOpen) return null;

  const handleNext = () => {
    Haptics.light();
    if (step < 1) {
      setStep(step + 1);
    } else {
      onComplete(
        name.trim() || 'User', 
        parseFloat(balance) || 0, 
        parseFloat(dailyGoal) || 0,
        currency,
        enableAi
      );
    }
  };

  const handleBack = () => {
    Haptics.light();
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal,600)] bg-[var(--bg-page)] text-[var(--text-primary)] font-sans select-none animate-in fade-in duration-150">
      
      {/* ── Mobile: Full-screen stacked layout ── */}
      {/* ── Desktop: Centered card with visual grounding ── */}
      <div className="h-full flex flex-col lg:items-center lg:justify-center lg:p-8">

        {/* Card container — full-bleed on mobile, bounded card on desktop */}
        <div className="flex-1 lg:flex-none flex flex-col w-full lg:w-[520px] lg:max-h-[640px] lg:rounded-[12px] lg:border lg:border-[var(--border-default)] lg:bg-[var(--bg-surface)] lg:shadow-2xl overflow-hidden">

          {/* ── Top Bar ── */}
          <div className="flex-none flex items-center justify-between h-[52px] px-5 border-b border-[var(--border-default)]">
            <div className="flex items-center gap-2">
              <img src="/icon.png" alt="TrackXpense" className="w-5 h-5 rounded-[4px] object-contain shrink-0" />
              <span className="text-[14px] font-semibold text-[var(--text-primary)]">TrackXpense</span>
            </div>
            <span className="text-[12px] font-mono tabular-nums text-[var(--text-muted)]">
              {step + 1} / 2
            </span>
          </div>

          {/* ── Progress Track ── */}
          <div className="flex-none grid grid-cols-2 gap-0 h-[2px]">
            <div className={`transition-colors duration-300 ${step >= 0 ? 'bg-[var(--accent-solid)]' : 'bg-[var(--border-default)]'}`} />
            <div className={`transition-colors duration-300 ${step >= 1 ? 'bg-[var(--accent-solid)]' : 'bg-[var(--border-default)]'}`} />
          </div>

          {/* ── Content ── */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            <div className="px-6 sm:px-8 py-8 sm:py-10">

              {/* ── Step 1: Identity & Currency ── */}
              {step === 0 && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="grid gap-1.5">
                    <h1 className="text-[22px] sm:text-[24px] font-semibold text-[var(--text-primary)]">
                      Set up your vault
                    </h1>
                    <p className="text-[14px] text-[var(--text-secondary)]">
                      Your display name and primary currency.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="text-[14px] text-[var(--text-secondary)] font-medium block mb-1.5">
                        Name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Goldberg"
                        className="field-input w-full h-[40px] px-3 rounded-[6px] bg-[var(--bg-page)] border border-[var(--border-default)] text-[14px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="text-[14px] text-[var(--text-secondary)] font-medium block mb-2">
                        Currency
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {COMMON_CURRENCIES.map((c) => {
                          const isSelected = currency === c.symbol;
                          return (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                Haptics.light();
                                setCurrency(c.symbol);
                              }}
                              className={`p-2.5 rounded-[6px] text-left border transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-[var(--text-primary)] bg-[var(--bg-surface-hover)]'
                                  : 'border-[var(--border-default)] hover:border-[var(--border-active)] hover:bg-[var(--bg-surface-hover)]'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-mono text-[14px] font-semibold ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{c.symbol}</span>
                                <span className="text-[10px] font-mono text-[var(--text-muted)]">{c.code}</span>
                              </div>
                              <span className={`text-[10.5px] truncate block mt-0.5 ${isSelected ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}`}>{c.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 2: Balance & RabbAi ── */}
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="grid gap-1.5">
                    <h1 className="text-[22px] sm:text-[24px] font-semibold text-[var(--text-primary)]">
                      Starting balance
                    </h1>
                    <p className="text-[14px] text-[var(--text-secondary)]">
                      Your opening balance and daily budget.
                    </p>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="text-[14px] text-[var(--text-secondary)] font-medium block mb-1.5">
                        Wallet balance ({currency})
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[14px] text-[var(--text-muted)] pointer-events-none">{currency}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={balance}
                          onChange={e => setBalance(e.target.value)}
                          placeholder="0.00"
                          className="field-input w-full h-[42px] pl-8 pr-3 rounded-[6px] bg-[var(--bg-page)] border border-[var(--border-default)] text-[14px] font-mono tabular-nums text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[14px] text-[var(--text-secondary)] font-medium block mb-1.5">
                        Daily spending limit ({currency})
                        <span className="text-[var(--text-muted)] font-normal ml-1">— optional</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[14px] text-[var(--text-muted)] pointer-events-none">{currency}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={dailyGoal}
                          onChange={e => setDailyGoal(e.target.value)}
                          placeholder="e.g. 50"
                          className="field-input w-full h-[40px] pl-8 pr-3 rounded-[6px] bg-[var(--bg-page)] border border-[var(--border-default)] text-[14px] font-mono tabular-nums text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>

                    {/* RabbAi Toggle */}
                    <div className="pt-4 border-t border-[var(--border-default)]">
                      <div className="flex items-center justify-between gap-4 py-1">
                        <div className="min-w-0 grid gap-1">
                          <div className="flex items-center gap-1.5">
                            <AiStarIcon size={14} strokeWidth={1.5} className="text-[var(--text-secondary)] shrink-0" />
                            <span className="text-[14px] font-medium text-[var(--text-primary)]">
                              RabbAi assistant
                            </span>
                          </div>
                          <span className="text-[14px] text-[var(--text-muted)]">
                            {enableAi ? 'Natural language entry and receipt scanning.' : 'Disabled. Pure manual ledger, zero network calls.'}
                          </span>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enableAi}
                          aria-label="Toggle RabbAi assistant"
                          onClick={() => {
                            Haptics.light();
                            setEnableAi(prev => !prev);
                          }}
                          className={`toggle-switch ${enableAi ? 'is-active' : ''}`}
                        >
                          <span className="toggle-switch-thumb" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ── Bottom Action Bar ── */}
          <div className="flex-none border-t border-[var(--border-default)] px-6 sm:px-8 py-4">
            <div className="flex items-center justify-between gap-3">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="btn btn--outline btn--md"
                >
                  <ArrowLeft size={14} weight="regular" />
                  Back
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleNext}
                className="btn btn--primary btn--md"
              >
                {step === 1 ? 'Enter vault' : 'Continue'}
                <ArrowRight size={14} weight="regular" />
              </button>
            </div>
          </div>

        </div>

        {/* Desktop-only: Subtle brand footer below card */}
        <div className="hidden lg:flex items-center justify-center gap-1.5 mt-6 text-[11px] text-[var(--text-muted)]">
          <img src="/icon.png" alt="" className="w-3.5 h-3.5 rounded-[3px] opacity-60" />
          <span>Private · Offline-first · Encrypted sync</span>
        </div>

      </div>

    </div>
  );
};
