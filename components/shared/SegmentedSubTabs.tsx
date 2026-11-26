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
                className={`text-[0.9em] font-mono px-2 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-black/20 text-[var(--text-primary)]'
                    : 'bg-white/5 text-[var(--text-muted)]'
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
