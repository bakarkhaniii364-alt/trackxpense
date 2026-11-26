import React, { useEffect } from 'react';
import { EnvelopeSimple, FacebookLogo, InstagramLogo } from '@phosphor-icons/react';
import { ViewState } from '../../types';
import { navigateTo } from '../../src/services/router';
import { PublicFooter } from '../shared/PublicFooter';

interface ContactViewProps {
  onNavigate?: (view: ViewState) => void;
}

export const ContactView: React.FC<ContactViewProps> = ({ onNavigate }) => {
  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'Contact | TrackXpense';
    return () => {
      document.title = originalTitle;
    };
  }, []);

  const goHome = () => {
    if (onNavigate) {
      onNavigate('dashboard');
    } else {
      navigateTo('dashboard');
    }
  };

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] overflow-y-auto overflow-x-hidden bg-[var(--bg-page)] text-[var(--text-primary)] font-sans flex flex-col no-scrollbar">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-40 w-full h-[52px] shrink-0 bg-[var(--bg-page)] border-b border-[var(--border-default)] px-4 sm:px-8 flex items-center justify-between select-none">
        <button
          type="button"
          onClick={goHome}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <img src="/icon.png" alt="TrackXpense" className="w-5 h-5 rounded-[4px] object-contain shrink-0" />
          <span className="text-[15px] font-medium text-[var(--text-primary)]">TrackXpense</span>
        </button>

        <button
          type="button"
          onClick={goHome}
          className="btn btn--primary btn--sm"
        >
          Open App
        </button>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 w-full max-w-lg mx-auto px-6 py-16 flex flex-col items-center justify-center text-center">
        <img
          src="/icon.png"
          alt="TrackXpense"
          className="w-12 h-12 rounded-[10px] object-contain mb-6"
        />

        <p className="text-[16px] sm:text-[18px] text-[var(--text-secondary)] leading-relaxed mb-8">
          TrackXpense is one of my first projects, built for fun with vibe coding. If you spot any bug, have feedback, or just like my work, feel free to reach out.
        </p>

        <div className="flex items-center justify-center gap-3">
          <a
            href="mailto:bakarkhaniii364@gmail.com"
            aria-label="Email bakarkhaniii364@gmail.com"
            title="bakarkhaniii364@gmail.com"
            className="btn btn--secondary btn--icon"
          >
            <EnvelopeSimple size={18} weight="regular" />
          </a>

          <a
            href="https://www.facebook.com/bakarkhaniii/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            title="Facebook"
            className="btn btn--secondary btn--icon"
          >
            <FacebookLogo size={18} weight="regular" />
          </a>

          <a
            href="https://www.instagram.com/bakarkhaniii/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            title="Instagram"
            className="btn btn--secondary btn--icon"
          >
            <InstagramLogo size={18} weight="regular" />
          </a>
        </div>
      </main>

      <PublicFooter hideContact className="border-t border-[var(--border-default)]" />
    </div>
  );
};
