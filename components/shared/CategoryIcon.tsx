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

export const MUTED_CATEGORY_COLORS: Record<string, string> = {
  [Category.SALARY]: '#5b9a7d',
  [Category.GIG]: '#6b8db5',
  [Category.TUITION]: '#8b7db5',
  [Category.LOAN]: '#b5944e',
  [Category.BREAKFAST]: '#b58b5e',
  [Category.LUNCH]: '#b57a4e',
  [Category.DINNER]: '#a5694e',
  [Category.FOOD_DELIVERY]: '#a56b6b',
  [Category.SNACKS]: '#b5a55e',
  [Category.LOAN_PAYMENT]: '#a56b6b',
  [Category.TRANSPORT]: '#6b9ab5',
  [Category.SHOPPING]: '#a56b8b',
  [Category.BILLS]: '#a59a4e',
  [Category.ENTERTAINMENT]: '#8b6ba5',
  [Category.HEALTH]: '#5b9a7d',
  [Category.TRANSFER]: '#5e6b7a',
  [Category.OTHER]: '#7a8595',
};

export const CategoryIcon = ({ category, color, size = 16, strokeWidth = 1.5 }: { category: string, color?: string, size?: number, strokeWidth?: number }) => {
  const iconColor = color || MUTED_CATEGORY_COLORS[category] || '#7a8595';
  const props = { size, strokeWidth, style: { color: iconColor } };

  switch (category) {
    case Category.SALARY: return <Banknote {...props} className="shrink-0" />;
    case Category.GIG: return <Briefcase {...props} className="shrink-0" />;
    case Category.TUITION: return <GraduationCap {...props} className="shrink-0" />;
    case Category.LOAN: return <Landmark {...props} className="shrink-0" />;
    case Category.BREAKFAST: return <Coffee {...props} className="shrink-0" />;
    case Category.LUNCH: return <UtensilsCrossed {...props} className="shrink-0" />;
    case Category.DINNER: return <Utensils {...props} className="shrink-0" />;
    case Category.FOOD_DELIVERY:
    case Category.FOODPANDA: return <Bike {...props} className="shrink-0" />;
    case Category.SNACKS: return <Cookie {...props} className="shrink-0" />;
    case Category.LOAN_PAYMENT: return <CreditCard {...props} className="shrink-0" />;
    case Category.TRANSPORT: return <Car {...props} className="shrink-0" />;
    case Category.SHOPPING: return <ShoppingBag {...props} className="shrink-0" />;
    case Category.BILLS: return <Zap {...props} className="shrink-0" />;
    case Category.ENTERTAINMENT: return <Music {...props} className="shrink-0" />;
    case Category.HEALTH: return <Activity {...props} className="shrink-0" />;
    case Category.TRANSFER: return <ArrowRightLeft {...props} className="shrink-0" />;
    default: return <div style={{ color: iconColor }} className="shrink-0"><MoreHorizontal {...props} /></div>;
  }
};
