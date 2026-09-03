import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import {
  Lightning as Zap,
  User,
  Envelope as Mail,
  Lock,
  ArrowRight,
  X,
  Fingerprint
} from '@phosphor-icons/react';
import { LandingPage } from './LandingPage';

interface AuthScreenProps {
  onContinueAsGuest: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onContinueAsGuest }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name }
          }
        });
        if (error) throw error;
        alert('Check your email for confirmation!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAuth = (signUpMode: boolean) => {
    setIsSignUp(signUpMode);
    setShowAuth(true);
    setError(null);
  };

  return (
    <>
      <LandingPage 
        onContinueAsGuest={onContinueAsGuest} 
        onOpenAuth={handleOpenAuth} 
      />

      {showAuth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200 select-none">
          {/* Dismiss overlay click */}
          <div className="absolute inset-0" onClick={() => setShowAuth(false)} />

          <div className="w-full max-w-[380px] relative animate-in zoom-in-95 duration-200 z-10">
            <div className="bg-[var(--bg-surface)] p-6 rounded-[12px] border border-[var(--border-default)] shadow-2xl relative text-[var(--text-primary)]">
              
              {/* Close Button */}
              <button 
                onClick={() => setShowAuth(false)} 
                className="absolute top-4 right-4 p-1.5 rounded-[6px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                title="Close"
              >
                <X size={16} strokeWidth={1.5} />
              </button>

              {/* Unboxed Brand Header */}
              <div className="flex items-center gap-2.5 mb-6">
                <Zap size={22} weight="regular" className="text-[var(--accent-solid)] stroke-[1.5px]" />
                <div>
                  <h2 className="text-[16px] font-semibold text-[var(--text-primary)] tracking-tight leading-none">
                    TrackXpense
                  </h2>
                  <p className="text-[11px] text-[var(--text-muted)] mt-1 font-normal">
                    {isSignUp ? 'Create your cloud-sync account' : 'Sign in to access your ledger'}
                  </p>
                </div>
              </div>

              {/* Segmented Tab Switcher */}
              <div className="flex p-0.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] mb-5 text-[12px]">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(null); }}
                  className={`flex-1 py-1.5 rounded-[4px] font-medium text-center transition-all cursor-pointer ${
                    !isSignUp 
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(null); }}
                  className={`flex-1 py-1.5 rounded-[4px] font-medium text-center transition-all cursor-pointer ${
                    isSignUp 
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Auth Form */}
              <form onSubmit={handleAuth} className="space-y-3.5">
                {isSignUp && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-[0.05em] block">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                        <User size={15} strokeWidth={1.5} />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full h-[36px] bg-[var(--field-bg)] border border-[var(--field-border)] focus:border-[var(--field-border-focus)] rounded-[6px] pl-9 pr-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors"
                        required={isSignUp}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-[0.05em] block">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                      <Mail size={15} strokeWidth={1.5} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-[36px] bg-[var(--field-bg)] border border-[var(--field-border)] focus:border-[var(--field-border-focus)] rounded-[6px] pl-9 pr-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-[0.05em] block">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--text-muted)]">
                      <Lock size={15} strokeWidth={1.5} />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-[36px] bg-[var(--field-bg)] border border-[var(--field-border)] focus:border-[var(--field-border-focus)] rounded-[6px] pl-9 pr-3 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors font-mono"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-2.5 rounded-[6px] bg-[var(--status-error-bg)] border border-[var(--status-error-fg)]/20 text-[var(--status-error-fg)] text-[12px] font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-[36px] rounded-[6px] bg-[var(--accent-solid)] text-[var(--accent-text)] text-[13px] font-medium hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-4 font-sans disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isSignUp ? 'Create Cloud Account' : 'Sign In'}</span>
                      <ArrowRight size={14} weight="regular" />
                    </>
                  )}
                </button>
              </form>

              {/* Guest Access Alternative */}
              <div className="mt-5 pt-4 border-t border-[var(--border-default)] flex flex-col items-center">
                <button
                  onClick={() => { setShowAuth(false); onContinueAsGuest(); }}
                  className="text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-2 transition-colors cursor-pointer py-1"
                >
                  <Fingerprint size={16} strokeWidth={1.5} className="text-[var(--accent-solid)]" />
                  <span>Continue without account (Local Guest Mode)</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </>
  );
};
