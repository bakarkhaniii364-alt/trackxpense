import React from 'react';
import {
  CaretLeft,
  CaretRight,
  CaretDoubleLeft,
  CaretDoubleRight,
  Download
} from '@phosphor-icons/react';
import { Haptics } from '../../services/haptics';

interface TablePaginationFooterProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onExportCSV?: () => void;
}

export const TablePaginationFooter: React.FC<TablePaginationFooterProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  onExportCSV,
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-2.5 bg-[var(--bg-surface)] border-t border-[var(--border-default)] text-[13px] text-[var(--text-secondary)] select-none rounded-b-[8px] whitespace-nowrap">
      {/* Left: Record Range Readout */}
      <div className="text-[12.5px] sm:text-[13px] text-[var(--text-secondary)] truncate">
        <span className="hidden sm:inline">Showing </span>
        <span className="font-medium text-[var(--text-primary)] font-mono">{startItem}–{endItem}</span> of <span className="font-medium text-[var(--text-primary)] font-mono">{totalItems}</span>
        <span className="hidden sm:inline"> records</span>
      </div>

      {/* Right: Navigation Controls */}
      <div className="flex items-center gap-1 shrink-0">
          {totalPages > 2 && (
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => {
                Haptics.light();
                onPageChange(1);
              }}
              title="First page"
              className="h-7 w-7 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center cursor-pointer transition-colors"
            >
              <CaretDoubleLeft size={13} strokeWidth={1.5} />
            </button>
          )}

          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => {
              Haptics.light();
              onPageChange(Math.max(1, currentPage - 1));
            }}
            title="Previous page"
            className="h-7 px-2.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 cursor-pointer transition-colors text-[12.5px] font-medium"
          >
            <CaretLeft size={13} strokeWidth={1.5} />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Page Indicator Pill */}
          <div className="h-7 px-2.5 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[12px] font-mono flex items-center justify-center text-[var(--text-muted)]">
            <span className="text-[var(--text-primary)] font-medium">{currentPage}</span>
            <span className="mx-1">/</span>
            <span>{Math.max(1, totalPages)}</span>
          </div>

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => {
              Haptics.light();
              onPageChange(Math.min(totalPages, currentPage + 1));
            }}
            title="Next page"
            className="h-7 px-2.5 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 cursor-pointer transition-colors text-[12.5px] font-medium"
          >
            <span className="hidden sm:inline">Next</span>
            <CaretRight size={13} strokeWidth={1.5} />
          </button>

        {totalPages > 2 && (
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => {
              Haptics.light();
              onPageChange(totalPages);
            }}
            title="Last page"
            className="h-7 w-7 rounded-[6px] bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center cursor-pointer transition-colors"
          >
            <CaretDoubleRight size={13} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
};
