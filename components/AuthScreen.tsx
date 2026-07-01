import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { Zap, Sparkles, Fingerprint, Mail, Lock, ArrowRight, X } from 'lucide-react';
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
  };

  return (
    <>
      <LandingPage 
        onContinueAsGuest={onContinueAsGuest} 
        onOpenAuth={handleOpenAuth} 
      />

      {showAuth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          {/* Dismiss overlay click */}
          <div className="absolute inset-0" onClick={() => setShowAuth(false)} />

          <div className="w-full max-w-[360px] relative animate-in fade-in zoom-in-95 duration-350 z-10">
            <div className="liquid-glass p-6 rounded-md overflow-hidden border border-white/10 shadow-2xl relative">
              {/* Close Button */}
              <button 
                onClick={() => setShowAuth(false)} 
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/5 text-muted hover:text-white transition-colors"
              >
                <X size={14} />
              </button>

              {/* Logo/Icon */}
              <div className="flex items-center gap-4 mb-6 px-1">
                <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center shadow-lg shadow-primary/20">
                  <Zap className="w-5 h-5 text-white fill-white" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-white tracking-tight uppercase">TrackXpense</h1>
                  <p className="text-white/30 text-[9px] font-black uppercase tracking-widest leading-none">Personal Expense Tracker</p>
                </div>
              </div>

              <div className="flex gap-1 bg-white/5 p-1 rounded-sm mb-6">
                <button
                  onClick={() => setIsSignUp(false)}
                  className={`flex-1 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all ${!isSignUp ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsSignUp(true)}
                  className={`flex-1 py-1.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all ${isSignUp ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'}`}
                >
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleAuth} className="space-y-3">
                {isSignUp && (
                  <div className="space-y-1">
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-primary transition-colors">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full bg-white/5 border border-white/5 rounded-sm py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
                        required={isSignUp}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-primary transition-colors">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full bg-white/5 border border-white/5 rounded-sm py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-white/20 group-focus-within:text-primary transition-colors">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full bg-white/5 border border-white/5 rounded-sm py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition-all"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-2 rounded-sm bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] text-center font-bold uppercase tracking-tight">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:brightness-110 disabled:opacity-50 text-white font-black text-xs uppercase tracking-[0.2em] py-3.5 rounded-sm shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group transition-all active:scale-[0.98] mt-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {isSignUp ? 'Create Account' : 'Log In'}
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/5 flex flex-col items-center">
                <button
                  onClick={() => { setShowAuth(false); onContinueAsGuest(); }}
                  className="text-white/20 hover:text-white/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  Continue as Guest
                </button>
              </div>
            </div>

            <p className="text-center text-white/10 text-[8px] font-black uppercase tracking-[0.3em] mt-6">
              Secure • Synced • Private
            </p>
          </div>
        </div>
      )}
    </>
  );
};
