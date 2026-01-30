import React from 'react';

interface ResizeIndicatorProps {
  side: 'left' | 'right';
  width: number;
  minWidth: number;
  maxWidth: number;
  isResizing: boolean;
  onMouseDown?: React.MouseEventHandler<HTMLDivElement>;
  className?: string;
}

export const ResizeIndicator: React.FC<ResizeIndicatorProps> = ({
  side,
  width,
  minWidth,
  maxWidth,
  isResizing,
  onMouseDown,
  className = '',
}) => {
  return (
    <div
      className={`mt-0 top-0 h-full w-loop-2 flex items-center justify-center z-[5] bg-neutral-grayscale-20 ${className}`}
      style={{
        padding: '1px',
        // [side]: `${width}px`,
        transition: isResizing ? 'none' : `${side} 0.2s ease-in-out`,
      }}
      onMouseDown={onMouseDown}
    >
      {/* Center bar - 200px height, 4px width */}
      <div
        className="bg-white"
        style={{
          width: '2px',
          height: '200px',
        }}
      />

      {/* Resize indicator text (only show when resizing) */}
      {isResizing && (
        <div
          className="absolute top-4 bg-black text-white text-xs px-2 py-1 rounded pointer-events-none"
          style={{
            [side]: '20px',
          }}
        >
          {width}px ({minWidth}-{maxWidth})
        </div>
      )}
    </div>
  );
};
