import React, { useState, useMemo, useEffect } from 'react';
import { AppData, TransactionType, CategoryItem } from '../../types';
import { Trash2, Shield, Activity, Edit2 } from 'lucide-react';
import { FieldHelp } from '../pc/FieldHelp';
import { COLOR_PRESETS, GlassSelect } from '../shared/CommonUI';

interface FinancialEnforcementManagerProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  formatMoney: (val: number, sym: string) => string;
  isCompact?: boolean;
}

export const FinancialEnforcementManager: React.FC<FinancialEnforcementManagerProps> = ({ 
  data, 
  updateData, 
  formatMoney, 
  isCompact = false 
}) => {
  // Budget State
  const [budgetCat, setBudgetCat] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'DAILY' | 'MONTHLY'>('MONTHLY');
  const [editingCat, setEditingCat] = useState<string | null>(null);

  // Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [newCatColor, setNewCatColor] = useState(COLOR_PRESETS[0]);

  const expenseCategories = useMemo(() => 
    (data.categories || [])
      .filter((c: CategoryItem) => c.type === TransactionType.EXPENSE)
      .map((c: CategoryItem) => c.name),
    [data.categories]
  );

  const activeBudgets = useMemo(() => {
    const limits = data.settings.budgetLimits || {};
    return Object.entries(limits)
      .map(([cat, config]) => {
          // Handle legacy numeric values
          const normalizedConfig = typeof config === 'number' ? { limit: config, period: 'MONTHLY' as const } : config;
          return [cat, normalizedConfig] as [string, { limit: number, period: 'DAILY' | 'MONTHLY' }];
      })
      .filter(([_, config]) => config.limit > 0)
      .sort((a, b) => b[1].limit - a[1].limit);
  }, [data.settings.budgetLimits]);

  const availableForBudget = useMemo(() => {
    const limits = data.settings.budgetLimits || {};
    return expenseCategories.filter(cat => 
        cat === editingCat || !limits[cat] || (typeof limits[cat] === 'number' ? limits[cat] === 0 : limits[cat].limit === 0)
    );
  }, [expenseCategories, data.settings.budgetLimits, editingCat]);

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
          budgetLimits: { 
              ...(data.settings.budgetLimits || {}), 
              [budgetCat]: { limit, period: budgetPeriod } 
          } 
        }
      });
      setBudgetLimit('');
      setEditingCat(null);
    }
  };

  const startEdit = (cat: string, limit: number, period: 'DAILY' | 'MONTHLY') => {
      setEditingCat(cat);
      setBudgetCat(cat);
      setBudgetLimit(limit.toString());
      setBudgetPeriod(period);
  };

  const removeBudget = (cat: string) => {
    const newLimits = { ...(data.settings.budgetLimits || {}) };
    delete newLimits[cat];
    updateData({ settings: { ...data.settings, budgetLimits: newLimits } });
  };

  const handleAddCategory = () => {
    if (!newCatName) return;
    const newCat: CategoryItem = {
      id: `cat_${Date.now()}`,
      name: newCatName,
      type: newCatType,
      color: newCatColor,
      isSystem: false,
    };
    updateData({ categories: [...(data.categories || []), newCat] });
    setNewCatName('');
    setNewCatColor(COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);
  };

  const handleDeleteCategory = (id: string) => {
    const categoryName = data.categories?.find((c) => c.id === id)?.name;
    if (data.transactions?.some((t) => t.category === categoryName)) {
      alert('Cannot delete category with existing transactions.');
      return;
    }
    updateData({ categories: data.categories.filter((c: CategoryItem) => c.id !== id) });
  };

  return (
    <div className={`space-y-6 ${isCompact ? '' : 'max-w-5xl mx-auto pb-6 overflow-x-hidden'}`}>

      {/* Budgets Section */}
      <div className="liquid-glass p-6 rounded-sm shadow-xl space-y-6">
        <div className="flex items-center gap-2 mb-2">
            <p className="text-[9px] uppercase font-black text-muted tracking-[0.2em]">Spending Limits</p>
        </div>
        <div className={`grid grid-cols-1 ${isCompact ? 'gap-4' : 'lg:grid-cols-12 gap-6'}`}>
          <div className={`${isCompact ? '' : 'lg:col-span-4'} space-y-4`}>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-muted uppercase tracking-widest">Target Category</label>
              <GlassSelect
                value={budgetCat}
                onChange={setBudgetCat}
                options={availableForBudget}
                placeholder="Choose category..."
                disabled={!!editingCat}
              />
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button 
                  onClick={() => setBudgetPeriod('DAILY')}
                  className={`flex-1 py-2 text-[8px] font-black rounded-sm transition-all border ${budgetPeriod === 'DAILY' ? 'bg-primary border-primary text-white' : 'bg-black/20 border-white/5 text-muted/40'}`}
                >
                  DAILY
                </button>
                <button 
                  onClick={() => setBudgetPeriod('MONTHLY')}
                  className={`flex-1 py-2 text-[8px] font-black rounded-sm transition-all border ${budgetPeriod === 'MONTHLY' ? 'bg-primary border-primary text-white' : 'bg-black/20 border-white/5 text-muted/40'}`}
                >
                  MONTHLY
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest">Budget Limit</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  className="w-full bg-black/20 rounded-sm px-4 py-3 text-xs text-main border border-white/5 outline-none focus:border-primary/40"
                />
              </div>
            </div>
            <div className="flex gap-2">
                {editingCat && (
                    <button 
                        onClick={() => { setEditingCat(null); setBudgetLimit(''); }}
                        className="flex-1 py-3.5 bg-white/5 text-muted rounded-sm font-bold text-[9px] uppercase tracking-[0.2em] transition-all active:scale-95 border border-white/5"
                    >
                        Cancel
                    </button>
                )}
                <button
                    onClick={handleAddBudget}
                    disabled={availableForBudget.length === 0 && !editingCat}
                    className="flex-[2] py-3.5 bg-primary text-white rounded-sm font-bold text-[9px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 disabled:opacity-20 transition-all active:scale-95"
                >
                    {editingCat ? 'Update Budget' : 'Save Budget'}
                </button>
            </div>
          </div>
            <div className={`${isCompact ? '' : 'lg:col-span-8'}`}>
              <div className={`grid grid-cols-1 ${isCompact ? 'gap-2' : 'sm:grid-cols-2 gap-3'}`}>
                {activeBudgets.map(([cat, config]) => (
                  <div key={cat} className="glass-card p-4 rounded-md flex justify-between items-center group hover:border-white/10 transition-all">
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-sm flex items-center justify-center text-[10px] font-black ${config.period === 'DAILY' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                            {config.period === 'DAILY' ? 'D' : 'M'}
                        </div>
                        <div>
                            <span className="text-xs font-bold text-main block tracking-tight">{cat}</span>
                            <span className="text-[9px] text-muted/40 font-black uppercase tracking-[0.2em]">{formatMoney(config.limit, data.settings.currencySymbol)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => startEdit(cat, config.limit, config.period)}
                            className="p-2 text-muted/40 hover:text-primary hover:bg-primary/10 rounded-sm transition-all active:scale-90"
                            title="Edit Budget"
                        >
                            <Edit2 size={12} />
                        </button>
                        <button
                            onClick={() => removeBudget(cat)}
                            className="p-2 text-muted/40 hover:text-rose-500 hover:bg-rose-500/10 rounded-sm transition-all active:scale-90"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                  </div>
                ))}
              {activeBudgets.length === 0 && (
                <div className="col-span-full py-10 border border-dashed border-white/10 rounded-md text-center">
                   <p className="text-[9px] font-black text-muted/20 uppercase tracking-[0.2em]">No budgets active</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="liquid-glass p-6 rounded-sm shadow-xl space-y-6">
        <div className="flex items-center gap-2 mb-2">
            <p className="text-[9px] uppercase font-black text-muted tracking-[0.2em]">Expense Categories</p>
        </div>
        <div className={`grid grid-cols-1 ${isCompact ? 'gap-4' : 'lg:grid-cols-12 gap-6'}`}>
          <div className={`${isCompact ? '' : 'lg:col-span-4'} space-y-4`}>
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-muted uppercase tracking-widest">Label Name</label>
              <input
                type="text"
                placeholder="Label..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full bg-black/20 rounded-sm px-4 py-3 text-xs text-main border border-white/5 outline-none focus:border-primary/40"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setNewCatType(TransactionType.EXPENSE)}
                className={`flex-1 py-2 text-[8px] font-black rounded-sm transition-all border ${
                  newCatType === TransactionType.EXPENSE
                    ? 'bg-rose-500 border-rose-400 text-white'
                    : 'bg-black/20 border-white/5 text-muted/40'
                }`}
              >
                EXPENSE
              </button>
              <button
                onClick={() => setNewCatType(TransactionType.INCOME)}
                className={`flex-1 py-2 text-[8px] font-black rounded-sm transition-all border ${
                  newCatType === TransactionType.INCOME
                    ? 'bg-emerald-500 border-emerald-400 text-white'
                    : 'bg-black/20 border-white/5 text-muted/40'
                }`}
              >
                INCOME
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewCatColor(c)}
                  className={`w-full aspect-square rounded-sm border transition-all ${
                    newCatColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <button
              onClick={handleAddCategory}
              className="w-full py-3.5 bg-primary text-white rounded-sm font-bold text-[9px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              Add Category
            </button>
          </div>
          <div className={`${isCompact ? '' : 'lg:col-span-8'}`}>
            <div className={`grid grid-cols-1 ${isCompact ? 'gap-2' : 'sm:grid-cols-2 xl:grid-cols-3 gap-3'}`}>
              {(data.categories || []).map((cat: CategoryItem) => (
                <div key={cat.id} className="glass-card p-3 rounded-sm flex items-center justify-between group hover:border-white/10 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
                    <span className="text-[11px] font-bold text-main tracking-tight">{cat.name}</span>
                  </div>
                  {!cat.isSystem && (
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1.5 text-muted/40 hover:text-rose-500 transition-all active:scale-90"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
