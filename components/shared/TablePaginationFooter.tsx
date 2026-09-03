import React from 'react';
import {
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  CaretDoubleLeft as ChevronsLeft,
  CaretDoubleRight as ChevronsRight,
  Download
} from '@phosphor-icons/react';

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
  const safeTotalPages = Math.max(1, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-[var(--bg-surface)] border-t border-[var(--border-default)] text-[12px] text-[var(--text-secondary)] select-none rounded-b-[10px]">
      {/* Left Info Section */}
      <div className="flex items-center gap-3">
        <span>
          Showing <strong className="font-semibold text-[var(--text-primary)]">{startItem}-{endItem}</strong> of <strong className="font-semibold text-[var(--text-primary)]">{totalItems}</strong>
        </span>

        <span className="text-[var(--border-default)]">|</span>

        <span>
          Page <strong className="font-semibold text-[var(--text-primary)]">{currentPage}</strong> of <strong className="font-semibold text-[var(--text-primary)]">{safeTotalPages}</strong>
        </span>

        {onExportCSV && (
          <>
            <span className="text-[var(--border-default)]">|</span>
            <button
              onClick={onExportCSV}
              className="btn btn--secondary flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium text-[var(--text-primary)] hover:text-white transition-all cursor-pointer"
            >
              <Download size={12} strokeWidth={1.5} />
              <span>Export CSV</span>
            </button>
          </>
        )}
      </div>

      {/* Right Controls Section */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-1 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          title="First page"
        >
          <ChevronsLeft size={14} strokeWidth={1.5} />
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          title="Previous page"
        >
          <ChevronLeft size={14} strokeWidth={1.5} />
        </button>

        <span className="px-2.5 py-1 text-[11px] font-mono font-medium text-[var(--text-primary)] bg-[var(--bg-page)] border border-[var(--border-default)] rounded-[6px]">
          {currentPage} / {safeTotalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= safeTotalPages}
          className="p-1 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          title="Next page"
        >
          <ChevronRight size={14} strokeWidth={1.5} />
        </button>

        <button
          onClick={() => onPageChange(safeTotalPages)}
          disabled={currentPage >= safeTotalPages}
          className="p-1 rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          title="Last page"
        >
          <ChevronsRight size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};
