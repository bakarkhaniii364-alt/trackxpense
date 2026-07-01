import React from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';

interface StatsCardProps {
  title: string;
  amount: number;
  type: 'balance' | 'income' | 'expense';
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, amount, type }) => {
  const formatMoney = (val: number) => 
    new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(val);

  let icon, colorClass, borderClass;

  switch (type) {
    case 'income':
      icon = <ArrowUpRight className="text-emerald-400" size={14} />;
      colorClass = 'text-emerald-400';
      borderClass = 'border-emerald-500/20';
      break;
    case 'expense':
      icon = <ArrowDownRight className="text-rose-400" size={14} />;
      colorClass = 'text-rose-400';
      borderClass = 'border-rose-500/20';
      break;
    default:
      icon = <Wallet className="text-primary" size={14} />;
      colorClass = 'text-main';
      borderClass = 'border-primary/20';
  }

  return (
    <div className={`glass-card p-4 rounded-sm shadow-sm transition-all active:scale-[0.98] ${type === 'balance' ? 'col-span-2 border-primary/20 bg-primary/5' : borderClass}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted/40 text-[9px] font-black uppercase tracking-[0.2em]">{title}</span>
        <div className="opacity-40">
          {icon}
        </div>
      </div>
      <h3 className={`text-lg font-bold tracking-tight ${colorClass}`}>
        {formatMoney(amount)}
      </h3>
    </div>
  );
};
