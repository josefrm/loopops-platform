import React from 'react';
import { Loader } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StageNavigationLoaderProps {
  isNavigating: boolean;
  stageName?: string;
}

export const StageNavigationLoader: React.FC<StageNavigationLoaderProps> = ({
  isNavigating,
  stageName,
}) => {
  if (!isNavigating) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 bg-neutral-grayscale-90/80 backdrop-blur-sm',
        'flex items-center justify-center z-[9999]',
      )}
    >
      <div className="bg-neutral-grayscale-0 rounded-lg shadow-2xl p-loop-8 max-w-md mx-auto">
        <div className="text-center space-y-loop-4">
          <div className="flex flex-col items-center gap-loop-3">
            <img
              src="/lovable-uploads/loop_ops_small.png"
              alt="LoopOps"
              className="w-16 h-16 object-contain animate-pulse"
            />
            <Loader className="w-loop-4 h-loop-4 text-brand-accent-50 animate-spin" />
          </div>
          <div className="space-y-loop-2">
            <h3 className="text-lg font-semibold text-neutral-grayscale-90">
              Navigating to {stageName || 'Stage'}
            </h3>
            <p className="text-sm text-neutral-grayscale-70">
              Creating a new session and preparing everything for you...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
