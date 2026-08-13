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
    <div className={`p-4 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] transition-colors ${type === 'balance' ? 'col-span-2' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-[0.06em]">{title}</span>
        <div className="opacity-60">
          {icon}
        </div>
      </div>
      <h3 className="text-[20px] font-medium tracking-tight text-[var(--text-primary)] font-mono">
        {formatMoney(amount)}
      </h3>
    </div>
  );
};
