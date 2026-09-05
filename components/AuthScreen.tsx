import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import {
  Eye,
  EyeSlash as EyeOff,
  ArrowLeft,
  ArrowRight,
  Globe
} from '@phosphor-icons/react';
import { LandingPage } from './LandingPage';
import { LegalModal, LegalModalType } from './shared/LegalModal';

interface AuthScreenProps {
  onContinueAsGuest: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onContinueAsGuest }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [legalModal, setLegalModal] = useState<LegalModalType>(null);

  const handleOpenAuth = (signUpMode: boolean) => {
    setIsSignUp(signUpMode);
    setShowAuth(true);
    setError(null);
    setInfoMsg(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });
        if (signUpError) throw signUpError;
        setInfoMsg('Account created. Check your email to confirm.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (signInError) {
          if (signInError.message.toLowerCase().includes('invalid login credentials')) {
            setError('Invalid email or password.');
          } else {
            throw signInError;
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (googleError) throw googleError;
    } catch (err: any) {
      setError(err.message || 'Google sign-in unavailable.');
    }
  };

  if (!showAuth) {
    return (
      <LandingPage 
        onContinueAsGuest={onContinueAsGuest} 
        onOpenAuth={handleOpenAuth} 
      />
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[var(--bg-page)] text-[var(--text-primary)] font-sans flex flex-col lg:flex-row overflow-x-hidden select-none">
      
      {/* ── Left: Auth Form ── */}
      <div className="w-full lg:w-1/2 min-h-[100dvh] flex flex-col border-b lg:border-b-0 lg:border-r border-[var(--border-default)]">
        
        {/* Header */}
        <div className="flex-none flex items-center justify-between h-[52px] px-5 sm:px-8">
          <div className="flex items-center gap-2">
            <img src="/icon.png" alt="TrackXpense" className="w-5 h-5 rounded-[4px] object-contain shrink-0" />
            <span className="text-[14px] font-semibold tracking-tight text-[var(--text-primary)]">TrackXpense</span>
          </div>

          <button
            onClick={() => setShowAuth(false)}
            className="text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <ArrowLeft size={12} strokeWidth={1.5} />
            Home
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-8">
          <div className="w-full max-w-[340px] space-y-5">
            
            <div className="space-y-1">
              <h1 className="text-[22px] sm:text-[24px] font-semibold text-[var(--text-primary)] tracking-tight">
                {isSignUp ? 'Create account' : 'Sign in'}
              </h1>
              <p className="text-[12.5px] text-[var(--text-secondary)]">
                {isSignUp ? 'Sync your ledger across devices.' : 'Access your private ledger.'}
              </p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-0 border-b border-[var(--border-default)] text-[12.5px]">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setError(null); }}
                className={`pb-2.5 px-0 mr-5 font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
                  !isSignUp 
                    ? 'border-[var(--text-primary)] text-[var(--text-primary)]' 
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setError(null); }}
                className={`pb-2.5 px-0 font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
                  isSignUp 
                    ? 'border-[var(--text-primary)] text-[var(--text-primary)]' 
                    : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                Create account
              </button>
            </div>

            {/* Alerts */}
            {error && (
              <p className="text-[12px] text-[var(--status-error-fg)] animate-in fade-in">{error}</p>
            )}
            {infoMsg && (
              <p className="text-[12px] text-[var(--status-success-fg)] animate-in fade-in">{infoMsg}</p>
            )}

            {/* Form Fields */}
            <form onSubmit={handleAuth} className="space-y-3">
              <div>
                <label className="text-[12px] text-[var(--text-secondary)] font-medium block mb-1">Email</label>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-[38px] px-3 rounded-[6px] bg-transparent border border-[var(--border-default)] focus:border-[var(--text-primary)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[12px] text-[var(--text-secondary)] font-medium">Password</label>
                  {!isSignUp && (
                    <span className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer transition-colors">
                      Forgot?
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full h-[38px] px-3 pr-10 rounded-[6px] bg-transparent border border-[var(--border-default)] focus:border-[var(--text-primary)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors"
                    required
                    minLength={6}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-[38px] w-[38px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[38px] rounded-[6px] bg-[var(--accent-solid)] hover:opacity-90 active:scale-[0.99] text-[var(--accent-text)] font-medium text-[12.5px] transition-all flex items-center justify-center cursor-pointer"
              >
                {loading ? 'Please wait…' : (isSignUp ? 'Create account' : 'Continue')}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-[var(--border-default)]" />
              <span className="px-2 bg-[var(--bg-page)] text-[10px] text-[var(--text-muted)] uppercase absolute">or</span>
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full h-[38px] rounded-[6px] border border-[var(--border-default)] hover:border-[var(--border-active)] text-[var(--text-primary)] font-medium text-[12.5px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google
            </button>

            {/* Guest */}
            <div className="text-center">
              <button
                type="button"
                onClick={onContinueAsGuest}
                className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1 cursor-pointer"
              >
                Skip — start as guest
                <ArrowRight size={12} strokeWidth={2} />
              </button>
            </div>

            {/* Legal */}
            <p className="text-[10.5px] text-[var(--text-muted)] text-center leading-relaxed">
              By continuing you agree to our{' '}
              <button type="button" onClick={() => setLegalModal('terms')} className="underline cursor-pointer hover:text-[var(--text-secondary)]">terms</button> and{' '}
              <button type="button" onClick={() => setLegalModal('privacy')} className="underline cursor-pointer hover:text-[var(--text-secondary)]">privacy policy</button>.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right: Desktop Branded Panel (preserved for user animation) ── */}
      <div className="hidden lg:flex w-1/2 min-h-screen bg-gradient-to-br from-[#F6821F] via-[#EB6818] to-[#E35A12] p-12 lg:p-16 flex-col justify-between relative overflow-hidden text-white">
        
        {/* Dot Sphere */}
        <div className="absolute -right-24 top-1/2 -translate-y-1/2 w-[550px] h-[550px] opacity-80 pointer-events-none" aria-hidden="true">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <defs>
              <radialGradient id="cfDotGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </radialGradient>
            </defs>
            {[...Array(24)].map((_, ring) => {
              const count = 12 + ring * 4;
              const radius = 20 + ring * 7.5;
              return [...Array(count)].map((__, idx) => {
                const angle = (idx / count) * 2 * Math.PI;
                const cx = 200 + radius * Math.cos(angle);
                const cy = 200 + radius * Math.sin(angle);
                const opacity = Math.sin(angle + ring) * 0.4 + 0.5;
                const size = (ring % 3 === 0) ? 2.2 : 1.4;
                if (cx < 100) return null;
                return (
                  <circle key={`${ring}-${idx}`} cx={cx} cy={cy} r={size} fill="white" opacity={opacity * 0.75} />
                );
              });
            })}
          </svg>
        </div>

        {/* Language */}
        <div className="relative z-10 flex items-center justify-end">
          <div className="flex items-center gap-1.5 text-[12px] text-white/70 font-medium">
            <Globe size={13} strokeWidth={1.5} />
            English
          </div>
        </div>

        {/* Editorial */}
        <div className="relative z-10 my-auto max-w-md space-y-4">
          <h2 className="text-3xl sm:text-4xl lg:text-[40px] font-bold text-white tracking-tight leading-[1.15]">
            Where your finances stay truly private.
          </h2>
          <p className="text-[14px] text-white/85 leading-relaxed">
            Track daily expenses with instant zero-lag logging, set realistic budgets, and consult RabbAi when you need it — or keep it off entirely.
          </p>
        </div>

        {/* Bottom */}
        <div className="relative z-10 text-[10.5px] text-white/50 font-mono tracking-wider uppercase">
          Privacy · Speed · Autonomy
        </div>
      </div>

      <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
    </div>
  );
};
