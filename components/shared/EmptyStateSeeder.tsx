import React from 'react';
import {
  Sparkle as Sparkles,
  Plus,
  Database
} from '@phosphor-icons/react';
import { AppData } from '../../types';
import { seedSampleData } from '../../utils/sampleDataSeeder';
import { Haptics } from '../../services/haptics';

interface EmptyStateSeederProps {
  title?: string;
  description?: string;
  data: AppData;
  updateData: (d: Partial<AppData>) => void;
  onActionClick?: () => void;
  actionLabel?: string;
  compact?: boolean;
}

export const EmptyStateSeeder: React.FC<EmptyStateSeederProps> = ({
  title = 'No Records Found',
  description = 'You have not added any entries yet. Seed pre-populated demo data to explore all features, or create your first entry manually.',
  data,
  updateData,
  onActionClick,
  actionLabel = 'Add Entry',
  compact = false
}) => {
  const handleSeed = () => {
    Haptics.success();
    seedSampleData(data, updateData);
  };

  return (
    <div className={`w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[10px] ${compact ? 'p-5' : 'p-8'} flex flex-col items-center text-center`}>
      {/* Icon standing freely without container box per design rules */}
      <Sparkles size={compact ? 22 : 28} className="text-[var(--text-muted)] stroke-[1.5px] mb-3" />
      
      <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)] mb-1">
        GET STARTED
      </span>

      <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-1.5">
        {title}
      </h3>

      <p className="text-[13px] text-[var(--text-secondary)] max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2.5 w-full max-w-xs">
        <button
          type="button"
          onClick={handleSeed}
          className="btn btn--primary flex-1 h-[36px] px-3.5 text-[13px]"
        >
          <Database size={15} className="stroke-[1.5px]" />
          <span>Seed Demo Data</span>
        </button>

        {onActionClick && (
          <button
            type="button"
            onClick={() => {
              Haptics.light();
              onActionClick();
            }}
            className="btn btn--secondary flex-1 h-[36px] px-3.5 text-[13px]"
          >
            <Plus size={15} className="stroke-[1.5px]" />
            <span>{actionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
