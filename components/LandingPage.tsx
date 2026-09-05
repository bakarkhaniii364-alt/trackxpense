import React, { useState } from 'react';
import {
  ArrowRight,
  CaretDown as ChevronDown,
  Lock
} from '@phosphor-icons/react';
import { PublicFooter } from './shared/PublicFooter';
import { LegalModal, LegalModalType } from './shared/LegalModal';

interface LandingPageProps {
  onContinueAsGuest: () => void;
  onOpenAuth: (isSignUp: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onContinueAsGuest, onOpenAuth }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [legalModal, setLegalModal] = useState<LegalModalType>(null);

  const faqs = [
    {
      q: "Where is my data stored, and who can see it?",
      a: "Your records live directly in your browser's private IndexedDB storage on your hardware. We do not profile your finances, run behavioral trackers, or sell data to brokers. If you create an account, cross-device sync is encrypted end-to-end."
    },
    {
      q: "Do I ever have to connect my bank account?",
      a: "Never. TrackXpense is intentionally built without aggregator log-ins (like Plaid). You maintain complete manual control over every wallet and transaction, keeping your real bank credentials untouchable."
    },
    {
      q: "What happens if I switch devices or clear my browser data?",
      a: "In Guest Mode, data resides strictly in your current browser cache. You can export your full transaction ledger as standard CSV or JSON at any moment. Creating a free account safeguards your records across devices with encrypted cloud persistence."
    },
    {
      q: "Does TrackXpense work completely offline?",
      a: "Yes. TrackXpense operates offline-first with 0ms logging latency. Record spending on airplanes, subways, or in remote spots without cell reception. All entries commit locally and sync smoothly whenever connection returns."
    },
    {
      q: "What is RabbAi, and are my receipts sent to AI servers?",
      a: "RabbAi is an optional assistant for conversational entry and receipt scanning. It is disabled by default. No data or images are ever transmitted to AI endpoints unless you explicitly turn the feature on in Settings."
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] font-sans relative overflow-x-hidden flex flex-col no-scrollbar">
      
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 w-full bg-[var(--bg-page)]/95 backdrop-blur-md select-none h-[52px] px-5 sm:px-8 flex items-center">
        <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="TrackXpense" className="w-5 h-5 rounded-[4px] object-contain shrink-0" />
            <span className="text-[14px] font-semibold tracking-tight text-[var(--text-primary)]">TrackXpense</span>
          </div>

          <div className="flex items-center gap-1">
            <button 
              onClick={() => onOpenAuth(false)}
              className="h-[30px] px-3 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[6px] transition-colors cursor-pointer"
            >
              Sign in
            </button>
            <span className="text-[var(--border-default)] text-[12px] select-none">·</span>
            <button 
              onClick={() => onOpenAuth(true)}
              className="h-[30px] px-3 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[6px] transition-colors cursor-pointer"
            >
              Create account
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="flex-1 flex flex-col items-center justify-center px-5 sm:px-6 pt-8 pb-16 sm:pt-16 sm:pb-24 max-w-2xl mx-auto text-center">
        
        <h1 className="text-[28px] sm:text-[42px] lg:text-[48px] font-semibold tracking-tight text-[var(--text-primary)] leading-[1.15] mb-5">
          Track your money without giving it away.
        </h1>

        <p className="text-[13.5px] sm:text-[15px] text-[var(--text-secondary)] font-normal max-w-md leading-relaxed mb-10">
          A private expense ledger on your device. No bank logins, no ads, no forced AI. Works offline.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={onContinueAsGuest}
            className="w-full sm:w-auto h-[40px] px-6 text-[13px] font-medium text-[var(--accent-text)] bg-[var(--accent-solid)] hover:opacity-90 active:scale-[0.98] rounded-[6px] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Start in Guest Mode
            <ArrowRight size={14} weight="regular" />
          </button>
          
          <button 
            onClick={() => onOpenAuth(false)}
            className="w-full sm:w-auto h-[40px] px-5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] hover:border-[var(--border-active)] rounded-[6px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock size={13} weight="regular" />
            Sign in to sync
          </button>
        </div>

        <p className="mt-8 text-[11.5px] text-[var(--text-muted)] max-w-sm leading-relaxed">
          Offline-first · No bank access · Private device storage · AI off by default
        </p>
      </section>

      {/* ── FAQ ── */}
      <section className="py-14 sm:py-20 border-t border-[var(--border-default)]">
        <div className="max-w-2xl mx-auto px-5 sm:px-8">
          
          <h2 className="text-[16px] sm:text-[18px] font-semibold tracking-tight text-[var(--text-primary)] mb-8">
            Frequently asked questions
          </h2>

          <div className="space-y-px">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="border-b border-[var(--border-default)] last:border-b-0">
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full py-4 text-left flex justify-between items-center text-[13px] font-medium text-[var(--text-primary)] hover:text-[var(--accent-solid)] transition-colors cursor-pointer gap-4"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown 
                      size={14} 
                      className={`text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>
                  {isOpen && (
                    <div className="pb-4 text-[12.5px] text-[var(--text-secondary)] leading-relaxed -mt-1">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <PublicFooter onOpenLegal={(type) => setLegalModal(type)} className="border-t border-[var(--border-default)]" />
      <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
    </div>
  );
};
