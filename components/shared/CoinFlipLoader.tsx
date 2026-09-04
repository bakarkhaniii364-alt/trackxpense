import React from 'react';

interface CoinFlipLoaderProps {
  size?: number;
  className?: string;
}

export const CoinFlipLoader: React.FC<CoinFlipLoaderProps> = ({
  size = 20,
  className = ''
}) => {
  const barHeight = Math.round(size * 0.75);
  const barWidth = Math.max(3, Math.round(size * 0.16));

  return (
    <div
      className={`inline-flex flex-col items-center justify-end shrink-0 relative overflow-visible ${className}`}
      style={{ width: `${size}px`, height: `${size + 6}px` }}
      aria-label="RabbAi is thinking"
      role="status"
    >
      {/* Flipping Coin (Side View: Golden Metallic Bar with Physical Jump & Decelerating Spin) */}
      <div
        className="rounded-full animate-coin-toss"
        style={{
          width: `${barWidth}px`,
          height: `${barHeight}px`,
          background: 'linear-gradient(180deg, #FFB020 0%, #FFE082 35%, #F6821F 70%, #D97706 100%)',
          boxShadow: '0 0 10px rgba(246, 130, 31, 0.5), 0 0 3px rgba(255, 224, 130, 0.8)',
        }}
      />
      {/* Dynamic Ground Contact Shadow */}
      <div
        className="rounded-full animate-coin-shadow bg-amber-500/35 blur-[0.6px] mt-0.5 shrink-0 pointer-events-none"
        style={{
          width: `${barHeight * 0.65}px`,
          height: '2px',
        }}
      />
    </div>
  );
};
