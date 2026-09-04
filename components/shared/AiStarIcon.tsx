import React from 'react';

export interface AiStarIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
  weight?: 'regular' | 'bold' | 'fill' | 'thin' | 'light' | 'duotone';
  color?: string;
}

/**
 * 6-Pointed Star of David / Magen David AI Icon
 * Custom-crafted geometric 6-pointed star with clean 1.5px stroke per AGENTS.md design tokens.
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
      {/* 6-Pointed Hexagram (Star of David) geometry */}
      <polygon points="12,2.5 14.75,7.25 20.23,7.25 17.5,12 20.23,16.75 14.75,16.75 12,21.5 9.25,16.75 3.77,16.75 6.5,12 3.77,7.25 9.25,7.25" />
    </svg>
  );
};

export default AiStarIcon;
