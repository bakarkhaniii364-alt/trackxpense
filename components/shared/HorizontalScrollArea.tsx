import React, { useCallback, useEffect, useRef, useState } from 'react';

interface HorizontalScrollAreaProps {
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  /** CSS background token/color to fade toward at overflowing edges (default: var(--bg-page)). */
  fadeColor?: string;
  /** Width of the edge shadow/fade indicator in pixels (default: 40). */
  fadeWidth?: number;
}

/**
 * Horizontal scroll container that renders subtle left/right edge shadows
 * whenever content overflows in that direction, signaling horizontal swipeability.
 */
export const HorizontalScrollArea: React.FC<HorizontalScrollAreaProps> = ({
  children,
  className = '',
  wrapperClassName = '',
  fadeColor = 'var(--bg-page)',
  fadeWidth = 40
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateScrollState();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollState) : null;
    ro?.observe(el);
    window.addEventListener('resize', updateScrollState);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, children]);

  return (
    <div className={`relative ${wrapperClassName}`}>
      <div
        ref={scrollerRef}
        onScroll={updateScrollState}
        className={`overflow-x-auto no-scrollbar ${className}`}
      >
        {children}
      </div>

      {/* Left scroll-affordance shadow */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 z-10 transition-opacity duration-200 ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          width: `${fadeWidth}px`,
          background: `linear-gradient(to right, ${fadeColor} 12%, transparent 100%)`,
          boxShadow: 'inset 14px 0 14px -12px rgba(0, 0, 0, 0.65)'
        }}
      />

      {/* Right scroll-affordance shadow */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 z-10 transition-opacity duration-200 ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          width: `${fadeWidth}px`,
          background: `linear-gradient(to left, ${fadeColor} 12%, transparent 100%)`,
          boxShadow: 'inset -14px 0 14px -12px rgba(0, 0, 0, 0.65)'
        }}
      />
    </div>
  );
};
