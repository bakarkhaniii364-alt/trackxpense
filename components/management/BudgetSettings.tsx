import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AppData, TransactionType, CategoryItem } from '../../types';
import {
  Trash as Trash2,
  Shield,
  PencilSimple as Edit2,
  Plus,
  X,
  ArrowUpRight,
  ArrowDownRight,
  SquaresFour as LayoutGrid,
  List,
  DotsThreeVertical as MoreVertical,
  DotsThree,
  CheckSquare,
  PencilLine as Edit3,
  GitMerge,
  ArrowUp,
  ArrowDown
} from '@phosphor-icons/react';
import { FieldHelp } from '../pc/FieldHelp';
import { COLOR_PRESETS, GlassSelect, GlassCheckbox } from '../shared/CommonUI';
import { TablePaginationFooter } from '../shared/TablePaginationFooter';
import { SegmentedSubTabs } from '../shared/SegmentedSubTabs';

export interface BudgetSettingsProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  formatMoney: (val: number, sym: string) => string;
  isCompact?: boolean;
}

export type FinancialEnforcementManagerProps = BudgetSettingsProps;

export const BudgetSettings: React.FC<BudgetSettingsProps> = ({ 
  data, 
  updateData, 
  formatMoney, 
  isCompact = false 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'budgets' | 'categories'>('budgets');
  
  // Modal visibility states
  const [isAddBudgetModalOpen, setIsAddBudgetModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<CategoryItem | null>(null);

  // Category View Mode state (card vs table)
  const [catViewMode, setCatViewMode] = useState<'card' | 'table'>('card');

  // Category Sorting & Pagination state
  const [catSortKey, setCatSortKey] = useState<'type' | 'name' | 'volume'>('name');
  const [catSortDirection, setCatSortDirection] = useState<'asc' | 'desc'>('asc');
  const [catCurrentPage, setCatCurrentPage] = useState(1);
  const CAT_PAGE_SIZE = 10;

  // Multi-Select & Batch Action States
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [activeCatMenuId, setActiveCatMenuId] = useState<string | null>(null);

  // Rename Category State
  const [renamingCategory, setRenamingCategory] = useState<CategoryItem | null>(null);
  const [renameInput, setRenameInput] = useState('');

  // Merge Modal State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [selectedMergeTarget, setSelectedMergeTarget] = useState<string>('');
  const [customMergedName, setCustomMergedName] = useState<string>('');

  // Batch Delete State
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // Budget State
  const [budgetCat, setBudgetCat] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'DAILY' | 'MONTHLY'>('MONTHLY');
  const [editingCat, setEditingCat] = useState<string | null>(null);

  // Category State
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [newCatColor, setNewCatColor] = useState(COLOR_PRESETS[0]);

  // Per-category transaction totals & entry counts
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {};
    (data.transactions || []).forEach(t => {
      if (!stats[t.category]) {
        stats[t.category] = { count: 0, total: 0 };
      }
      stats[t.category].count += 1;
      stats[t.category].total += t.amount;
    });
    return stats;
  }, [data.transactions]);

  const handleCatSort = (key: 'type' | 'name' | 'volume') => {
    if (catSortKey === key) {
      setCatSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setCatSortKey(key);
      setCatSortDirection('asc');
    }
  };

  const sortedCategories = useMemo(() => {
    const list = [...(data.categories || [])];
    list.sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (catSortKey === 'type') {
        valA = a.type;
        valB = b.type;
      } else if (catSortKey === 'name') {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
      } else if (catSortKey === 'volume') {
        valA = categoryStats[a.name]?.total || 0;
        valB = categoryStats[b.name]?.total || 0;
      }

      if (valA < valB) return catSortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return catSortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [data.categories, catSortKey, catSortDirection, categoryStats]);

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

  const handleSaveBudget = () => {
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
      setIsAddBudgetModalOpen(false);
    }
  };

  const startEditBudget = (cat: string, limit: number, period: 'DAILY' | 'MONTHLY') => {
      setEditingCat(cat);
      setBudgetCat(cat);
      setBudgetLimit(limit.toString());
      setBudgetPeriod(period);
      setIsAddBudgetModalOpen(true);
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
    setIsAddCategoryModalOpen(false);
  };

  const toggleSelectCategory = (id: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllCategories = () => {
    const allIds = (data.categories || []).map(c => c.id);
    if (selectedCategoryIds.length === allIds.length) {
      setSelectedCategoryIds([]);
    } else {
      setSelectedCategoryIds(allIds);
    }
  };

  const confirmDeleteCategory = () => {
    if (!deletingCategory) return;
    const catName = deletingCategory.name;
    const hasTx = (data.transactions || []).some(t => t.category === catName);

    let updatedTx = data.transactions || [];
    if (hasTx) {
      updatedTx = updatedTx.map(t => 
        t.category === catName ? { ...t, category: 'Miscellaneous' } : t
      );
    }

    let updatedCategories = (data.categories || []).filter(c => c.id !== deletingCategory.id);
    if (hasTx && !updatedCategories.some(c => c.name === 'Miscellaneous')) {
      updatedCategories.push({
        id: 'cat_misc',
        name: 'Miscellaneous',
        type: TransactionType.EXPENSE,
        color: '#71717A',
        isSystem: true
      });
    }

    updateData({
      categories: updatedCategories,
      ...(hasTx ? { transactions: updatedTx } : {})
    });

    setDeletingCategory(null);
  };

  const handleRenameCategory = () => {
    if (!renamingCategory || !renameInput.trim()) return;
    const oldName = renamingCategory.name;
    const newName = renameInput.trim();

    const updatedCategories = (data.categories || []).map(c => 
      c.id === renamingCategory.id ? { ...c, name: newName } : c
    );

    const updatedTransactions = (data.transactions || []).map(t => 
      t.category === oldName ? { ...t, category: newName } : t
    );

    updateData({ categories: updatedCategories, transactions: updatedTransactions });
    setRenamingCategory(null);
    setRenameInput('');
  };

  const openMergeModal = () => {
    const selectedCats = (data.categories || []).filter(c => selectedCategoryIds.includes(c.id));
    if (selectedCats.length > 0) {
      setSelectedMergeTarget(selectedCats[0].name);
    }
    setCustomMergedName('');
    setIsMergeModalOpen(true);
  };

  const handleConfirmMerge = () => {
    const selectedCats = (data.categories || []).filter(c => selectedCategoryIds.includes(c.id));
    if (selectedCats.length < 2) return;

    const targetName = selectedMergeTarget === 'CUSTOM' ? customMergedName.trim() : selectedMergeTarget;
    if (!targetName) return;

    const oldNames = selectedCats.map(c => c.name);

    const updatedTransactions = (data.transactions || []).map(t => 
      oldNames.includes(t.category) ? { ...t, category: targetName } : t
    );

    let updatedCategories = (data.categories || []).filter(c => !selectedCategoryIds.includes(c.id));
    
    const existingTarget = (data.categories || []).find(c => c.name === targetName);
    const firstSelected = selectedCats[0];

    const mergedCategoryItem: CategoryItem = existingTarget || {
      id: `cat_merged_${Date.now()}`,
      name: targetName,
      type: firstSelected.type,
      color: firstSelected.color,
      isSystem: false
    };

    if (!updatedCategories.some(c => c.name === targetName)) {
      updatedCategories.push(mergedCategoryItem);
    }

    updateData({
      categories: updatedCategories,
      transactions: updatedTransactions
    });

    setSelectedCategoryIds([]);
    setIsMergeModalOpen(false);
  };

  const handleBatchDeleteCategories = () => {
    const selectedCats = (data.categories || []).filter(c => selectedCategoryIds.includes(c.id));
    const selectedNames = selectedCats.map(c => c.name);

    const hasAnyTx = (data.transactions || []).some(t => selectedNames.includes(t.category));

    let updatedTx = data.transactions || [];
    if (hasAnyTx) {
      updatedTx = updatedTx.map(t => 
        selectedNames.includes(t.category) ? { ...t, category: 'Miscellaneous' } : t
      );
    }

    let updatedCategories = (data.categories || []).filter(c => !selectedCategoryIds.includes(c.id));
    if (hasAnyTx && !updatedCategories.some(c => c.name === 'Miscellaneous')) {
      updatedCategories.push({
        id: 'cat_misc',
        name: 'Miscellaneous',
        type: TransactionType.EXPENSE,
        color: '#71717A',
        isSystem: true
      });
    }

    updateData({
      categories: updatedCategories,
      ...(hasAnyTx ? { transactions: updatedTx } : {})
    });

    setSelectedCategoryIds([]);
    setIsBatchDeleteModalOpen(false);
  };

  const deletingHasData = useMemo(() => {
    if (!deletingCategory) return false;
    return (data.transactions || []).some(t => t.category === deletingCategory.name);
  }, [deletingCategory, data.transactions]);

  const selectedCategoriesList = useMemo(() => {
    return (data.categories || []).filter(c => selectedCategoryIds.includes(c.id));
  }, [data.categories, selectedCategoryIds]);

  return (
    <div className={`space-y-6 ${isCompact ? '' : 'w-full mx-auto pb-6 overflow-x-hidden'}`}>
      
      {/* Sub-Tabs Navigation Header */}
      {!isCompact && (
        <div className="pb-1 border-b border-[var(--border-default)] mb-6">
          <SegmentedSubTabs
            activeTab={activeSubTab}
            onChange={setActiveSubTab}
            tabs={[
              { id: 'budgets', label: 'Budgets', count: activeBudgets.length },
              { id: 'categories', label: 'Categories', count: data.categories?.length },
            ]}
          />
        </div>
      )}

      {/* Budgets Section */}
      {(isCompact || activeSubTab === 'budgets') && (
        <div className="space-y-4 animate-in fade-in duration-300">
          
          {/* Cloudflare-Style Section Header Outside Card */}
          <div className="flex items-center justify-between pb-2">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Budgets</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Set daily or monthly spending limits per category to keep your budget on track.</p>
            </div>
            <button
              onClick={() => {
                setEditingCat(null);
                setBudgetLimit('');
                setIsAddBudgetModalOpen(true);
              }}
              className="btn btn--secondary h-[32px] px-3.5 text-[12px] flex items-center gap-1.5 shrink-0"
            >
              <Plus size={14} strokeWidth={1.5} />
              <span>Add budget</span>
            </button>
          </div>

          {/* Content Area */}
          {activeBudgets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeBudgets.map(([cat, config]) => (
                <div 
                  key={cat} 
                  className="bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-active)] p-5 rounded-[10px] flex items-center justify-between group transition-all"
                >
                  <div className="flex items-center gap-3.5">
                    <div 
                      className={`w-9 h-9 rounded-[8px] flex items-center justify-center text-[11px] font-bold ${
                        config.period === 'DAILY' 
                          ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                          : 'bg-[var(--accent-bg-soft)] text-[var(--accent)] border border-[var(--accent)]/20'
                      }`}
                    >
                      {config.period === 'DAILY' ? 'D' : 'M'}
                    </div>
                    <div>
                      <span className="text-[14px] font-medium text-[var(--text-primary)] block tracking-tight">{cat}</span>
                      <span className="text-[12px] text-[var(--text-muted)] font-mono">
                        {formatMoney(config.limit, data.settings.currencySymbol)} / {config.period.toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditBudget(cat, config.limit, config.period)}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] rounded-[6px] transition-all"
                      title="Edit Budget"
                    >
                      <Edit2 size={14} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => removeBudget(cat)}
                      className="p-1.5 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 rounded-[6px] transition-all"
                      title="Delete Budget"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Cloudflare-Style Centered Empty State Card */
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[10px] p-12 text-center flex flex-col items-center justify-center my-4">
              <Shield size={32} strokeWidth={1.5} className="text-[var(--text-muted)] mb-3" />
              <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Create a budget</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-6 leading-relaxed">
                Set category spending limits to manage your finances efficiently across daily or monthly cycles.
              </p>
              <button
                onClick={() => {
                  setEditingCat(null);
                  setBudgetLimit('');
                  setIsAddBudgetModalOpen(true);
                }}
                className="btn btn-secondary flex items-center gap-1.5 px-4 py-2 rounded-[8px] font-medium text-[13px] transition-all"
              >
                <Plus size={15} strokeWidth={1.5} />
                <span>Add budget</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Categories Section */}
      {(isCompact || activeSubTab === 'categories') && (
        <div className="space-y-4 animate-in fade-in duration-300">
          
          {/* Cloudflare-Style Section Header Outside Card */}
          <div className="flex items-center justify-between pb-2">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text-primary)] tracking-tight">Categories</h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">Manage transaction categories and visual color swatches.</p>
            </div>

            {/* Action Bar: View Toggle + Add Category Button */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* Card / Table View Toggle */}
              <div className="inline-flex bg-[var(--bg-subtle)] p-0.5 rounded-[6px] border border-[var(--border-default)]">
                <button
                  onClick={() => setCatViewMode('card')}
                  className={`p-1.5 rounded-[5px] transition-all ${
                    catViewMode === 'card' 
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Card View"
                >
                  <LayoutGrid size={15} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => setCatViewMode('table')}
                  className={`p-1.5 rounded-[5px] transition-all ${
                    catViewMode === 'table' 
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Table View"
                >
                  <List size={15} strokeWidth={1.5} />
                </button>
              </div>

              {/* Add Category Button */}
              <button
                onClick={() => {
                  setNewCatName('');
                  setIsAddCategoryModalOpen(true);
                }}
                className="btn btn--secondary h-[32px] px-3.5 text-[12px] flex items-center gap-1.5 shrink-0"
              >
                <Plus size={14} strokeWidth={1.5} />
                <span>Add category</span>
              </button>
            </div>
          </div>

          {/* Render Card View or Table View */}
          {catViewMode === 'card' ? (
            /* --- CARD VIEW --- */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {sortedCategories.map((cat: CategoryItem) => {
                const isIncome = cat.type === TransactionType.INCOME;
                const isSelected = selectedCategoryIds.includes(cat.id);
                const stats = categoryStats[cat.name] || { count: 0, total: 0 };
                const isMenuOpen = activeCatMenuId === cat.id;

                return (
                  <div 
                    key={cat.id} 
                    className={`bg-[var(--bg-surface)] border p-4 rounded-[10px] flex items-center justify-between group transition-all relative ${
                      isSelected ? 'border-[var(--accent)] bg-[var(--bg-subtle)]' : 'border-[var(--border-default)] hover:border-[var(--border-active)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Project Glass Checkbox */}
                      <GlassCheckbox 
                        checked={isSelected}
                        onChange={() => toggleSelectCategory(cat.id)}
                      />

                      {/* Direction Arrow */}
                      {isIncome ? (
                        <ArrowUpRight size={18} strokeWidth={1.5} style={{ color: cat.color }} className="shrink-0" />
                      ) : (
                        <ArrowDownRight size={18} strokeWidth={1.5} style={{ color: cat.color }} className="shrink-0" />
                      )}

                      <div className="min-w-0">
                        <span className="text-[13px] font-medium text-[var(--text-primary)] block tracking-tight truncate">{cat.name}</span>
                        <span className="text-[11px] text-[var(--text-muted)] block font-mono mt-0.5">
                          {stats.count} {stats.count === 1 ? 'entry' : 'entries'} • {formatMoney(stats.total, data.settings.currencySymbol)}
                        </span>
                      </div>
                    </div>

                    {/* Meatball Context Menu Button */}
                    <div className="relative shrink-0 ml-1">
                      <button
                        onClick={() => setActiveCatMenuId(isMenuOpen ? null : cat.id)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] rounded-[6px] transition-all"
                        title="Actions"
                      >
                        <MoreVertical size={15} strokeWidth={1.5} />
                      </button>

                      {/* Context Menu Dropdown */}
                      {isMenuOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-[50]" 
                            onClick={() => setActiveCatMenuId(null)} 
                          />
                          <div className="absolute right-0 top-7 z-[60] w-36 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-xl p-1 text-[12px] animate-in fade-in zoom-in-95 duration-150">
                            <button
                              onClick={() => {
                                setRenamingCategory(cat);
                                setRenameInput(cat.name);
                                setActiveCatMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[5px] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors text-left"
                            >
                              <Edit3 size={13} strokeWidth={1.5} />
                              <span>Rename</span>
                            </button>
                            {!cat.isSystem && (
                              <button
                                onClick={() => {
                                  setDeletingCategory(cat);
                                  setActiveCatMenuId(null);
                                }}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[5px] text-red-400 hover:bg-red-500/10 transition-colors text-left"
                              >
                                <Trash2 size={13} strokeWidth={1.5} />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* --- TABLE VIEW --- */
            <div className="bg-[var(--bg-surface)] rounded-[8px] border border-[var(--border-default)] shadow-none">
              
              {/* Cloudflare-Style Bulk Selection Bar */}
              {selectedCategoryIds.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-subtle)] border-b border-[var(--border-default)] text-[12px] animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-[var(--text-primary)]">
                      {selectedCategoryIds.length} {selectedCategoryIds.length === 1 ? 'category' : 'categories'} selected
                    </span>
                    <button
                      onClick={() => setSelectedCategoryIds([])}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline transition-colors cursor-pointer text-[11.5px]"
                    >
                      Cancel selection
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedCategoryIds.length > 1 && (
                      <button
                        onClick={() => setIsMergeModalOpen(true)}
                        className="px-2.5 py-1 rounded-[6px] text-[11.5px] font-medium text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                      >
                        Merge selected
                      </button>
                    )}
                    <button
                      onClick={() => setIsBatchDeleteModalOpen(true)}
                      className="px-2.5 py-1 rounded-[6px] text-[11.5px] font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      Delete selected ({selectedCategoryIds.length})
                    </button>
                  </div>
                </div>
              )}

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-surface)] text-[10.5px] font-medium text-[var(--text-muted)] uppercase tracking-[0.06em]">
                    {selectedCategoryIds.length > 0 && (
                      <th className="px-4 py-2 w-10 leading-tight">
                        <GlassCheckbox 
                          checked={data.categories?.length > 0 && selectedCategoryIds.length === data.categories?.length}
                          onChange={selectAllCategories}
                        />
                      </th>
                    )}
                    <th 
                      className="px-4 py-2 cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none leading-tight"
                      onClick={() => handleCatSort('type')}
                    >
                      <div className="flex items-center gap-1.5">
                        Type {catSortKey === 'type' && (catSortDirection === 'asc' ? <ArrowUp size={11}/> : <ArrowDown size={11}/>)}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-2 cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none leading-tight"
                      onClick={() => handleCatSort('name')}
                    >
                      <div className="flex items-center gap-1.5">
                        Category Name {catSortKey === 'name' && (catSortDirection === 'asc' ? <ArrowUp size={11}/> : <ArrowDown size={11}/>)}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-2 cursor-pointer hover:text-[var(--text-primary)] transition-colors select-none leading-tight"
                      onClick={() => handleCatSort('volume')}
                    >
                      <div className="flex items-center gap-1.5">
                        Total Volume {catSortKey === 'volume' && (catSortDirection === 'asc' ? <ArrowUp size={11}/> : <ArrowDown size={11}/>)}
                      </div>
                    </th>
                    <th className="px-4 py-2 text-right select-none leading-tight">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)] text-[12px]">
                  {sortedCategories
                    .slice((catCurrentPage - 1) * CAT_PAGE_SIZE, catCurrentPage * CAT_PAGE_SIZE)
                    .map((cat: CategoryItem, idx: number, arr: CategoryItem[]) => {
                    const isIncome = cat.type === TransactionType.INCOME;
                    const isSelected = selectedCategoryIds.includes(cat.id);
                    const stats = categoryStats[cat.name] || { count: 0, total: 0 };
                    const isMenuOpen = activeCatMenuId === cat.id;
                    const openUpwards = idx >= Math.max(1, arr.length - 2);

                    return (
                      <tr 
                        key={cat.id} 
                        className={`hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer ${
                          isSelected ? 'bg-[var(--bg-surface-hover)]/70' : ''
                        }`}
                      >
                        {selectedCategoryIds.length > 0 && (
                          <td className="px-4 py-2 leading-tight w-10">
                            <GlassCheckbox 
                              checked={isSelected}
                              onChange={() => toggleSelectCategory(cat.id)}
                            />
                          </td>
                        )}
                        <td className="px-4 py-2 leading-tight">
                          <div className="flex items-center gap-2">
                            {isIncome ? (
                              <ArrowUpRight size={13} strokeWidth={1.5} className="shrink-0 text-[var(--status-success-fg)]" />
                            ) : (
                              <ArrowDownRight size={13} strokeWidth={1.5} className="shrink-0 text-[var(--status-error-fg)]" />
                            )}
                            <span className="text-[10.5px] font-mono uppercase tracking-[0.04em] text-[var(--text-secondary)]">
                              {cat.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 leading-tight">
                          <span className="font-medium text-[var(--text-primary)] tracking-tight">{cat.name}</span>
                        </td>
                        <td className="px-4 py-2 leading-tight">
                          <div className="text-[12px] font-mono flex items-center gap-2">
                            <span className="text-[var(--text-primary)] font-medium">
                              {formatMoney(stats.total, data.settings.currencySymbol)}
                            </span>
                            <span className="text-[10.5px] text-[var(--text-muted)] font-normal">
                              ({stats.count} {stats.count === 1 ? 'entry' : 'entries'})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right leading-tight">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() => setActiveCatMenuId(isMenuOpen ? null : cat.id)}
                              className="w-6 h-6 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[4px] hover:bg-[var(--bg-surface-hover)] inline-flex items-center justify-center transition-colors cursor-pointer"
                              title="Actions"
                            >
                              <DotsThree size={16} weight="bold" />
                            </button>

                            {/* Context Menu Dropdown */}
                            {isMenuOpen && (
                              <>
                                <div 
                                  className="fixed inset-0 z-[50]" 
                                  onClick={() => setActiveCatMenuId(null)} 
                                />
                                <div className={`absolute right-0 z-[60] w-36 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[6px] shadow-[0_8px_24px_rgba(0,0,0,0.5)] p-1 text-[12px] animate-in fade-in zoom-in-95 duration-100 ${openUpwards ? 'bottom-8' : 'top-7'}`}>
                                  {/* Select / Deselect Action */}
                                  <button
                                    onClick={() => {
                                      toggleSelectCategory(cat.id);
                                      setActiveCatMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors text-left cursor-pointer"
                                  >
                                    <CheckSquare size={13} strokeWidth={1.5} />
                                    <span>{isSelected ? 'Deselect' : 'Select'}</span>
                                  </button>

                                  <button
                                    onClick={() => {
                                      setRenamingCategory(cat);
                                      setRenameInput(cat.name);
                                      setActiveCatMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors text-left cursor-pointer"
                                  >
                                    <Edit3 size={13} strokeWidth={1.5} />
                                    <span>Rename</span>
                                  </button>
                                  {!cat.isSystem && (
                                    <button
                                      onClick={() => {
                                        setDeletingCategory(cat);
                                        setActiveCatMenuId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] text-[var(--status-error-fg)] hover:bg-red-500/10 transition-colors text-left cursor-pointer"
                                    >
                                      <Trash2 size={13} strokeWidth={1.5} />
                                      <span>Delete</span>
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <TablePaginationFooter
                currentPage={catCurrentPage}
                totalPages={Math.ceil(sortedCategories.length / CAT_PAGE_SIZE) || 1}
                totalItems={sortedCategories.length}
                pageSize={CAT_PAGE_SIZE}
                onPageChange={setCatCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* --- FLOATING BATCH ACTION BAR FOR CATEGORIES --- */}
      {selectedCategoryIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[5000] animate-in slide-in-from-bottom-6 duration-300">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-2xl px-5 py-3 rounded-[10px] flex items-center gap-5 text-[13px]">
            <span className="font-medium text-[var(--text-primary)]">
              {selectedCategoryIds.length} categor{selectedCategoryIds.length === 1 ? 'y' : 'ies'} selected
            </span>
            <div className="h-4 w-px bg-[var(--border-default)]" />
            <div className="flex items-center gap-2">
              {/* Merge option available if 2+ selected */}
              {selectedCategoryIds.length >= 2 && (
                <button
                  onClick={openMergeModal}
                  className="btn btn-secondary flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] font-medium text-[12px] transition-all"
                >
                  <GitMerge size={14} strokeWidth={1.5} />
                  <span>Merge selected</span>
                </button>
              )}

              <button
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-medium text-[12px] transition-all"
              >
                <Trash2 size={14} strokeWidth={1.5} />
                <span>Delete selected</span>
              </button>

              <button
                onClick={() => setSelectedCategoryIds([])}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all ml-1"
                title="Clear selection"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: Rename Category --- */}
      {renamingCategory && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setRenamingCategory(null)} 
            aria-hidden="true"
          />
          <div 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="rename-cat-title"
            className="relative w-full max-w-[420px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <h3 id="rename-cat-title" className="text-base font-semibold text-[var(--text-primary)]">Rename Category</h3>
              <button 
                onClick={() => setRenamingCategory(null)}
                className="btn btn--outline btn--icon-sm shrink-0"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[var(--text-primary)]">Category Name</label>
              <input 
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full h-[40px] bg-[var(--field-bg)] rounded-[6px] px-3.5 text-[14px] text-[var(--text-primary)] border border-[var(--field-border)] outline-none transition-all"
                autoFocus
              />
              <p className="text-[11px] text-[var(--text-muted)]">All previous transaction entries in this category will be updated automatically.</p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRenamingCategory(null)}
                className="btn btn--outline h-[38px] px-4 text-[13px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameCategory}
                disabled={!renameInput.trim()}
                className="btn btn--primary h-[38px] px-5 text-[13px]"
              >
                Save Name
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL: Merge Categories --- */}
      {isMergeModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setIsMergeModalOpen(false)} 
            aria-hidden="true"
          />
          <div 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="merge-cat-title"
            className="relative w-full max-w-[460px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <h3 id="merge-cat-title" className="text-base font-semibold text-[var(--text-primary)]">Merge Categories</h3>
              <button 
                onClick={() => setIsMergeModalOpen(false)}
                className="btn btn--outline btn--icon-sm shrink-0"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                Merging <strong className="text-[var(--text-primary)] font-semibold">{selectedCategoryIds.length} categories</strong> into one. All historical transactions will be consolidated under the target category name.
              </p>

              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[var(--text-primary)]">Target Category Name</label>
                
                {/* Radio choices from existing selected categories */}
                <div className="space-y-2">
                  {selectedCategoriesList.map((cat) => (
                    <label 
                      key={cat.id} 
                      className={`flex items-center justify-between p-3 rounded-[8px] border cursor-pointer transition-all ${
                        selectedMergeTarget === cat.name 
                          ? 'border-[var(--accent)] bg-[var(--accent-bg-soft)] text-[var(--text-primary)]' 
                          : 'border-[var(--border-default)] bg-[var(--bg-subtle)]/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input 
                          type="radio" 
                          name="mergeTarget" 
                          checked={selectedMergeTarget === cat.name}
                          onChange={() => setSelectedMergeTarget(cat.name)}
                          className="accent-[#F6821F]"
                        />
                        <span className="text-[13px] font-medium">{cat.name}</span>
                      </div>
                      <span className="text-[11px] font-mono text-[var(--text-muted)]">Keep existing</span>
                    </label>
                  ))}

                  {/* Option for custom new category name */}
                  <label 
                    className={`flex items-center gap-2.5 p-3 rounded-[8px] border cursor-pointer transition-all ${
                      selectedMergeTarget === 'CUSTOM' 
                        ? 'border-[var(--accent)] bg-[var(--accent-bg-soft)] text-[var(--text-primary)]' 
                        : 'border-[var(--border-default)] bg-[var(--bg-subtle)]/50 text-[var(--text-secondary)]'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name="mergeTarget" 
                      checked={selectedMergeTarget === 'CUSTOM'}
                      onChange={() => setSelectedMergeTarget('CUSTOM')}
                      className="accent-[#F6821F]"
                    />
                    <span className="text-[13px] font-medium">Create a new merged category name...</span>
                  </label>

                  {selectedMergeTarget === 'CUSTOM' && (
                    <input
                      type="text"
                      placeholder="Enter new category name..."
                      value={customMergedName}
                      onChange={(e) => setCustomMergedName(e.target.value)}
                      className="w-full h-[40px] bg-[var(--field-bg)] rounded-[6px] px-3.5 text-[14px] text-[var(--text-primary)] border border-[var(--field-border)] outline-none transition-all mt-2"
                      autoFocus
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                className="btn btn--outline h-[32px] px-3.5 text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMerge}
                disabled={selectedMergeTarget === 'CUSTOM' && !customMergedName.trim()}
                className="btn btn--primary h-[32px] px-4 text-[12px]"
              >
                Merge Categories
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL: Batch Delete Categories Confirmation --- */}
      {isBatchDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setIsBatchDeleteModalOpen(false)} 
            aria-hidden="true"
          />
          <div 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="batch-delete-cat-title"
            className="relative w-full max-w-[420px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <h3 id="batch-delete-cat-title" className="text-base font-semibold text-[var(--text-primary)]">Delete Selected Categories</h3>
              <button 
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="btn btn--outline btn--icon-sm shrink-0"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-2 py-1">
              <p className="text-[14px] font-medium text-[var(--text-primary)]">
                Delete <strong className="text-white font-semibold">{selectedCategoryIds.length} categories</strong>?
              </p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                This action cannot be undone. All previous transactions associated with these categories will be put under <strong className="text-[var(--text-primary)] font-semibold">Miscellaneous</strong>.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="btn btn--outline h-[30px] px-3 text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchDeleteCategories}
                className="btn btn--danger h-[30px] px-3.5 text-[12px]"
              >
                Delete Categories
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL: Add / Edit Budget --- */}
      {isAddBudgetModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setIsAddBudgetModalOpen(false)} 
            aria-hidden="true"
          />
          <div 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="add-budget-title"
            className="relative w-full max-w-[460px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <h3 id="add-budget-title" className="text-base font-semibold text-[var(--text-primary)]">
                {editingCat ? 'Edit Budget' : 'Add a Budget'}
              </h3>
              <button 
                onClick={() => setIsAddBudgetModalOpen(false)}
                className="btn btn--outline btn--icon-sm shrink-0"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[var(--text-primary)]">Target Category</label>
                <GlassSelect
                  value={budgetCat}
                  onChange={setBudgetCat}
                  options={availableForBudget}
                  placeholder="Choose category..."
                  disabled={!!editingCat}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[var(--text-primary)]">Budget Cycle</label>
                <div className="tabs flex">
                  <button 
                    type="button"
                    onClick={() => setBudgetPeriod('DAILY')}
                    className={`tab flex-1 justify-center ${budgetPeriod === 'DAILY' ? 'is-active' : ''}`}
                  >
                    Daily Limit
                  </button>
                  <button 
                    type="button"
                    onClick={() => setBudgetPeriod('MONTHLY')}
                    className={`tab flex-1 justify-center ${budgetPeriod === 'MONTHLY' ? 'is-active' : ''}`}
                  >
                    Monthly Limit
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[var(--text-primary)]">Budget Limit ({data.settings.currencySymbol})</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={budgetLimit}
                  onChange={(e) => setBudgetLimit(e.target.value)}
                  className="w-full h-[36px] bg-[var(--field-bg)] rounded-[6px] px-3 text-[13px] text-[var(--text-primary)] border border-[var(--field-border)] outline-none transition-all font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsAddBudgetModalOpen(false)}
                className="btn btn--outline h-[32px] px-3.5 text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBudget}
                disabled={!budgetCat || !budgetLimit}
                className="btn btn--primary h-[32px] px-4 text-[12px]"
              >
                {editingCat ? 'Update Budget' : 'Save Budget'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL: Add Category --- */}
      {isAddCategoryModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setIsAddCategoryModalOpen(false)} 
            aria-hidden="true"
          />
          <div 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="add-cat-title"
            className="relative w-full max-w-[460px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <h3 id="add-cat-title" className="text-base font-semibold text-[var(--text-primary)]">Add a Category</h3>
              <button 
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="btn btn--outline btn--icon-sm shrink-0"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[var(--text-primary)]">Category Name</label>
                <input
                  type="text"
                  placeholder="Category label..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full h-[36px] bg-[var(--field-bg)] rounded-[6px] px-3 text-[13px] text-[var(--text-primary)] border border-[var(--field-border)] outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[var(--text-primary)]">Transaction Type</label>
                <div className="tabs flex">
                  <button
                    type="button"
                    onClick={() => setNewCatType(TransactionType.EXPENSE)}
                    className={`tab flex-1 justify-center ${newCatType === TransactionType.EXPENSE ? 'is-active text-rose-400' : ''}`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCatType(TransactionType.INCOME)}
                    className={`tab flex-1 justify-center ${newCatType === TransactionType.INCOME ? 'is-active text-emerald-400' : ''}`}
                  >
                    Income
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[var(--text-primary)]">Theme Color</label>
                <div className="grid grid-cols-5 gap-2 pt-1">
                  {COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCatColor(c)}
                      className={`w-full aspect-square rounded-[6px] border transition-all ${
                        newCatColor === c ? 'border-white scale-110 shadow-md' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="btn btn--outline h-[32px] px-3.5 text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={!newCatName}
                className="btn btn--primary h-[32px] px-4 text-[12px]"
              >
                Create category
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- MODAL: Delete Category Confirmation --- */}
      {deletingCategory && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={() => setDeletingCategory(null)} 
            aria-hidden="true"
          />
          <div 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="delete-cat-title"
            className="relative w-full max-w-[420px] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <h3 id="delete-cat-title" className="text-base font-semibold text-[var(--text-primary)]">Delete Category</h3>
              <button 
                onClick={() => setDeletingCategory(null)}
                className="btn btn--outline btn--icon-sm shrink-0"
              >
                <X size={15} strokeWidth={1.5} />
              </button>
            </div>

            <div className="space-y-2 py-1">
              <p className="text-[14px] font-medium text-[var(--text-primary)]">
                Delete category <strong className="text-white font-semibold">"{deletingCategory.name}"</strong>?
              </p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {deletingHasData ? (
                  <span>This action cannot be undone. All previous transactions associated with this category will be put under <strong className="text-[var(--text-primary)] font-semibold">Miscellaneous</strong>.</span>
                ) : (
                  <span>This action cannot be undone.</span>
                )}
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="btn btn--outline h-[30px] px-3 text-[12px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                className="btn btn--danger h-[30px] px-3.5 text-[12px]"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export const FinancialEnforcementManager = BudgetSettings;
