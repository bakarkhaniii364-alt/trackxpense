import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Download 
} from 'lucide-react';

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
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-[#0D0D0E] border-t-[1.25px] border-[#35363C] text-[12px] text-[#A1A1AA] select-none rounded-b-[10px]">
      {/* Left Info Section */}
      <div className="flex items-center gap-3">
        <span>
          Showing <strong className="font-semibold text-[#F4F4F5]">{startItem}-{endItem}</strong> of <strong className="font-semibold text-[#F4F4F5]">{totalItems}</strong>
        </span>

        <span className="text-[#35363C]">|</span>

        <span>
          Page <strong className="font-semibold text-[#F4F4F5]">{currentPage}</strong> of <strong className="font-semibold text-[#F4F4F5]">{safeTotalPages}</strong>
        </span>

        {onExportCSV && (
          <>
            <span className="text-[#35363C]">|</span>
            <button
              onClick={onExportCSV}
              className="btn btn-secondary flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium text-[#F4F4F5] hover:text-white transition-all cursor-pointer"
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
          className="p-1 rounded-[6px] border-[1.25px] border-[#35363C] bg-[#0D0D0E] text-[#A1A1AA] hover:text-[#F4F4F5] hover:border-[#4F5056] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          title="First page"
        >
          <ChevronsLeft size={14} strokeWidth={1.5} />
        </button>

        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1 rounded-[6px] border-[1.25px] border-[#35363C] bg-[#0D0D0E] text-[#A1A1AA] hover:text-[#F4F4F5] hover:border-[#4F5056] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          title="Previous page"
        >
          <ChevronLeft size={14} strokeWidth={1.5} />
        </button>

        <span className="px-2.5 py-1 text-[11px] font-mono font-medium text-[#F4F4F5] bg-[#141417] border-[1.25px] border-[#35363C] rounded-[6px]">
          {currentPage} / {safeTotalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= safeTotalPages}
          className="p-1 rounded-[6px] border-[1.25px] border-[#35363C] bg-[#0D0D0E] text-[#A1A1AA] hover:text-[#F4F4F5] hover:border-[#4F5056] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          title="Next page"
        >
          <ChevronRight size={14} strokeWidth={1.5} />
        </button>

        <button
          onClick={() => onPageChange(safeTotalPages)}
          disabled={currentPage >= safeTotalPages}
          className="p-1 rounded-[6px] border-[1.25px] border-[#35363C] bg-[#0D0D0E] text-[#A1A1AA] hover:text-[#F4F4F5] hover:border-[#4F5056] disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          title="Last page"
        >
          <ChevronsRight size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};
