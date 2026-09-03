import { Category } from '../../types';
import {
  Money as Banknote,
  Briefcase,
  GraduationCap,
  Bank as Landmark,
  Coffee,
  ForkKnife as UtensilsCrossed,
  ForkKnife as Utensils,
  Bicycle as Bike,
  Cookie,
  CreditCard,
  Car,
  ShoppingBag,
  Lightning as Zap,
  MusicNotes as Music,
  Pulse as Activity,
  ArrowsLeftRight as ArrowRightLeft,
  DotsThree as MoreHorizontal
} from '@phosphor-icons/react';
import React from 'react';

export const CategoryIcon = ({ category, color, size = 16, strokeWidth = 1.5 }: { category: string, color?: string, size?: number, strokeWidth?: number }) => {
  const props = { size, strokeWidth };
  const style = color ? { color } : {};

  switch (category) {
    case Category.SALARY: return <Banknote {...props} className="text-emerald-400 shrink-0" />;
    case Category.GIG: return <Briefcase {...props} className="text-blue-400 shrink-0" />;
    case Category.TUITION: return <GraduationCap {...props} className="text-purple-400 shrink-0" />;
    case Category.LOAN: return <Landmark {...props} className="text-amber-400 shrink-0" />;
    case Category.BREAKFAST: return <Coffee {...props} className="text-orange-400 shrink-0" />;
    case Category.LUNCH: return <UtensilsCrossed {...props} className="text-orange-500 shrink-0" />;
    case Category.DINNER: return <Utensils {...props} className="text-rose-500 shrink-0" />;
    case Category.FOODPANDA: return <Bike {...props} className="text-rose-500 shrink-0" />;
    case Category.SNACKS: return <Cookie {...props} className="text-amber-300 shrink-0" />;
    case Category.LOAN_PAYMENT: return <CreditCard {...props} className="text-red-400 shrink-0" />;
    case Category.TRANSPORT: return <Car {...props} className="text-sky-400 shrink-0" />;
    case Category.SHOPPING: return <ShoppingBag {...props} className="text-pink-400 shrink-0" />;
    case Category.BILLS: return <Zap {...props} className="text-yellow-400 shrink-0" />;
    case Category.ENTERTAINMENT: return <Music {...props} className="text-purple-400 shrink-0" />;
    case Category.HEALTH: return <Activity {...props} className="text-emerald-400 shrink-0" />;
    case Category.TRANSFER: return <ArrowRightLeft {...props} className="text-[var(--text-primary)] shrink-0" />;
    default: return <div style={style} className="shrink-0"><MoreHorizontal {...props} className={!color ? "text-[var(--text-muted)]" : ""} /></div>;
  }
};
