import React from 'react';

interface TabNavigationSkeletonProps {
  className?: string;
  tabCount?: number;
}

export const TabNavigationSkeleton: React.FC<TabNavigationSkeletonProps> = ({
  className = '',
  tabCount = 2,
}) => {
  return (
    <div className={`flex mb-loop-6 w-full ${className}`}>
      {Array.from({ length: tabCount }).map((_, index) => (
        <div
          key={index}
          className="flex flex-col items-center cursor-pointer"
          style={{ width: index === 0 ? '70%' : '30%' }}
        >
          {/* Tab name placeholder */}
          <div className="h-4 bg-neutral-grayscale-15 rounded w-20 mb-2"></div>
          {/* Tab indicator bar */}
          <div
            className="w-full bg-neutral-grayscale-15 rounded"
            style={{
              height: '1px',
              marginTop: '3px',
            }}
          />
        </div>
      ))}
    </div>
  );
};
