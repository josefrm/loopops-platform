import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Simple inline error indicator for chat messages.
 * Discrete design - appears below the user message that caused the error.
 */
interface InlineRunErrorProps {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function InlineRunError({
  message,
  onRetry,
  isRetrying = false,
  className,
}: InlineRunErrorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs text-red-600 mt-1',
        className
      )}
    >
      <AlertCircle className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">{message}</span>

      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className={cn('h-3 w-3', isRetrying && 'animate-spin')} />
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      )}
    </div>
  );
}

export default InlineRunError;
