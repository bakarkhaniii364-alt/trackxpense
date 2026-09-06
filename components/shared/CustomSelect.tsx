import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown, Check, MagnifyingGlass, X } from '@phosphor-icons/react';
import { Haptics } from '../../services/haptics';

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (SelectOption | string)[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  name?: string;
  searchable?: boolean;
}

interface MenuCoords {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  openUpwards: boolean;
  maxHeight: number;
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
  searchable,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [coords, setCoords] = useState<MenuCoords | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionListRef = useRef<HTMLDivElement>(null);

  // Normalize options array
  const normalizedOptions: SelectOption[] = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const isSearchEnabled = searchable ?? (normalizedOptions.length >= 6);

  const filteredOptions = normalizedOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  // Measure and calculate position relative to trigger
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const menuDesiredHeight = 260;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpwards = spaceBelow < 220 && spaceAbove > spaceBelow;

    const width = Math.max(rect.width, 160);
    let left = rect.left;
    if (left + width > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - width - 12);
    }

    const availableHeight = openUpwards ? spaceAbove - 16 : spaceBelow - 16;
    const maxHeight = Math.min(menuDesiredHeight, Math.max(130, availableHeight));

    if (openUpwards) {
      setCoords({
        bottom: viewportHeight - rect.top + 4,
        left,
        width,
        openUpwards: true,
        maxHeight,
      });
    } else {
      setCoords({
        top: rect.bottom + 4,
        left,
        width,
        openUpwards: false,
        maxHeight,
      });
    }
  }, []);

  // Update position on open, window resize, or scroll (captured across whole DOM)
  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen, updatePosition]);

  // Prevent scroll bleed on wheel events
  useEffect(() => {
    if (!isOpen) return;
    const menuEl = menuRef.current;
    if (!menuEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();
    };

    menuEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      menuEl.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen]);

  // Focus search input and scroll to selected item on open
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const selectedIdx = filteredOptions.findIndex(o => o.value === value);
      setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);

      // Auto-focus search on desktop/non-touch
      const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      if (isSearchEnabled && !isTouch) {
        requestAnimationFrame(() => {
          searchInputRef.current?.focus();
        });
      }

      // Scroll selected item into view
      requestAnimationFrame(() => {
        if (optionListRef.current && selectedIdx >= 0) {
          const items = optionListRef.current.querySelectorAll('[data-select-option]');
          items[selectedIdx]?.scrollIntoView({ block: 'nearest' });
        }
      });
    } else {
      setSearchQuery('');
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Close on outside click or touch
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = prev + 1 >= filteredOptions.length ? 0 : prev + 1;
          scrollOptionIntoView(next);
          return next;
        });
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        setHighlightedIndex(prev => {
          const next = prev - 1 < 0 ? filteredOptions.length - 1 : prev - 1;
          scrollOptionIntoView(next);
          return next;
        });
        break;
      }
      case 'Enter': {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex].value);
        } else if (filteredOptions.length === 1) {
          handleSelect(filteredOptions[0].value);
        }
        break;
      }
      case 'Escape': {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      }
      case 'Tab': {
        setIsOpen(false);
        break;
      }
    }
  };

  const scrollOptionIntoView = (index: number) => {
    requestAnimationFrame(() => {
      if (optionListRef.current) {
        const items = optionListRef.current.querySelectorAll('[data-select-option]');
        items[index]?.scrollIntoView({ block: 'nearest' });
      }
    });
  };

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
    triggerRef.current?.focus();
  };

  return (
    <div className={`relative select-none ${className}`} id={id}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 rounded-[6px] bg-[var(--field-bg)] border transition-all text-left cursor-pointer outline-none ${sizeClasses} ${
          isOpen
            ? 'border-[var(--field-border-focus)] shadow-[0_0_0_1px_var(--field-border-focus),0_0_8px_var(--field-focus-glow)] text-[var(--text-primary)]'
            : 'border-[var(--field-border)] hover:border-[var(--field-border-hover)] text-[var(--text-primary)]'
        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <span className="truncate font-normal flex items-center gap-2">
          {selectedOption?.icon}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        
        <CaretDown 
          size={size === 'sm' ? 12 : 14} 
          weight="bold"
          className={`text-[var(--text-muted)] transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180 text-[var(--field-border-focus)]' : ''}`} 
        />
      </button>

      {/* Popover Menu rendered via Portal into body to decouple from modal scroll container */}
      {isOpen && coords && createPortal(
        <div
          ref={menuRef}
          onKeyDown={handleKeyDown}
          className="fixed z-[999999] flex flex-col bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[8px] p-1 shadow-[0_12px_32px_rgba(0,0,0,0.65),0_2px_8px_rgba(0,0,0,0.3)] animate-in fade-in duration-100"
          style={{
            top: coords.top !== undefined ? `${coords.top}px` : undefined,
            bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            maxHeight: `${coords.maxHeight}px`,
            overscrollBehavior: 'contain',
          }}
        >
          {/* Quick Search Filtering */}
          {isSearchEnabled && (
            <div className="px-1 pt-1 pb-1.5 border-b border-[var(--border-default)] mb-1 shrink-0">
              <div className="relative flex items-center">
                <MagnifyingGlass 
                  size={13} 
                  weight="bold" 
                  className="absolute left-2 text-[var(--text-muted)] pointer-events-none" 
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Filter options..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  className="w-full h-[28px] pl-7 pr-7 text-[12px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--field-border-focus)]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-0.5"
                  >
                    <X size={12} weight="bold" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List with isolated scroll */}
          <div
            ref={optionListRef}
            tabIndex={-1}
            className="flex-1 overflow-y-auto no-scrollbar space-y-0.5"
            style={{ overscrollBehavior: 'contain' }}
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-[12px] text-[var(--text-muted)] text-center">
                No matching options
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={opt.value}
                    data-select-option
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[5px] text-left transition-colors cursor-pointer text-[12.5px] ${
                      isSelected
                        ? 'bg-[var(--accent-bg-soft)] text-[var(--accent)] font-medium'
                        : isHighlighted
                        ? 'bg-[var(--bg-surface-hover)] text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                    }`}
                  >
                    <span className="truncate flex items-center gap-2">
                      {opt.icon}
                      <span className="truncate">{opt.label}</span>
                    </span>
                    {isSelected && (
                      <Check size={13} weight="bold" className="text-[var(--accent)] shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
