import React, { useState, useEffect } from 'react';
import { AppData } from '../../types';
import { Bell, AlertTriangle } from 'lucide-react';
import { CURRENCIES } from '../shared/CommonUI';

interface SettingsManagerProps {
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  isCompact?: boolean;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ 
  data, 
  updateData, 
  isCompact = false 
}) => {
  const [localSettings, setLocalSettings] = useState(data.settings);

  useEffect(() => {
    updateData({ settings: localSettings });
  }, [localSettings]);

  const toggleNotification = async (type: 'expense' | 'debt') => {
    const currentVal =
      type === 'expense' ? localSettings.expenseReminders : localSettings.debtReminders;
    
    // Safety check for browser support if needed, but keeping it simple for web deployment
    setLocalSettings((prev) => ({
      ...prev,
      [type === 'expense' ? 'expenseReminders' : 'debtReminders']: !currentVal,
    }));
  };

  return (
    <div className={`space-y-6 ${isCompact ? '' : 'w-full mx-auto pb-10'}`}>
      {!isCompact && (
        <div>
          <h2 className="text-2xl font-bold text-main tracking-tight">App Settings</h2>
          <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">Currency and notification settings</p>
        </div>
      )}

      <div className={`grid grid-cols-1 ${isCompact ? 'gap-4' : 'md:grid-cols-2 gap-5'}`}>
        <div className="liquid-glass p-6 rounded-md shadow-xl space-y-5">
          <p className="text-[9px] uppercase font-black text-muted/40 tracking-[0.2em]">Currency Settings</p>
          <div className="grid grid-cols-2 gap-2">
            {CURRENCIES.map((curr) => (
              <button
                key={curr.value}
                onClick={() => setLocalSettings({ ...localSettings, currencySymbol: curr.symbol })}
                className={`p-3 rounded-md flex items-center justify-between border transition-all ${
                  localSettings.currencySymbol === curr.symbol
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : 'bg-black/20 border-transparent text-muted hover:border-white/10'
                }`}
              >
                <span className="text-[11px] font-bold">{curr.value}</span>
                <span className="font-mono text-xs opacity-50">{curr.symbol}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="liquid-glass p-6 rounded-md shadow-xl space-y-6">
          <p className="text-[9px] uppercase font-black text-muted/40 tracking-[0.2em]">Notification Settings</p>

          <div className="space-y-3">
            {[
              { id: 'expense' as const, label: 'Expense Reminders', icon: Bell, active: localSettings.expenseReminders },
              {
                id: 'debt' as const,
                label: 'Payment Reminders',
                icon: AlertTriangle,
                active: localSettings.debtReminders,
              },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => toggleNotification(sub.id)}
                className="w-full p-4 bg-black/20 rounded-sm border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-sm transition-colors border ${
                      sub.active
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-white/5 border-white/5 text-muted/40'
                    }`}
                  >
                    <sub.icon size={14} />
                  </div>
                  <span className="text-[11px] font-bold text-main">{sub.label}</span>
                </div>
                <div
                  className={`w-8 h-4 rounded-full relative transition-colors ${
                    sub.active ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                      sub.active ? 'left-4.5' : 'left-0.5'
                    }`}
                  />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
