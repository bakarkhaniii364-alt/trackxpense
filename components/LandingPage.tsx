import React, { useState } from 'react';
import { 
  Zap, 
  Sparkles, 
  Fingerprint, 
  ArrowRight, 
  Shield, 
  Database, 
  RefreshCw, 
  HelpCircle, 
  Globe, 
  ChevronDown, 
  Info,
  Check,
  TrendingUp,
  Smile,
  Lock
} from 'lucide-react';

interface LandingPageProps {
  onContinueAsGuest: () => void;
  onOpenAuth: (isSignUp: boolean) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onContinueAsGuest, onOpenAuth }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "How does the offline mode work?",
      a: "All your data is saved directly on your device first. It works completely without internet access. When you connect to the internet and sign in, your data syncs automatically to your secure cloud backup."
    },
    {
      q: "Is my data secure?",
      a: "Yes. If you use the app as a guest, your data never leaves your device. When you log in, your data is securely stored in your personal account using industry-standard security."
    },
    {
      q: "What is the Smart Advisor?",
      a: "It is a built-in helper that runs directly in your browser. It calculates how long your savings will last, finds recurring subscriptions, and shows where your money goes, keeping your data private."
    },
    {
      q: "Can I download my data?",
      a: "Yes, you can download a full copy of your data from the settings page at any time. You can import this file to restore your data on any device."
    }
  ];

  return (
    <div className="min-h-screen bg-black text-main font-sans selection:bg-primary/30 relative overflow-x-hidden flex flex-col no-scrollbar">
      
      {/* Background ambient glows - Premium animated backdrop */}
      <div className="absolute inset-0 bg-noise opacity-[0.02] pointer-events-none" />
      <div className="absolute top-[-10%] left-[-5%] w-[60%] h-[50%] bg-primary/10 blur-[130px] rounded-full pointer-events-none animate-pulse-slow" />
      <div className="absolute top-[35%] right-[-5%] w-[50%] h-[50%] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none animate-pulse-slow-delayed" />
      <div className="absolute bottom-[-10%] left-[10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full pointer-events-none animate-pulse-slow" />

      {/* TOP HEADER / NAVIGATION */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-none">TrackXpense</h1>
              <p className="text-white/30 text-[8px] font-black uppercase tracking-widest mt-1">Simple Expense Tracker</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs font-bold text-muted hover:text-white transition-colors">Features</a>
            <a href="#about" className="text-xs font-bold text-muted hover:text-white transition-colors">About</a>
            <a href="#help" className="text-xs font-bold text-muted hover:text-white transition-colors">Help</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button 
              onClick={() => onOpenAuth(false)}
              className="px-4 py-2 text-xs font-bold text-white/70 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-lg border border-white/5 hover:border-white/10"
            >
              Sign In
            </button>
            <button 
              onClick={() => onOpenAuth(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-primary hover:brightness-110 rounded-lg shadow-md shadow-primary/15 transition-all"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-24 pb-16 px-6 max-w-5xl mx-auto text-center flex flex-col items-center z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-[9px] font-black uppercase tracking-[0.2em] mb-6 animate-in slide-in-from-top-4 duration-700">
          <Sparkles size={10} className="animate-spin" style={{ animationDuration: '3s' }} /> Privacy-First Expense Tracker
        </div>

        <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase max-w-3xl leading-[0.95] mb-6 text-gradient animate-in slide-in-from-bottom-4 duration-750">
          Keep track of your expenses simply and privately
        </h2>

        <p className="text-sm md:text-lg text-white/50 font-medium max-w-xl leading-relaxed mb-10 animate-in slide-in-from-bottom-6 duration-1000">
          An elegant expense tracker that works completely offline. Your financial data stays on your device, private and secure. No ads, no tracking.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center px-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <button 
            onClick={onContinueAsGuest}
            className="btn btn--primary text-[10px] font-black uppercase tracking-[0.2em]"
          >
            Start Tracking (Guest) <ArrowRight size={12} />
          </button>
          <a 
            href="#features"
            className="btn btn--secondary text-[10px] font-black uppercase tracking-[0.2em]"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* INTERACTIVE BENTO PREVIEW MOCKUP */}
      <section className="px-6 max-w-5xl mx-auto w-full mb-28 z-10">
        <div className="liquid-glass border border-white/10 rounded-2xl p-3 md:p-5 shadow-2xl relative group overflow-hidden bg-white/[0.01] animate-float">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 pointer-events-none" />
          
          {/* Header Bar Mockup */}
          <div className="flex justify-between items-center px-4 py-2.5 border-b border-white/5 mb-5 text-white/30 text-[9px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500/40" />
              <span className="w-2 h-2 rounded-full bg-yellow-500/40" />
              <span className="w-2 h-2 rounded-full bg-green-500/40" />
              <span className="ml-2 font-mono text-[8px] text-white/40">CONSOLE_STATUS</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-400"><Shield size={10} /> SECURE</span>
              <span className="flex items-center gap-1 text-primary"><RefreshCw size={10} className="animate-spin" /> SYNCED</span>
            </div>
          </div>

          {/* Bento Content Mockup */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
            {/* Balance Card */}
            <div className="bg-black/40 border border-white/5 p-5 rounded-xl flex flex-col justify-between h-40 hover:border-white/10 transition-all">
              <div>
                <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Total Savings</span>
                <h4 className="text-3xl font-black text-white tracking-tighter mt-1">$4,850.00</h4>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-bold text-emerald-400">
                <Globe size={12} /> Stored on device
              </div>
            </div>

            {/* Smart Advisor Card */}
            <div className="bg-primary/5 border border-primary/20 p-5 rounded-xl flex flex-col justify-between h-40 shadow-[0_0_20px_rgba(94,92,230,0.03)] hover:border-primary/40 transition-all">
              <div>
                <span className="text-[8px] font-black text-primary uppercase tracking-widest">Smart Advisor</span>
                <p className="text-[10px] text-white/80 font-bold mt-2 leading-relaxed">"You have enough savings for 12 months. All subscriptions are tracked."</p>
              </div>
              <div className="flex items-center justify-between text-[8px] text-white/40 uppercase tracking-widest border-t border-white/5 pt-2">
                <span>Healthy State</span>
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              </div>
            </div>

            {/* Recent Transaction list mockup */}
            <div className="bg-black/40 border border-white/5 p-5 rounded-xl flex flex-col justify-between h-40 hover:border-white/10 transition-all">
              <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-2">Transactions</span>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-white/80">
                  <span>Groceries</span>
                  <span>-$65.00</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-white/80">
                  <span>Consulting Work</span>
                  <span className="text-emerald-400">+$1,200.00</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-white/80">
                  <span>Streaming App</span>
                  <span>-$14.99</span>
                </div>
              </div>
              <span className="text-[7px] text-white/20 uppercase tracking-widest mt-2 block">Recent activity</span>
            </div>
          </div>
        </div>
      </section>

      {/* CORE FEATURES SECTION */}
      <section id="features" className="py-24 border-t border-white/5 bg-white/[0.01] z-10 relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.25em] mb-3">Core Features</h3>
            <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight">Designed for your privacy</h2>
            <p className="text-xs md:text-sm text-white/40 font-medium mt-3">Simple tools built to give you control over your spending without compromise.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 bg-black/40 border border-white/5 hover:border-primary/20 rounded-xl hover-lift group">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                <Database size={18} />
              </div>
              <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">Works Offline</h4>
              <p className="text-xs text-white/40 leading-relaxed font-medium">
                No slow loading times. Your data is stored on your device and loads instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 bg-black/40 border border-white/5 hover:border-primary/20 rounded-xl hover-lift group">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                <RefreshCw size={18} />
              </div>
              <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">Cloud Backup</h4>
              <p className="text-xs text-white/40 leading-relaxed font-medium">
                Sign in to back up your transactions automatically. Access your data from any of your devices safely.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 bg-black/40 border border-white/5 hover:border-primary/20 rounded-xl hover-lift group">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mb-6 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                <Fingerprint size={18} />
              </div>
              <h4 className="text-sm font-bold text-white mb-2 uppercase tracking-wide">Privacy Mode</h4>
              <p className="text-xs text-white/40 leading-relaxed font-medium">
                Turn on privacy mode to instantly hide your balances from onlookers when you use the app in public.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PHILOSOPHY / ABOUT SECTION */}
      <section id="about" className="py-24 border-t border-white/5 relative z-10">
        <div className="absolute inset-0 bg-primary/[0.01] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center mx-auto mb-8 text-primary animate-float-subtle">
            <Info size={20} />
          </div>
          <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Our Privacy Policy</h3>
          
          <blockquote className="text-xl md:text-3xl font-bold text-white tracking-tight leading-relaxed italic mb-8 max-w-3xl mx-auto">
            "We believe your financial habits belong to you. Not to banks, advertisers, or anyone else."
          </blockquote>
          
          <div className="h-[1px] w-12 bg-white/10 mx-auto mb-8" />
          
          <p className="text-xs md:text-sm text-white/40 font-medium max-w-xl mx-auto leading-relaxed">
            TrackXpense is built with zero cookies, ad-trackers, or data collection. Your details are strictly between your browser and your secure account.
          </p>
        </div>
      </section>

      {/* HELP / FAQ SECTION */}
      <section id="help" className="py-24 border-t border-white/5 bg-white/[0.01] z-10 relative">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <HelpCircle className="w-8 h-8 text-primary mx-auto mb-4 animate-float-subtle" />
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.25em] mb-3">Support</h3>
            <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight">Frequently Asked Questions</h2>
            <p className="text-xs md:text-sm text-white/40 font-medium mt-3">Find answers to common questions about using TrackXpense.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="bg-black border border-white/5 rounded-xl overflow-hidden transition-all duration-300 hover:border-white/10"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 text-left flex justify-between items-center text-white/80 hover:text-white transition-colors"
                >
                  <span className="text-xs md:text-sm font-bold uppercase tracking-wider">{faq.q}</span>
                  <ChevronDown 
                    size={16} 
                    className={`text-white/30 transform transition-transform duration-300 ${activeFaq === idx ? 'rotate-180 text-primary' : ''}`} 
                  />
                </button>
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${activeFaq === idx ? 'max-h-40 border-t border-white/5 bg-white/[0.01]' : 'max-h-0'}`}
                >
                  <p className="p-6 text-xs text-white/40 leading-relaxed font-medium">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-white/5 py-12 px-6 bg-black z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-primary fill-primary" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">TrackXpense v4.0</span>
          </div>
          
          <div className="flex gap-8 text-[9px] font-black text-white/30 uppercase tracking-widest">
            <a href="mailto:support@trackxpense.app" className="hover:text-primary transition-colors">Contact Support</a>
            <span className="cursor-default">•</span>
            <span className="cursor-default">All Rights Reserved © {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
