import React from 'react';
import {
  Check,
  Shield,
  Lightning as Zap,
  Cloud,
  DeviceMobile as Smartphone,
  Sparkle as Sparkles,
  X
} from '@phosphor-icons/react';
import { Haptics } from '../services/haptics';

interface PremiumUpgradeProps {
  onUpgrade: () => void;
  onClose: () => void;
}

export const PremiumUpgrade: React.FC<PremiumUpgradeProps> = ({ onUpgrade, onClose }) => {
  const handleUpgrade = () => {
    Haptics.success();
    // In a real app, this would redirect to Stripe Checkout
    onUpgrade();
  };

  return (
    <div className="fixed inset-0 z-[7000] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative liquid-glass w-full max-w-lg rounded-[40px] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Hero Background */}
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-br from-primary/40 to-purple-600/40 opacity-50 blur-3xl -z-10" />
        
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 text-muted hover:text-white transition-colors">
          <X size={20} />
        </button>

        <div className="p-8 sm:p-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary rounded-sm shadow-lg shadow-primary/20">
              <Zap size={24} className="text-white fill-current" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Go Platinum</h2>
              <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">Unlimited Intelligence</p>
            </div>
          </div>

          <h3 className="text-3xl font-bold text-white mb-8 tracking-tighter leading-tight">
            Unlock the full potential of your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">financial engine.</span>
          </h3>

          <div className="space-y-4 mb-10">
            {[
              { icon: Cloud, title: 'Multi-Device Sync', desc: 'Seamlessly access your data across web, iOS, and Android.' },
              { icon: Shield, title: 'Stealth & Panic Mode', desc: 'Secure your privacy with biometrics and emergency hotkeys.' },
              { icon: Zap, title: 'Automated Recurring Engine', desc: 'Log subscriptions and recurring bills automatically.' },
              { icon: Sparkles, title: 'Advanced Heuristics', desc: 'Deep-dive into spending patterns with behavioral AI.' }
            ].map((feature, i) => (
              <div key={i} className="flex gap-4 items-start group">
                <div className="p-2 rounded-md bg-white/5 text-primary group-hover:scale-110 transition-transform">
                  <feature.icon size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-none mb-1">{feature.title}</h4>
                  <p className="text-xs text-muted/60 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white/5 rounded-md p-6 border border-white/5 mb-8">
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-[10px] text-muted font-black uppercase tracking-widest mb-1">Platinum Lifetime</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-white tracking-tighter">$19.99</span>
                  <span className="text-xs text-muted/40 font-medium line-through">$49.99</span>
                </div>
              </div>
              <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Limited Offer</span>
              </div>
            </div>
            <button 
              onClick={handleUpgrade}
              className="btn btn--primary w-full justify-center text-[11px] uppercase tracking-[0.2em]"
            >
              Unlock Everything
            </button>
          </div>

          <p className="text-center text-[10px] text-muted/40 font-medium">
            One-time purchase. No recurring subscriptions. Secure payment via Stripe.
          </p>
        </div>
      </div>
    </div>
  );
};
