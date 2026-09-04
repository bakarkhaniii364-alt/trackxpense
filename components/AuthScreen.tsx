import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import {
  ArrowRight,
  Eye,
  EyeSlash as EyeOff,
  ArrowSquareOut,
  ArrowLeft,
  User,
  Globe
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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

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
        setInfoMsg('Account created! Please check your email inbox to confirm your account.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (signInError) {
          if (signInError.message.toLowerCase().includes('invalid login credentials')) {
            setError('Invalid email or password. New user? Click "Sign up" below.');
          } else {
            throw signInError;
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
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
      setError(err.message || 'Google authentication is currently unavailable.');
    }
  };

  // If user is viewing the full product showcase first
  if (!showAuth) {
    return (
      <LandingPage 
        onContinueAsGuest={onContinueAsGuest} 
        onOpenAuth={handleOpenAuth} 
      />
    );
  }

  // =========================================================================
  // DEDICATED CLOUDFLARE 50/50 SPLIT AUTHENTICATION PAGE (dash.cloudflare.com style)
  // =========================================================================
  return (
    <div className="min-h-screen w-full bg-[#000000] text-white font-sans flex flex-col lg:flex-row overflow-x-hidden selection:bg-[#F6821F] selection:text-white select-none">
      
      {/* ------------------------------------------------------------- */}
      {/* LEFT CONTAINER (Auth Action Canvas - Black Background)        */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full lg:w-1/2 min-h-screen bg-[#0C0C0E] p-6 sm:p-10 lg:p-14 flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-[#1F1F24]">
        
        {/* Top-Left: Logo & Home Link */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img 
              src="/icon.png" 
              alt="TrackXpense Logo" 
              className="w-7 h-7 rounded-[6px] object-contain shrink-0" 
            />
            <span className="text-[16px] font-semibold tracking-tight text-white">
              TrackXpense
            </span>
          </div>

          <button
            onClick={() => setShowAuth(false)}
            className="text-[12px] font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft size={13} strokeWidth={1.5} />
            <span>Product Showcase</span>
          </button>
        </div>

        {/* Center: Auth Form Container */}
        <div className="my-auto py-8 w-full max-w-[360px] mx-auto space-y-6">
          
          <div className="space-y-1 text-center">
            <h1 className="text-2xl sm:text-[26px] font-semibold text-white tracking-tight">
              {isSignUp ? 'Create your account' : 'Sign in to TrackXpense'}
            </h1>
            <p className="text-[12px] text-zinc-400 font-normal">
              {isSignUp ? 'Set up cloud sync for your personal finances' : 'Access your encrypted ledger and budgets'}
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3 rounded-[6px] bg-red-500/10 border border-red-500/20 text-[12px] text-red-400 text-center animate-in fade-in">
              {error}
            </div>
          )}

          {infoMsg && (
            <div className="p-3 rounded-[6px] bg-emerald-500/10 border border-emerald-500/20 text-[12px] text-emerald-400 text-center animate-in fade-in">
              {infoMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth} className="space-y-3.5">
            
            <div>
              <label className="text-[12px] text-zinc-300 font-medium block mb-1.5">
                Email address
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full h-[40px] px-3.5 rounded-[6px] bg-[#141417] border border-[#27272A] focus:border-[#F6821F] text-[13px] text-white placeholder-zinc-500 outline-none transition-colors"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] text-zinc-300 font-medium">
                  Password
                </label>
                {!isSignUp && (
                  <span className="text-[11px] text-zinc-400 hover:text-white cursor-pointer">
                    Forgot password?
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-[40px] px-3.5 pr-10 rounded-[6px] bg-[#141417] border border-[#27272A] focus:border-[#F6821F] text-[13px] text-white placeholder-zinc-500 outline-none transition-colors"
                  required
                  minLength={6}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {/* Cloudflare Style Primary Action Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-[40px] mt-1 rounded-[6px] bg-[#F6821F] hover:bg-[#E3993D] active:scale-[0.99] text-[#0C0C0E] font-semibold text-[13px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-none"
            >
              {loading ? (
                <span>Please wait...</span>
              ) : (
                <span>{isSignUp ? 'Create account' : 'Continue with email'}</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-3">
            <div className="w-full border-t border-[#222226]" />
            <span className="px-3 bg-[#0C0C0E] text-[11px] text-zinc-500 font-mono uppercase absolute">
              or
            </span>
          </div>

          {/* Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full h-[40px] rounded-[6px] bg-[#141417] hover:bg-[#1A1A1E] border border-[#27272A] text-zinc-200 font-medium text-[13px] flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Toggle Sign in / Sign up Mode */}
          <div className="text-center text-[12px] text-zinc-400 pt-1">
            {isSignUp ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setError(null); }}
                  className="text-[#F6821F] hover:underline font-medium cursor-pointer"
                >
                  Sign in
                </button>
              </span>
            ) : (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setError(null); }}
                  className="text-[#F6821F] hover:underline font-medium cursor-pointer"
                >
                  Sign up
                </button>
              </span>
            )}
          </div>

          {/* Terms text matching Cloudflare */}
          <p className="text-[11px] text-zinc-500 text-center leading-relaxed pt-2">
            By continuing, I agree to TrackXpense's{' '}
            <span className="text-zinc-400 underline cursor-pointer hover:text-white">terms</span>,{' '}
            <span className="text-zinc-400 underline cursor-pointer hover:text-white">privacy policy</span>, and{' '}
            <span className="text-zinc-400 underline cursor-pointer hover:text-white">cookie policy</span>.
          </p>

        </div>

        {/* Bottom-Left: Cookie Preferences Badge */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-4">
          <button 
            onClick={onContinueAsGuest}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Continue without signing in (Guest Mode)</span>
          </button>
          <span>© 2026 TrackXpense</span>
        </div>

      </div>

      {/* ------------------------------------------------------------- */}
      {/* RIGHT CONTAINER (Cloudflare Orange Showcase with Dot Sphere) */}
      {/* ------------------------------------------------------------- */}
      <div className="w-full lg:w-1/2 min-h-[480px] lg:min-h-screen bg-gradient-to-br from-[#F6821F] via-[#EB6818] to-[#E35A12] p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden text-white">
        
        {/* Authentic Cloudflare Particle Dot Sphere Graphic */}
        <div 
          className="absolute -right-24 top-1/2 -translate-y-1/2 w-[550px] h-[550px] opacity-80 pointer-events-none"
          aria-hidden="true"
        >
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <defs>
              <radialGradient id="cfDotGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Generate concentric dot matrix matching Cloudflare connect globe */}
            {[...Array(24)].map((_, ring) => {
              const count = 12 + ring * 4;
              const radius = 20 + ring * 7.5;
              return [...Array(count)].map((__, idx) => {
                const angle = (idx / count) * 2 * Math.PI;
                const cx = 200 + radius * Math.cos(angle);
                const cy = 200 + radius * Math.sin(angle);
                const opacity = Math.sin(angle + ring) * 0.4 + 0.5;
                const size = (ring % 3 === 0) ? 2.2 : 1.4;
                if (cx < 100) return null; // Mask left edge
                return (
                  <circle
                    key={`${ring}-${idx}`}
                    cx={cx}
                    cy={cy}
                    r={size}
                    fill="white"
                    opacity={opacity * 0.75}
                  />
                );
              });
            })}
          </svg>
        </div>

        {/* Top-Right: Language & Sign Up Pill Button */}
        <div className="relative z-10 flex items-center justify-end gap-4 text-[12px]">
          <div className="flex items-center gap-1 text-white/80 font-medium">
            <Globe size={14} strokeWidth={1.5} />
            <span>English</span>
          </div>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="h-[32px] px-4 rounded-[6px] bg-[#000000] hover:bg-zinc-900 text-white text-[12px] font-medium transition-colors cursor-pointer"
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </div>

        {/* Center: Editorial Feature Content */}
        <div className="relative z-10 my-auto py-12 max-w-md space-y-4">
          <span className="text-[12px] font-mono uppercase tracking-[0.08em] text-white/80 block">
            TRACKXPENSE CONNECT 2026
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-white tracking-tight leading-[1.15]">
            Where your finances stay truly private.
          </h2>

          <p className="text-[14px] sm:text-[15px] text-white/90 leading-relaxed font-normal">
            Track daily expenses with instant zero-lag logging, set realistic monthly budgets, and sync automatically across all your devices.
          </p>

          <div className="pt-3">
            <button
              onClick={onContinueAsGuest}
              className="h-[40px] px-5 rounded-[6px] bg-[#000000] hover:bg-zinc-900 text-white text-[13px] font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
            >
              <ArrowSquareOut size={15} strokeWidth={1.5} />
              <span>Explore as Guest (Instant Access)</span>
            </button>
          </div>
        </div>

        {/* Bottom-Right: Subtle Subtext */}
        <div className="relative z-10 text-[11px] text-white/70 font-mono">
          BUILT FOR PRIVACY, SPEED, AND SIMPLICITY
        </div>

      </div>

    </div>
  );
};
