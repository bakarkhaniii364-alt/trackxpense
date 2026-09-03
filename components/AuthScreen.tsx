import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import {
  Eye,
  EyeSlash as EyeOff,
  ArrowRight,
  Check
} from '@phosphor-icons/react';

interface AuthScreenProps {
  onContinueAsGuest: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onContinueAsGuest }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMsg(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    // If on email step and password isn't filled yet, move to password step smoothly
    if (step === 'email' && !password) {
      setStep('password');
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
        setInfoMsg('Confirmation link sent! Please verify your email, or log in.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (signInError) {
          // If user doesn't exist, offer sign up
          if (signInError.message.toLowerCase().includes('invalid login credentials')) {
            setError('Invalid credentials. If you are new, switch to "Create account".');
          } else {
            throw signInError;
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Google sign-in is not configured or failed.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#09090B] text-white flex flex-col lg:flex-row overflow-x-hidden selection:bg-zinc-700 selection:text-white select-none">
      
      {/* ============================================================ */}
      {/* LEFT CONTAINER (Brand / Editorial & Angled Skeleton Cards) */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/2 min-h-[420px] lg:min-h-screen bg-[#0B0B0E] p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[#1F1F24]">
        
        {/* Angled Card Grid Background (Exact Lumen / High-Density Motif) */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.07] overflow-hidden" 
          aria-hidden="true"
        >
          <div className="absolute -top-24 -left-24 w-[160%] h-[160%] transform -rotate-12 grid grid-cols-3 gap-6">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-xl border border-white/20 bg-gradient-to-b from-white/10 to-transparent p-4 space-y-3"
              >
                <div className="h-3 w-1/3 bg-white/20 rounded" />
                <div className="h-2 w-3/4 bg-white/10 rounded" />
                <div className="h-2 w-1/2 bg-white/10 rounded" />
                <div className="pt-4 flex justify-between items-end">
                  <div className="h-4 w-12 bg-white/15 rounded" />
                  <div className="h-3 w-8 bg-white/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top-Left Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <img 
            src="/icon.png" 
            alt="TrackXpense Logo" 
            className="w-7 h-7 rounded-[6px] object-contain shrink-0" 
          />
          <span className="text-[17px] font-semibold tracking-tight text-white">
            TrackXpense
          </span>
        </div>

        {/* Center Editorial Headline & Subtitle */}
        <div className="relative z-10 max-w-lg my-auto py-12">
          <h1 className="text-3xl sm:text-4xl lg:text-[46px] font-normal tracking-tight text-white leading-[1.18] font-['Newsreader',_Georgia,_serif]">
            Clarity over every dollar and financial milestone.
          </h1>
          <p className="text-[15px] text-[#8A8D93] leading-relaxed mt-6 font-normal">
            Track daily expenses, set realistic budgets, monitor liabilities, and sync across your devices with zero ads or tracking.
          </p>
        </div>

        {/* Bottom Left Copyright */}
        <div className="relative z-10 text-[11px] text-[#5F6169] font-mono tracking-wider">
          © 2026 TRACKXPENSE
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT CONTAINER (Action Form & Auth Flow) */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/2 min-h-[500px] lg:min-h-screen bg-[#09090B] p-6 sm:p-12 lg:p-16 flex flex-col justify-between items-center relative">
        
        {/* Top Spacer for perfect vertical centering */}
        <div className="hidden lg:block h-6 w-full" />

        {/* Centered Form Box */}
        <div className="w-full max-w-[380px] my-auto py-8">
          
          {/* Form Heading */}
          <h2 className="text-2xl sm:text-[28px] font-normal text-white text-center mb-8 font-['Newsreader',_Georgia,_serif] tracking-tight">
            {isSignUp ? 'Create your account' : 'Log in or create an account'}
          </h2>

          {/* Feedback Messages */}
          {error && (
            <div className="mb-4 p-3 rounded-[8px] bg-red-500/10 border border-red-500/20 text-[12px] text-red-400 text-center animate-in fade-in">
              {error}
            </div>
          )}

          {infoMsg && (
            <div className="mb-4 p-3 rounded-[8px] bg-emerald-500/10 border border-emerald-500/20 text-[12px] text-emerald-400 text-center animate-in fade-in">
              {infoMsg}
            </div>
          )}

          {/* Main Auth Form */}
          <form onSubmit={handleContinue} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label className="text-[13px] text-[#D4D4D8] font-medium block mb-2">
                Email address
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#121215] border border-[#27272A] rounded-[8px] px-3.5 py-3 text-[14px] text-white placeholder-[#5F6169] focus:border-zinc-400 focus:outline-none transition-colors"
                required
                autoComplete="email"
              />
            </div>

            {/* Password Field (shown immediately if on password step, or toggled) */}
            {step === 'password' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[13px] text-[#D4D4D8] font-medium">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-[11px] text-zinc-400 hover:text-white underline cursor-pointer"
                  >
                    {isSignUp ? 'Already have an account? Log in' : 'Need an account? Sign up'}
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-[#121215] border border-[#27272A] rounded-[8px] px-3.5 py-3 pr-10 text-[14px] text-white placeholder-[#5F6169] focus:border-zinc-400 focus:outline-none transition-colors"
                    required
                    minLength={6}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Continue Primary Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-full bg-[#D4D4D8] hover:bg-white text-black font-semibold text-[14px] transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99]"
            >
              {loading ? 'Continuing...' : 'Continue'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-6">
            <div className="w-full border-t border-[#1F1F24]" />
            <span className="px-3 bg-[#09090B] text-[12px] text-[#5F6169] font-mono absolute">
              or
            </span>
          </div>

          {/* Continue with Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full py-2.5 rounded-full bg-[#141417] hover:bg-[#1A1A1E] border border-[#27272A] text-[#E4E4E7] font-medium text-[13px] flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            {/* Google Colorful G Icon */}
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

          {/* Legal Terms Note */}
          <p className="text-[11px] text-[#71717A] text-center leading-relaxed mt-6">
            By continuing, you agree to the{' '}
            <span className="text-zinc-400 underline cursor-pointer hover:text-white">Terms of Service</span> and{' '}
            <span className="text-zinc-400 underline cursor-pointer hover:text-white">Privacy Policy</span>.
          </p>

          {/* Continue without signing in link */}
          <div className="text-center mt-8">
            <button
              type="button"
              onClick={onContinueAsGuest}
              className="text-[13px] font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Continue without signing in
            </button>
          </div>

        </div>

        {/* Bottom-Right Footer Links */}
        <div className="w-full flex items-center justify-between text-[11px] text-[#5F6169] pt-4">
          <div className="flex items-center gap-4">
            <span className="hover:text-zinc-300 transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-zinc-300 transition-colors cursor-pointer">Terms</span>
            <span className="hover:text-zinc-300 transition-colors cursor-pointer">Help</span>
          </div>
          <div className="font-mono text-[11px] text-[#71717A]">
            Built by <span className="text-zinc-300 font-medium">bakarkhaniii</span>
          </div>
        </div>

      </div>

    </div>
  );
};
