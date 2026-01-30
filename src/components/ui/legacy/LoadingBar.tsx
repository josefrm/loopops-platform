import React from 'react';
import { gradients } from '@/utils/colors';

interface LoadingBarProps {
  className?: string;
  height?: string;
}

export const LoadingBar: React.FC<LoadingBarProps> = ({
  className = '',
  height = 'h-8',
}) => {
  const shimmerStyle = {
    background: gradients.premiumLinearGradient,
    backgroundSize: '200% 100%',
    animation: 'shimmer-bg 2s ease-in-out infinite',
  };

  const progressStyle = {
    background: gradients.premiumLinearGradient,
    width: '30%',
    animation: 'loading-slide 2s ease-in-out infinite',
  };

  return (
    <div
      className={`relative overflow-hidden bg-slate-100 rounded-sm ${height} ${className}`}
    >
      {/* Background shimmer effect */}
      <div
        className="absolute top-0 left-0 h-full w-full opacity-20"
        style={shimmerStyle}
      />

      {/* Moving progress bar */}
      <div className="absolute top-0 left-0 h-full w-full overflow-hidden">
        <div className="h-full rounded-sm" style={progressStyle} />
      </div>
    </div>
  );
};
