import React from 'react';

export interface SpotifyIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
  color?: string;
  weight?: string; // For Phosphor compatibility
}

export const SpotifyIcon: React.FC<SpotifyIconProps> = ({
  size = 18,
  strokeWidth = 1.5,
  className = '',
  color = 'currentColor',
  weight,
  ...props
}) => {
  const numericStroke = typeof strokeWidth === 'string' ? parseFloat(strokeWidth) || 1.5 : strokeWidth;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={numericStroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      {...props}
    >
      {/* Outer circular boundary */}
      <circle cx="12" cy="12" r="9.5" />
      {/* 3 characteristic Spotify sound wave arcs */}
      <path d="M 6.8 9.3 C 10.1 7.7, 13.9 7.7, 17.2 9.3" />
      <path d="M 7.6 12.2 C 10.3 10.9, 13.7 10.9, 16.4 12.2" />
      <path d="M 8.5 15.1 C 10.6 14.1, 13.4 14.1, 15.5 15.1" />
    </svg>
  );
};

export default SpotifyIcon;
