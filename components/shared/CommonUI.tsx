import React from 'react';
import { createPortal } from 'react-dom';
import {
  Warning as AlertTriangle,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  Check,
  Calendar
} from '@phosphor-icons/react';
import { Haptics } from '../../services/haptics';
import { CustomSelect } from './CustomSelect';
export { CustomSelect };

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

/* =========================================================================
   Unified 4-Tier Button Component
   Tier 1: 'primary'   (Single main confirming / primary action)
   Tier 2: 'secondary' (Everyday utility / standard actions)
   Tier 3: 'outline'   (Quiet actions, cancel, secondary choice)
   Tier 4: 'ghost'     (Ghost actions, dismiss, icon buttons)
   Destructive: 'danger' (Wipe, reset, irreversible delete)
========================================================================= */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';
  isActive?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'secondary',
  size = 'md',
  isActive = false,
  leftIcon,
  rightIcon,
  className = '',
  children,
  onClick,
  ...props
}, ref) => {
  const variantClass = `btn--${variant}`;
  const sizeClass = `btn--${size}`;
  const activeClass = isActive ? 'is-active' : '';

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    Haptics.light();
    if (onClick) onClick(e);
  };

  return (
    <button
      ref={ref}
      onClick={handleClick}
      className={`btn ${variantClass} ${sizeClass} ${activeClass} ${className}`}
      {...props}
    >
      {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
});
Button.displayName = 'Button';

/* =========================================================================
   Unified Toggle Switch Component
========================================================================= */
export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  className = '',
  id,
  ariaLabel
}) => {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        Haptics.light();
        onChange(!checked);
      }}
      className={`toggle-switch ${checked ? 'is-active' : ''} ${className}`}
    >
      <div className="toggle-switch-thumb" />
    </button>
  );
};

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
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-[var(--bg-surface)] w-full max-w-[380px] rounded-[12px] p-6 border border-[var(--border-default)] shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle size={32} strokeWidth={1.5} className={isDanger ? "text-red-500 mb-3" : "text-[#58c4e0] mb-3"} />
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-2 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2.5 w-full pt-2">
          <button
            type="button"
            onClick={onClose}
            className="btn btn--outline flex-1 h-[38px] text-[13px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`btn flex-1 h-[38px] text-[13px] ${
              isDanger ? 'btn--danger' : 'btn--primary'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export interface GlassSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[] | string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const GlassSelect: React.FC<GlassSelectProps> = ({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  className = "", 
  disabled = false 
}) => {
  return (
    <CustomSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      size="md"
    />
  );
};

// --- Glass Date Input ---
interface GlassDateInputProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export const GlassDateInput: React.FC<GlassDateInputProps> = ({ value, onChange, className = "" }) => {
  return (
    <div className={`relative bg-[var(--field-bg)] rounded-[6px] px-3.5 py-2.5 border border-[var(--field-border)] focus-within:border-[var(--field-border-focus)] transition-colors flex items-center gap-3 ${className}`}>
      <Calendar size={14} className="text-[var(--text-muted)]" />
      <input 
        type="date" 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        className="bg-transparent text-[12px] font-medium text-[var(--text-primary)] w-full outline-none cursor-pointer" 
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
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-[var(--border-default)] mt-4 ${className}`}>
      <span className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider">
        Showing {startItem}–{endItem} of {totalItems} records
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-90"
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>

        <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-0.5 rounded-[6px] border border-[var(--border-default)]">
          {getPagesRange().map((page, idx) => {
            if (page === '...') {
              return (
                <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-[var(--text-muted)] font-medium">
                  ...
                </span>
              );
            }
            const isSelected = page === currentPage;
            return (
              <button
                key={`page-${page}`}
                onClick={() => handlePageClick(page as number)}
                className={`w-8 h-8 rounded-[5px] text-[11px] font-medium transition-all flex items-center justify-center ${
                  isSelected
                    ? 'bg-[var(--accent)] text-[var(--accent-text)] font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
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
          className="w-8 h-8 rounded-[6px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-90"
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
          ? 'bg-[var(--accent)] border-[var(--accent)] text-[var(--accent-text)] shadow-xs'
          : 'bg-[var(--bg-surface)] border-[var(--border-strong)] hover:border-[var(--text-secondary)] text-transparent'
      } ${className}`}
    >
      <Check size={11} strokeWidth={2.5} className={checked ? 'opacity-100' : 'opacity-0'} />
    </button>
  );
};
