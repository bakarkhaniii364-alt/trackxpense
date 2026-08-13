import React from 'react';

export interface SubTabOption<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

interface SegmentedSubTabsProps<T extends string> {
  tabs: SubTabOption<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  className?: string;
}

export function SegmentedSubTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  className = '',
}: SegmentedSubTabsProps<T>) {
  return (
    <div className={`tabs ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`tab ${isActive ? 'is-active' : ''}`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-black/30 text-[var(--ds-text)]'
                    : 'bg-white/5 text-[var(--ds-text-faint)]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
