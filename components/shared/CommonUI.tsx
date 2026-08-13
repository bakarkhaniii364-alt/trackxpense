import React from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Haptics } from '../../services/haptics';

export const COLOR_PRESETS = [
  '#5e5ce6', // Indigo
  '#32d74b', // Green
  '#ff453a', // Red
  '#ff9f0a', // Orange
  '#0a84ff', // Blue
  '#bf5af2', // Purple
  '#ff375f', // Pink
  '#64d2ff', // Cyan
  '#ac8e68', // Brown
  '#98989d', // Gray
];

export const CURRENCIES = [
  { value: 'BDT', label: 'Bangladeshi Taka', symbol: '৳' },
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
];

interface CustomConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isDanger?: boolean;
}

export const CustomConfirmModal: React.FC<CustomConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isDanger,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-[var(--bg-surface)] w-full max-w-[380px] rounded-[12px] p-6 border border-[var(--border-default)] shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle size={32} strokeWidth={1.5} className={isDanger ? "text-red-500 mb-3" : "text-[#2563EB] mb-3"} />
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-6 leading-relaxed">{message}</p>
          <div className="flex gap-2.5 w-full">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-[36px] rounded-[8px] border border-[var(--border-default)] text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 h-[36px] rounded-[8px] text-white text-[13px] font-medium transition-all shadow-xs ${
                isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#2563EB] hover:bg-blue-600'
              }`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Glass Select ---
import { ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';

interface GlassSelectProps {
    value: string;
    onChange: (val: string) => void;
    options: { label: string; value: string }[] | string[];
    placeholder?: string;
    className?: string;
}

export const GlassSelect: React.FC<GlassSelectProps> = ({ value, onChange, options, placeholder, className = "" }) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 });

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updateCoords = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    };

    React.useEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener('resize', updateCoords);
            window.addEventListener('scroll', updateCoords, true);
        }
        return () => {
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
        };
    }, [isOpen]);

    const formattedOptions = options.map(opt => typeof opt === 'string' ? { label: opt, value: opt } : opt);
    const selectedOption = formattedOptions.find(o => o.value === value);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-black/20 rounded-md px-4 py-3 text-xs text-main border border-white/5 outline-none flex items-center justify-between hover:bg-black/30 transition-all focus:border-primary/40"
            >
                <span className={!selectedOption ? "text-muted/40" : "text-main font-bold"}>
                    {selectedOption ? selectedOption.label : placeholder || "Select..."}
                </span>
                <ChevronDown size={14} className={`text-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && createPortal(
                <div 
                    className="fixed z-[9999] liquid-glass border border-white/10 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] py-2 animate-in fade-in zoom-in-95 slide-in-from-top-2 overflow-hidden max-h-[250px] overflow-y-auto no-scrollbar"
                    style={{ 
                        top: coords.top + 8, 
                        left: coords.left, 
                        width: coords.width 
                    }}
                >
                    {formattedOptions.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-2.5 text-left text-xs transition-colors hover:bg-primary/20 ${value === opt.value ? 'bg-primary/10 text-primary font-black' : 'text-muted'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                    {formattedOptions.length === 0 && (
                        <div className="px-4 py-3 text-[10px] text-muted italic opacity-50 text-center">No options available</div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

// --- Glass Date Input ---
import { Calendar } from 'lucide-react';

interface GlassDateInputProps {
    value: string;
    onChange: (val: string) => void;
    className?: string;
}

    export const GlassDateInput: React.FC<GlassDateInputProps> = ({ value, onChange, className = "" }) => {
        return (
            <div className={`relative bg-black/20 rounded-md px-4 py-3 border border-white/5 focus-within:border-primary/40 transition-colors flex items-center gap-3 ${className}`}>
                <Calendar size={14} className="text-muted/50" />
                <input 
                    type="date" 
                    value={value} 
                    onChange={e => onChange(e.target.value)} 
                    className="bg-transparent text-[10px] font-bold text-main w-full outline-none uppercase cursor-pointer" 
                />
            </div>
        );
    };

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  className = "",
}) => {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePrev = () => {
    if (currentPage > 1) {
      Haptics.light();
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      Haptics.light();
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    if (page !== currentPage) {
      Haptics.light();
      onPageChange(page);
    }
  };

  const getPagesRange = () => {
    const delta = 1;
    const range = [];
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      range.unshift('...');
    }
    if (currentPage + delta < totalPages - 1) {
      range.push('...');
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-white/5 mt-4 ${className}`}>
      <span className="text-[10px] text-muted/40 font-bold uppercase tracking-wider">
        Showing {startItem}–{endItem} of {totalItems} records
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 text-muted hover:text-main flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-90"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5">
          {getPagesRange().map((page, idx) => {
            if (page === '...') {
              return (
                <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-muted/40 font-bold">
                  ...
                </span>
              );
            }
            const isSelected = page === currentPage;
            return (
              <button
                key={`page-${page}`}
                onClick={() => handlePageClick(page as number)}
                className={`w-8 h-8 rounded-md text-[10px] font-black transition-all flex items-center justify-center ${
                  isSelected
                    ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105 border border-white/10'
                    : 'text-muted/60 hover:text-main hover:bg-white/5'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 text-muted hover:text-main flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-90"
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

// --- Glass Checkbox (Project Design System) ---
interface GlassCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  id?: string;
}

export const GlassCheckbox: React.FC<GlassCheckboxProps> = ({ checked, onChange, className = '', id }) => {
  return (
    <button
      type="button"
      id={id}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
        checked
          ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-xs'
          : 'bg-[var(--bg-surface)] border-[var(--border-strong)] hover:border-[var(--text-secondary)] text-transparent'
      } ${className}`}
    >
      <Check size={11} strokeWidth={2.5} className={checked ? 'opacity-100' : 'opacity-0'} />
    </button>
  );
};

