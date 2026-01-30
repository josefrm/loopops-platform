import React from 'react';

interface MindspaceTileSkeletonProps {
  count?: number;
}

export const MindspaceTileSkeleton: React.FC<MindspaceTileSkeletonProps> = ({
  count = 3,
}) => {
  return (
    <div className="space-y-loop-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex p-loop-4 items-center gap-loop-4 self-stretch rounded-sm border border-neutral-grayscale-30 bg-neutral-grayscale-0 animate-pulse"
        >
          {/* Checkbox Skeleton */}
          <div className="flex items-center justify-center flex-shrink-0">
            <div className="h-loop-6 w-loop-6 rounded-full bg-neutral-grayscale-20" />
          </div>

          {/* Divider */}
          <div className="w-px bg-neutral-grayscale-30 self-stretch" />

          {/* File Icon Skeleton */}
          <div className="flex items-center justify-center flex-shrink-0">
            <div className="w-8 h-8 rounded bg-neutral-grayscale-20" />
          </div>

          {/* File Info Skeleton */}
          <div className="flex flex-col min-w-0 flex-1 gap-loop-2">
            <div className="h-4 bg-neutral-grayscale-20 rounded w-3/4" />
            <div className="h-3 bg-neutral-grayscale-20 rounded w-1/2" />
          </div>

          {/* Status Skeleton */}
          <div className="flex items-center flex-shrink-0">
            <div className="h-6 w-20 bg-neutral-grayscale-20 rounded-full" />
          </div>

          {/* Divider */}
          <div className="w-px bg-neutral-grayscale-30 self-stretch" />

          {/* Actions Skeleton */}
          <div className="flex items-center gap-loop-2 flex-shrink-0">
            <div className="w-loop-6 h-loop-6 rounded-full bg-neutral-grayscale-20" />
            <div className="w-loop-6 h-loop-6 rounded-full bg-neutral-grayscale-20" />
            <div className="w-loop-6 h-loop-6 rounded-full bg-neutral-grayscale-20" />
            <div className="w-loop-6 h-loop-6 rounded-full bg-neutral-grayscale-20" />
          </div>
        </div>
      ))}
    </div>
  );
};
