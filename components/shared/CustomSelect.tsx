import React, { useState, useRef, useEffect } from 'react';
import { CaretDown, Check } from '@phosphor-icons/react';
import { Haptics } from '../../services/haptics';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  name?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  className = '',
  disabled = false,
  size = 'md',
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options array
  const normalizedOptions: SelectOption[] = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const sizeClasses = {
    sm: 'h-[28px] px-2.5 text-[11px]',
    md: 'h-[36px] px-3 text-[12.5px]',
    lg: 'h-[40px] px-3.5 text-[13.5px]',
  }[size];

  const toggleDropdown = () => {
    if (disabled) return;
    Haptics.light();
    setIsOpen(prev => !prev);
  };

  const handleSelect = (val: string) => {
    Haptics.light();
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div 
      ref={containerRef} 
      className={`relative select-none ${className}`}
      id={id}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 rounded-[6px] bg-[var(--field-bg)] border transition-all text-left cursor-pointer outline-none ${sizeClasses} ${
          isOpen
            ? 'border-[var(--field-border-focus)] shadow-[0_0_0_1px_var(--field-border-focus),0_0_8px_var(--field-focus-glow)] text-[var(--text-primary)]'
            : 'border-[var(--field-border)] hover:border-[var(--field-border-hover)] text-[var(--text-primary)]'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <span className="truncate font-normal flex items-center gap-2">
          {selectedOption?.icon}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        
        <CaretDown 
          size={size === 'sm' ? 12 : 14} 
          weight="regular"
          className={`text-[var(--text-muted)] transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180 text-[var(--field-border-focus)]' : ''}`} 
        />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div 
          className="absolute z-[100] top-full left-0 right-0 mt-1 min-w-[140px] max-h-[260px] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] p-1 shadow-[0_8px_24px_rgba(0,0,0,0.65),0_2px_6px_rgba(0,0,0,0.3)] animate-in fade-in zoom-in-95 duration-100 no-scrollbar"
        >
          {normalizedOptions.length === 0 ? (
            <div className="px-3 py-2 text-[12px] text-[var(--text-muted)] text-center">
              No options available
            </div>
          ) : (
            normalizedOptions.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[5px] text-left transition-colors cursor-pointer text-[12.5px] ${
                    isSelected
                      ? 'bg-[var(--accent-bg-soft)] text-[var(--accent)] font-medium'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                  }`}
                >
                  <span className="truncate flex items-center gap-2">
                    {opt.icon}
                    <span>{opt.label}</span>
                  </span>
                  {isSelected && (
                    <Check size={13} weight="bold" className="text-[var(--accent)] shrink-0 ml-2" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
