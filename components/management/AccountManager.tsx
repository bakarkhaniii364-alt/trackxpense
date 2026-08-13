import React, { useState } from 'react';
import { AppData } from '../../types';
import { FieldHelp } from '../pc/FieldHelp';

interface AccountManagerProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  isCompact?: boolean;
}

export const AccountManager: React.FC<AccountManagerProps> = ({ 
  data, 
  updateData, 
  isCompact = false 
}) => {
  const [localProfile, setLocalProfile] = useState(data.profile);

  const handleSave = () => {
    updateData({ profile: localProfile });
  };

  return (
    <div className={`space-y-6 ${isCompact ? '' : 'w-full mx-auto pb-10'}`}>
      {!isCompact && (
        <div>
          <h2 className="text-2xl font-bold text-main tracking-tight">Identity Control</h2>
          <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Personnel Calibration Console</p>
        </div>
      )}

      <div className="liquid-glass p-6 rounded-md shadow-xl space-y-6">
        <div className={`grid grid-cols-1 ${isCompact ? 'gap-4' : 'md:grid-cols-3 gap-6'}`}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[9px] uppercase font-black text-muted/40 tracking-[0.2em]">Personnel ID</label>
              <FieldHelp text="The primary identifier for this financial profile." />
            </div>
            <input
              type="text"
              value={localProfile.name}
              onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
              className="w-full bg-black/20 rounded-md px-4 py-3 text-xs text-main border border-white/5 focus:border-primary/40 outline-none transition-all font-bold"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[9px] uppercase font-black text-muted/40 tracking-[0.2em]">Monthly Threshold</label>
              <FieldHelp text="Aggregate spending limit for the active 30-day cycle." />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 font-black text-[9px]">
                {data.settings.currencySymbol}
              </span>
              <input
                type="number"
                value={localProfile.monthlyGoal}
                onChange={(e) =>
                  setLocalProfile({ ...localProfile, monthlyGoal: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-black/20 rounded-md pl-10 pr-4 py-3 text-xs text-main border border-white/5 focus:border-primary/40 outline-none transition-all font-bold"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[9px] uppercase font-black text-muted/40 tracking-[0.2em]">Daily Ceiling</label>
              <FieldHelp text="24-hour spending constraint. Alerts active upon violation." />
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/30 font-black text-[9px]">
                {data.settings.currencySymbol}
              </span>
              <input
                type="number"
                placeholder="Zero-cap..."
                value={localProfile.dailyGoal || ''}
                onChange={(e) =>
                  setLocalProfile({ ...localProfile, dailyGoal: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-black/20 rounded-md pl-10 pr-4 py-3 text-xs text-main border border-white/5 focus:border-primary/40 outline-none transition-all font-bold"
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex justify-end">
          <button
            onClick={handleSave}
            className="bg-primary text-white px-8 py-3 rounded-md font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            Commit Changes
          </button>
        </div>
      </div>
    </div>
  );
};
