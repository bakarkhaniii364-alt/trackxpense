import { Category } from '../../types';
import { 
  Banknote, Briefcase, GraduationCap, Landmark, Coffee, UtensilsCrossed, 
  Utensils, Bike, Cookie, CreditCard, Car, ShoppingBag, Zap, Music, 
  Activity, ArrowRightLeft, MoreHorizontal 
} from 'lucide-react';
import React from 'react';

export const CategoryIcon = ({ category, color, size = 20 }: { category: string, color?: string, size?: number }) => {
  const props = { size, strokeWidth: 2.5 };
  const style = color ? { color } : {};

  switch (category) {
    case Category.SALARY: return <Banknote {...props} className="text-emerald-400" />;
    case Category.GIG: return <Briefcase {...props} className="text-blue-400" />;
    case Category.TUITION: return <GraduationCap {...props} className="text-purple-400" />;
    case Category.LOAN: return <Landmark {...props} className="text-amber-400" />;
    case Category.BREAKFAST: return <Coffee {...props} className="text-orange-400" />;
    case Category.LUNCH: return <UtensilsCrossed {...props} className="text-orange-500" />;
    case Category.DINNER: return <Utensils {...props} className="text-rose-500" />;
    case Category.FOODPANDA: return <Bike {...props} className="text-rose-500" />;
    case Category.SNACKS: return <Cookie {...props} className="text-amber-300" />;
    case Category.LOAN_PAYMENT: return <CreditCard {...props} className="text-red-400" />;
    case Category.TRANSPORT: return <Car {...props} className="text-sky-400" />;
    case Category.SHOPPING: return <ShoppingBag {...props} className="text-pink-400" />;
    case Category.BILLS: return <Zap {...props} className="text-yellow-400" />;
    case Category.ENTERTAINMENT: return <Music {...props} className="text-purple-400" />;
    case Category.HEALTH: return <Activity {...props} className="text-emerald-400" />;
    case Category.TRANSFER: return <ArrowRightLeft {...props} className="text-main" />;
    default: return <div style={style}><MoreHorizontal {...props} className={!color ? "text-muted" : ""} /></div>;
  }
};
