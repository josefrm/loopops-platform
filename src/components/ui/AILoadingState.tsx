import { LoopOpsIcon } from '@/components/ui/icons/LoopOpsIcon';
import React from 'react';

interface AILoadingStateProps {
  message?: string;
  className?: string;
}

export const AILoadingState: React.FC<AILoadingStateProps> = ({
  message = 'Loading...',
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center h-full w-full ${className}`}
      data-testid="ai-loading-state"
    >
      {message == 'TODO: Image loading' && (
        <div className="relative flex items-center justify-center p-8">
          {/* Animated glowing background */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-xl opacity-40 animate-pulse rounded-full" />

          {/* Logo with specific styling to match the AI theme */}

          <LoopOpsIcon
            width={40}
            height={40}
            className="text-black dark:text-white"
          />
        </div>
      )}

      {/* Loading message with gradient text */}
      <h3 className="mt-4 text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-600 animate-pulse">
        {message}
      </h3>
    </div>
  );
};
