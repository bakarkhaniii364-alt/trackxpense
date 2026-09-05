import React from 'react';
import { LegalModalType } from './LegalModal';

interface PublicFooterProps {
  onOpenLegal: (type: LegalModalType) => void;
  className?: string;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ onOpenLegal, className = '' }) => {
  return (
    <footer className={`w-full py-6 px-6 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3.5 text-[12px] text-[var(--text-muted)] select-none ${className}`}>
      <div className="flex items-center gap-2">
        <img 
          src="/icon.png" 
          alt="TrackXpense" 
          className="w-4 h-4 rounded-[3px] shrink-0 opacity-80" 
        />
        <span className="font-medium text-[var(--text-secondary)]">TrackXpense</span>
        <span>© {new Date().getFullYear()}</span>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-6 text-[var(--text-muted)] text-[12px]">
        <button
          type="button"
          onClick={() => onOpenLegal('privacy')}
          className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          Privacy Policy
        </button>
        <button
          type="button"
          onClick={() => onOpenLegal('terms')}
          className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          Terms of Service
        </button>
        <button
          type="button"
          onClick={() => onOpenLegal('security')}
          className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          Security
        </button>
        <a
          href="mailto:dev@trackxpense.app"
          className="hover:text-[var(--text-primary)] transition-colors"
        >
          Contact
        </a>
      </div>
    </footer>
  );
};
