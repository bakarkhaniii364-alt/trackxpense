import React from 'react';

interface CoinFlipLoaderProps {
  size?: number;
  className?: string;
}

export const CoinFlipLoader: React.FC<CoinFlipLoaderProps> = ({
  size = 20,
  className = ''
}) => {
  const barHeight = Math.round(size * 0.85);
  const barWidth = Math.max(3, Math.round(size * 0.16));

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      aria-label="RabbAi is thinking"
      role="status"
    >
      <div
        className="rounded-full animate-coin-bar"
        style={{
          width: `${barWidth}px`,
          height: `${barHeight}px`,
          background: 'linear-gradient(180deg, #FFB020 0%, #FFE082 35%, #F6821F 70%, #D97706 100%)',
          boxShadow: '0 0 10px rgba(246, 130, 31, 0.5), 0 0 3px rgba(255, 224, 130, 0.8)',
        }}
      />
    </div>
  );
};
