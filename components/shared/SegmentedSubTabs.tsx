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
    <div
      className={`inline-flex items-center gap-1 bg-[var(--bg-subtle)]/70 border border-[var(--border-default)] p-1 rounded-[8px] ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-3 py-1.5 rounded-[6px] text-[13px] font-medium transition-all flex items-center gap-2 select-none ${
              isActive
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] shadow-xs font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
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
