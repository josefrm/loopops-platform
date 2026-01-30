import React from 'react';

export const CategoryActionsSkeleton: React.FC = () => {
  return (
    <div className="flex items-center justify-between flex-shrink-0 mb-loop-6 animate-pulse">
      {/* Category Actions Buttons */}
      <div className="flex items-center justify-start gap-loop-2">
        <div className="h-8 w-24 bg-neutral-grayscale-15 rounded-xs"></div>
        <div className="h-8 w-16 bg-neutral-grayscale-15 rounded-xs"></div>
        <div className="h-8 w-16 bg-neutral-grayscale-15 rounded-xs"></div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="flex items-center justify-end gap-loop-2">
        <div className="h-8 w-16 bg-neutral-grayscale-15 rounded-xs"></div>
        <div className="h-8 w-16 bg-neutral-grayscale-15 rounded-xs"></div>
      </div>
    </div>
  );
};
