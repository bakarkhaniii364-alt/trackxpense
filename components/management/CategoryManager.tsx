import React, { useState } from 'react';
import { AppData, TransactionType, CategoryItem } from '../../types';
import { Trash2 } from 'lucide-react';
import { COLOR_PRESETS } from '../shared/CommonUI';

interface CategoryManagerProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  isCompact?: boolean;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ data, updateData, isCompact = false }) => {
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [newCatColor, setNewCatColor] = useState(COLOR_PRESETS[0]);

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
    <div className={`space-y-4 ${isCompact ? '' : 'max-w-6xl mx-auto pb-10'}`}>
      {!isCompact && (
        <div>
          <h2 className="text-2xl font-bold text-main tracking-tight">Classification Engine</h2>
          <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Taxonomy Optimization Center</p>
        </div>
      )}

      <div className={`grid grid-cols-1 ${isCompact ? 'gap-4' : 'lg:grid-cols-12 gap-5'}`}>
        <div className={`${isCompact ? '' : 'lg:col-span-4'} liquid-glass p-6 rounded-md shadow-xl h-fit`}>
          <p className="text-[9px] uppercase font-black text-muted/40 tracking-[0.2em] mb-6">New Taxonomy</p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-muted uppercase tracking-widest">Descriptor</label>
              <input
                type="text"
                placeholder="Label..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full bg-black/20 rounded-md px-4 py-3 text-xs text-main border border-white/5 outline-none focus:border-primary/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-muted/40 uppercase tracking-[0.2em]">Archetype</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewCatType(TransactionType.EXPENSE)}
                  className={`flex-1 py-2 text-[8px] font-black rounded-sm transition-all border ${
                    newCatType === TransactionType.EXPENSE
                      ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20'
                      : 'bg-black/20 border-white/5 text-muted/40'
                  }`}
                >
                  EXPENSE
                </button>
                <button
                  onClick={() => setNewCatType(TransactionType.INCOME)}
                  className={`flex-1 py-2 text-[8px] font-black rounded-sm transition-all border ${
                    newCatType === TransactionType.INCOME
                      ? 'bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-black/20 border-white/5 text-muted/40'
                  }`}
                >
                  INCOME
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-muted uppercase tracking-widest">Chroma Calibration</label>
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
            </div>

            <button
              onClick={handleAddCategory}
              className="w-full py-3.5 bg-primary text-white rounded-md font-bold text-[9px] uppercase tracking-[0.2em] mt-2 active:scale-95 shadow-lg shadow-primary/20"
            >
              Register Protocol
            </button>
          </div>
        </div>

        <div className={`${isCompact ? '' : 'lg:col-span-8'} space-y-4`}>
          {!isCompact && <p className="text-[9px] uppercase font-black text-muted/40 tracking-[0.2em] mb-2 px-1">Active Taxonomy</p>}
          <div className={`grid grid-cols-1 ${isCompact ? 'gap-2' : 'sm:grid-cols-2 xl:grid-cols-3 gap-3'}`}>
            {(data.categories || []).map((cat: CategoryItem) => (
              <div
                key={cat.id}
                className="glass-card p-3 rounded-md flex items-center justify-between group hover:border-white/10 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
                  <span className="text-[11px] font-bold text-main tracking-tight">{cat.name}</span>
                </div>
                {!cat.isSystem && (
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className={`p-1.5 text-muted/40 hover:text-rose-500 transition-all active:scale-90 ${isCompact ? '' : 'opacity-0 group-hover:opacity-100'}`}
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
  );
};
