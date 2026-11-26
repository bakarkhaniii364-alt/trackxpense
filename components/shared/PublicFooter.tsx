import React, { useState } from 'react';
import { navigateTo } from '../../src/services/router';

interface PublicFooterProps {
  onOpenLegal?: (type: 'privacy' | 'terms' | 'security') => void;
  className?: string;
  hideContact?: boolean;
}

export const PublicFooter: React.FC<PublicFooterProps> = ({ className = '', hideContact = false }) => {
  const [contactCopied, setContactCopied] = useState(false);

  const handleCopyContact = () => {
    navigator.clipboard?.writeText('bakarkhaniii364@gmail.com');
    setContactCopied(true);
    setTimeout(() => setContactCopied(false), 2500);
  };
  return (
    <footer className={`w-full py-6 px-6 max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-[var(--text-muted)] select-none ${className}`}>
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
        <a
          href="/privacy"
          onClick={(e) => {
            e.preventDefault();
            navigateTo('privacy-policy');
          }}
          className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          Privacy Policy
        </a>
        <a
          href="/terms"
          onClick={(e) => {
            e.preventDefault();
            navigateTo('terms-of-service');
          }}
          className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          Terms of Service
        </a>
        <a
          href="/security"
          onClick={(e) => {
            e.preventDefault();
            navigateTo('security-policy');
          }}
          className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          Security Policy
        </a>
        {!hideContact && (
          <a
            href="/contact"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('contact');
            }}
            className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Contact
          </a>
        )}
      </div>
    </footer>
  );
};
