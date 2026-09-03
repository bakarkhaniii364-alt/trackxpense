import React, { useState, useMemo, useEffect } from 'react';
import { AppData, TransactionType, CategoryItem } from '../../types';
import { Trash as Trash2 } from '@phosphor-icons/react';
import { FieldHelp } from '../pc/FieldHelp';
import { CustomSelect } from '../shared/CustomSelect';

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
      .map((c: CategoryItem) => c.name)
  , [data.categories]);

  const activeBudgets = useMemo(() => 
    Object.entries(data.settings.budgetLimits || {})
  , [data.settings.budgetLimits]);

  const availableForBudget = useMemo(() => 
    expenseCategories.filter(c => !data.settings.budgetLimits?.[c])
  , [expenseCategories, data.settings.budgetLimits]);

  useEffect(() => {
    if (availableForBudget.length > 0 && (!budgetCat || !availableForBudget.includes(budgetCat))) {
      setBudgetCat(availableForBudget[0]);
    }
  }, [availableForBudget, budgetCat]);

  const handleAddBudget = () => {
    const limit = parseFloat(budgetLimit);
    if (budgetCat && !isNaN(limit) && limit > 0) {
      const newLimits = {
        ...(data.settings.budgetLimits || {}),
        [budgetCat]: limit
      };
      updateData({
        settings: {
          ...data.settings,
          budgetLimits: newLimits
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
    <div className={`space-y-6 ${isCompact ? '' : 'w-full mx-auto pb-10'}`}>
      {!isCompact && (
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Vault Limits</h2>
          <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-[0.06em] mt-1">Spending Enforcement Panel</p>
        </div>
      )}

      <div className={`grid grid-cols-1 ${isCompact ? 'gap-4' : 'lg:grid-cols-12 gap-5'}`}>
        <div className={`${isCompact ? '' : 'lg:col-span-4'} bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 rounded-[10px] h-fit`}>
          <p className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em] mb-4">Provision Limit</p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Target Taxonomy</label>
                <FieldHelp text="Select the classification category to apply a limit to." />
              </div>
              <CustomSelect
                value={budgetCat}
                onChange={(val) => setBudgetCat(val)}
                options={availableForBudget.map(cat => ({ value: cat, label: cat }))}
                placeholder={availableForBudget.length === 0 ? 'All categories limited' : 'Select category...'}
                size="md"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Volume Cap</label>
                <FieldHelp text="Maximum permissible outflow for the selected taxonomy." />
              </div>
              <input
                type="number"
                placeholder="0.00"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                className="w-full h-[36px] bg-[var(--field-bg)] rounded-[6px] px-3 text-[13px] text-[var(--text-primary)] border border-[var(--field-border)] outline-none transition-all font-mono"
              />
            </div>
            <button
              onClick={handleAddBudget}
              disabled={availableForBudget.length === 0 || !budgetLimit}
              className="btn btn--primary w-full h-[36px] text-[12px] mt-2"
            >
              Apply Constraint
            </button>
          </div>
        </div>

        <div className={`${isCompact ? '' : 'lg:col-span-8'} space-y-4`}>
          {!isCompact && <p className="text-[10px] uppercase font-medium text-[var(--text-muted)] tracking-[0.06em] mb-2 px-1">Active Constraints</p>}
          {activeBudgets.length === 0 && (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-12 rounded-[10px] text-center">
              <p className="text-[var(--text-secondary)] text-xs font-medium uppercase tracking-wider">No strict limits enforced.</p>
            </div>
          )}
          <div className={`grid grid-cols-1 ${isCompact ? 'gap-2' : 'sm:grid-cols-2 gap-3'}`}>
            {activeBudgets.map(([cat, limit]) => (
              <div key={cat} className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 rounded-[8px] flex justify-between items-center group hover:border-[var(--border-strong)] transition-all">
                <div>
                  <span className="text-[13px] font-medium text-[var(--text-primary)] block tracking-tight">{cat}</span>
                  <span className="text-[11px] text-[var(--text-muted)] font-mono">{formatMoney(limit as number, data.settings.currencySymbol)}</span>
                </div>
                <button
                  onClick={() => removeBudget(cat)}
                  className={`p-2 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-[6px] transition-all cursor-pointer ${isCompact ? '' : 'opacity-0 group-hover:opacity-100'}`}
                  title="Remove limit"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
