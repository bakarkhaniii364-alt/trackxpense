import React from 'react';

export interface AiStarIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
  weight?: 'regular' | 'bold' | 'fill' | 'thin' | 'light' | 'duotone';
  color?: string;
}

/**
 * 6-Pointed AI Sparkle Icon
 * Custom-crafted geometric 6-pointed star with sharp outward points and smoothly rounded inner curves,
 * capturing the AI sparkle aesthetic with clean 1.5px stroke per AGENTS.md design tokens.
 */
export const AiStarIcon: React.FC<AiStarIconProps> = ({
  size = 18,
  strokeWidth = 1.5,
  className = '',
  weight = 'regular',
  color = 'currentColor',
  ...props
}) => {
  const isFilled = weight === 'fill';
  const numericStroke = typeof strokeWidth === 'string' ? parseFloat(strokeWidth) || 1.5 : strokeWidth;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isFilled ? color : 'none'}
      stroke={color}
      strokeWidth={isFilled ? 0 : numericStroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      {...props}
    >
      {/* 6-Pointed Sparkle geometry: 6 sharp outward tips with smoothly rounded inner curves */}
      <path d="M 12 2.5 Q 13.2 9.92 20.23 7.25 Q 14.4 12 20.23 16.75 Q 13.2 14.08 12 21.5 Q 10.8 14.08 3.77 16.75 Q 9.6 12 3.77 7.25 Q 10.8 9.92 12 2.5 Z" />
    </svg>
  );
};

export default AiStarIcon;
