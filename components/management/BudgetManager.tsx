import React, { useState, useMemo, useEffect } from 'react';
import { AppData, TransactionType, CategoryItem } from '../../types';
import { Trash2 } from 'lucide-react';
import { FieldHelp } from '../pc/FieldHelp';

interface BudgetManagerProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  formatMoney: (val: number, sym: string) => string;
  isCompact?: boolean;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({ 
  data, 
  updateData, 
  formatMoney, 
  isCompact = false 
}) => {
  const [budgetCat, setBudgetCat] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');

  const expenseCategories = useMemo(() => 
    (data.categories || [])
      .filter((c: CategoryItem) => c.type === TransactionType.EXPENSE)
      .map((c: CategoryItem) => c.name),
    [data.categories]
  );

  const activeBudgets = useMemo(() => {
    const limits = data.settings.budgetLimits || {};
    return (Object.entries(limits) as [string, number][])
      .filter(([_, limit]) => limit > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [data.settings.budgetLimits]);

  const availableForBudget = useMemo(() => 
    expenseCategories.filter(cat => !data.settings.budgetLimits?.[cat] || data.settings.budgetLimits[cat] === 0),
    [expenseCategories, data.settings.budgetLimits]
  );

  useEffect(() => {
    if (!budgetCat && availableForBudget.length > 0) {
      setBudgetCat(availableForBudget[0]);
    }
  }, [availableForBudget, budgetCat]);

  const handleAddBudget = () => {
    if (!budgetCat || !budgetLimit) return;
    const limit = parseFloat(budgetLimit);
    if (limit > 0) {
      updateData({
        settings: { 
          ...data.settings, 
          budgetLimits: { ...(data.settings.budgetLimits || {}), [budgetCat]: limit } 
        }
      });
      setBudgetLimit('');
    }
  };

  const removeBudget = (cat: string) => {
    const newLimits = { ...(data.settings.budgetLimits || {}) };
    delete newLimits[cat];
    updateData({ settings: { ...data.settings, budgetLimits: newLimits } });
  };

  return (
    <div className={`space-y-6 ${isCompact ? '' : 'max-w-5xl mx-auto pb-10'}`}>
      {!isCompact && (
        <div>
          <h2 className="text-2xl font-bold text-main tracking-tight">Vault Limits</h2>
          <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Spending Enforcement Panel</p>
        </div>
      )}

      <div className={`grid grid-cols-1 ${isCompact ? 'gap-4' : 'lg:grid-cols-12 gap-5'}`}>
        <div className={`${isCompact ? '' : 'lg:col-span-4'} liquid-glass p-6 rounded-md shadow-xl h-fit`}>
          <p className="text-[9px] uppercase font-black text-muted/40 tracking-[0.2em] mb-6">Provision Limit</p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest">Target Taxonomy</label>
                <FieldHelp text="Select the classification category to apply a limit to." />
              </div>
              <select
                value={budgetCat}
                onChange={(e) => setBudgetCat(e.target.value)}
                className="w-full bg-black/20 rounded-md px-4 py-3 text-xs text-main border border-white/5 outline-none focus:border-primary/40"
              >
                {availableForBudget.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                {availableForBudget.length === 0 && <option disabled>All categories limited</option>}
              </select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest">Volume Cap</label>
                <FieldHelp text="Maximum permissible outflow for the selected taxonomy." />
              </div>
              <input
                type="number"
                placeholder="0.00"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="w-full bg-black/20 rounded-md px-4 py-3 text-xs text-main border border-white/5 outline-none focus:border-primary/40"
              />
            </div>
            <button
              onClick={handleAddBudget}
              disabled={availableForBudget.length === 0}
              className="w-full py-3.5 bg-primary text-white rounded-md font-bold text-[9px] uppercase tracking-[0.2em] mt-2 active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-20"
            >
              Apply Constraint
            </button>
          </div>
        </div>

        <div className={`${isCompact ? '' : 'lg:col-span-8'} space-y-4`}>
          {!isCompact && <p className="text-[9px] uppercase font-black text-muted/40 tracking-[0.2em] mb-2 px-1">Active Constraints</p>}
          {activeBudgets.length === 0 && (
            <div className="liquid-glass border border-dashed border-white/10 p-12 rounded-md text-center">
              <p className="text-muted text-xs font-bold uppercase tracking-widest">No strict limits enforced.</p>
            </div>
          )}
          <div className={`grid grid-cols-1 ${isCompact ? 'gap-2' : 'sm:grid-cols-2 gap-3'}`}>
            {activeBudgets.map(([cat, limit]) => (
              <div key={cat} className="glass-card p-4 rounded-sm flex justify-between items-center group hover:border-white/10 transition-all">
                <div>
                  <span className="text-xs font-bold text-main block tracking-tight">{cat}</span>
                  <span className="text-[9px] text-muted/40 font-black uppercase tracking-[0.2em]">{formatMoney(limit, data.settings.currencySymbol)}</span>
                </div>
                <button
                  onClick={() => removeBudget(cat)}
                  className={`p-2 text-muted/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-sm transition-all active:scale-90 ${isCompact ? '' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
