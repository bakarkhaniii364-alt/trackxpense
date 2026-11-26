import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  CaretDown as ChevronDown,
  DownloadSimple,
  List,
  Lock,
  Plus
} from '@phosphor-icons/react';
import { PublicFooter } from './shared/PublicFooter';

interface LandingPageProps {
  onContinueAsGuest: () => void;
  onOpenAuth: (isSignUp: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onContinueAsGuest, onOpenAuth }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentY = e.currentTarget.scrollTop;
    if (currentY <= 16) {
      setHeaderVisible(true);
    } else if (currentY > lastScrollY.current && currentY > 52) {
      setHeaderVisible(false);
    } else if (currentY < lastScrollY.current) {
      setHeaderVisible(true);
    }
    lastScrollY.current = currentY;
  };

  const steps = [
    {
      step: 'STEP 01',
      icon: Plus,
      title: 'Write it down',
      description:
        'Add a coffee, a utility bill, or a flight in seconds. Attach a quick photo of your receipt if you want to keep proof for later.'
    },
    {
      step: 'STEP 02',
      icon: List,
      title: 'See the full picture',
      description:
        'TrackXpense neatly adds up your month by category—groceries, rent, travel, or work—so you always know where you stand at a glance.'
    },
    {
      step: 'STEP 03',
      icon: DownloadSimple,
      title: 'Take it with you',
      description:
        'Need to share expenses with a partner, boss, or tax preparer? Export a clean summary or spreadsheet with a single click.'
    }
  ];

  const features = [
    {
      title: 'Any currency, zero math',
      description:
        'Traveling or paying an international bill? Enter the amount in whatever currency you paid—dollars, euros, taka, yen—and TrackXpense converts it cleanly into your home currency.'
    },
    {
      title: 'Bills, budgets & IOUs',
      description:
        'Keep recurring subscriptions, monthly spending limits, and money owed to or by friends in one place—without messy spreadsheets.'
    },
    {
      title: 'No bank login required',
      description:
        'We will never ask for your bank password. Add items manually in seconds, or keep cash spending right alongside card spending.'
    },
    {
      title: 'Find any past purchase fast',
      description:
        'Wondering how much you paid for that repair six months ago? Type a word, a store name, or a date and pull it up in seconds.'
    },
    {
      title: 'Optional AI helper (RabbAi)',
      description:
        'Type or snap a receipt to log it faster. It stays completely off by default unless you switch it on in Settings.'
    }
  ];

  const faqs = [
    {
      q: "Is there a limit on how many expenses I can add?",
      a: "No. You can record ten expenses a month or ten thousand—there are no paywalls or entry caps."
    },
    {
      q: "Where is my data stored, and who can see it?",
      a: "Your records are saved directly on this device. We don't track your habits, show ads, or share anything with third parties. If you create an account to sync across devices, your records stay private to you."
    },
    {
      q: "Do I ever have to connect my bank account?",
      a: "Never. You don't have to hand over bank logins or passwords. You stay in complete control of what you log and when."
    },
    {
      q: "Can I leave and take my data with me?",
      a: "Yes. At any time, you can download your entire ledger as a standard spreadsheet (CSV) or JSON backup, or create a free account so your history stays safe across devices."
    },
    {
      q: "Does TrackXpense work completely offline?",
      a: "Yes. You can log expenses on a flight, underground, or anywhere without signal. Everything saves locally and catches up once you're back online."
    },
    {
      q: "What is RabbAi, and are my receipts sent to AI servers?",
      a: "RabbAi is an optional helper for logging expenses by chat or receipt photo. It is turned off by default, and nothing leaves your device unless you switch it on in Settings."
    }
  ];

  return (
    <div
      onScroll={handleScroll}
      className="w-full h-[100dvh] max-h-[100dvh] overflow-y-auto overflow-x-hidden bg-[var(--bg-page)] text-[var(--text-primary)] font-sans relative flex flex-col no-scrollbar"
    >
      
      {/* ── Header ── */}
      <header
        className={`sticky top-0 z-50 w-full h-[52px] shrink-0 bg-[var(--bg-page)] border-b border-[var(--border-default)] px-4 sm:px-8 flex items-center justify-between select-none transition-transform duration-200 ease-out ${
          headerVisible ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <img src="/icon.png" alt="TrackXpense" className="w-5 h-5 rounded-[4px] object-contain shrink-0" />
          <span className="text-[15px] font-medium text-[var(--text-primary)]">TrackXpense</span>
        </div>

        <nav className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => onOpenAuth(false)}
            className="btn btn--outline btn--sm"
          >
            Sign in
          </button>
          <button 
            type="button"
            onClick={() => onOpenAuth(true)}
            className="btn btn--secondary btn--sm"
          >
            Create account
          </button>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="w-full max-w-5xl mx-auto px-6 pt-14 pb-12 sm:pt-20 sm:pb-16">
        <div className="max-w-2xl">
          <h1 className="text-[36px] sm:text-[48px] lg:text-[54px] font-medium text-[var(--text-primary)] leading-[1.08] mb-5">
            Track your money without giving it away
          </h1>

          <p className="text-[15px] sm:text-[17px] text-[var(--text-secondary)] font-normal max-w-lg leading-relaxed mb-8">
            A quiet expense ledger on your device. No bank logins, no ads, and AI stays off unless you ask.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <button 
              type="button"
              onClick={onContinueAsGuest}
              className="btn btn--primary btn--lg w-full sm:w-auto"
            >
              Start in Guest Mode
              <ArrowRight size={16} weight="regular" />
            </button>
            
            <button 
              type="button"
              onClick={() => onOpenAuth(false)}
              className="btn btn--secondary btn--lg w-full sm:w-auto"
            >
              <Lock size={16} weight="regular" />
              Sign in to sync
            </button>
          </div>

          <p className="mt-5 text-[14px] text-[var(--text-muted)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ds-accent)] shrink-0" />
            <span>Works offline · No bank passwords · Export anytime</span>
          </p>
        </div>
      </section>

      {/* ── Three quiet steps ── */}
      <section className="w-full max-w-5xl mx-auto px-6 pb-16 sm:pb-20">
        <h2 className="text-[24px] sm:text-[28px] font-medium text-[var(--text-primary)] leading-tight max-w-md mb-8">
          Three quiet steps to stay on top of your spending.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] hover:bg-[var(--bg-surface-hover)] rounded-[10px] p-6 flex flex-col justify-between gap-8 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase text-[var(--text-muted)]">
                    {item.step}
                  </span>
                  <Icon size={16} weight="light" className="text-[var(--text-secondary)] shrink-0" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-[16px] font-medium text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Built for real life ── */}
      <section className="py-16 sm:py-20 border-t border-[var(--border-default)]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-[24px] sm:text-[28px] font-medium text-[var(--text-primary)] leading-tight max-w-md">
                Everything you need. Nothing you have to decode.
              </h2>
            </div>
            <p className="text-[14px] text-[var(--text-secondary)] max-w-xs leading-relaxed">
              Designed for everyday people, freelancers, roommates, and small shops—not Wall Street accountants.
            </p>
          </div>

          <div className="border-t border-[var(--border-default)] divide-y divide-[var(--border-default)]">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="py-6 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-8 items-start"
              >
                <h3 className="md:col-span-4 text-[14px] font-medium text-[var(--text-primary)]">
                  {feature.title}
                </h3>
                <p className="md:col-span-8 text-[14px] text-[var(--text-secondary)] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-14 sm:py-16 border-t border-[var(--border-default)]">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          <div className="lg:col-span-4">
            <h2 className="text-[18px] font-medium text-[var(--text-primary)]">
              Frequently asked questions
            </h2>
          </div>

          <div className="lg:col-span-8 divide-y divide-[var(--border-default)]">
            {faqs.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={idx}
                  className={`transition-all ${isOpen ? 'shadow-[inset_3px_0_0_var(--ds-accent)] pl-4' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full py-4 text-left flex justify-between items-center text-[14px] font-medium text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)] rounded-[4px]"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown 
                      size={16}
                      weight="regular"
                      className={`text-[var(--text-muted)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                    />
                  </button>
                  {isOpen && (
                    <div className="pb-4 text-[14px] text-[var(--text-secondary)] leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Closing CTA (Edge-to-edge banner) ── */}
      <section className="w-full bg-[var(--bg-surface)] border-t border-[var(--border-default)]">
        <div className="max-w-5xl mx-auto px-6 py-10 sm:py-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h2 className="text-[18px] font-medium text-[var(--text-primary)]">
              Try it in seconds — no sign-up needed
            </h2>
            <p className="text-[14px] text-[var(--text-secondary)]">
              Start logging on this device right now, and create an account later if you want to sync.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAuth(false)}
              className="btn btn--secondary btn--md"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="btn btn--primary btn--md"
            >
              Start in Guest Mode
              <ArrowRight size={15} weight="regular" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <PublicFooter className="border-t border-[var(--border-default)]" />
    </div>
  );
};
