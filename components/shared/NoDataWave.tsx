import React from 'react';

interface NoDataWaveProps {
  height?: number;
  label?: string;
  className?: string;
}

/**
 * Pixel-exact Cloudflare sinusoidal wave line with a centered 'No data' pill badge.
 */
export const NoDataWave: React.FC<NoDataWaveProps> = ({ 
  height = 140, 
  label = 'No data',
  className = ''
}) => (
  <div 
    style={{ height: `${height}px` }} 
    className={`relative w-full flex items-center justify-center select-none overflow-hidden ${className}`}
  >
    {/* Faint sinusoidal wave line matching Cloudflare dashboard reference */}
    <svg 
      className="absolute inset-0 w-full h-full text-white/[0.08]" 
      viewBox="0 0 600 120" 
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path 
        d="M 0,65 C 40,48 60,82 100,65 C 140,48 160,82 200,65 C 240,48 260,82 300,65 C 340,48 360,82 400,65 C 440,48 460,82 500,65 C 540,48 560,82 600,65" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5" 
      />
    </svg>
    {/* Centered Cloudflare 'No data' badge */}
    <div className="relative z-10 px-3.5 py-1 rounded-full bg-[#121216] border border-[#24242C] text-[11px] font-medium text-[var(--text-secondary)] shadow-xs">
      {label}
    </div>
  </div>
);
