import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import React from 'react';

interface MainThreadLoaderProps {
  isLoading: boolean;
  error: string | null;
  onRetry?: () => void;
  onContinue?: () => void;
  className?: string;
  showError?: boolean;
}

export const MainThreadLoader: React.FC<MainThreadLoaderProps> = ({
  isLoading,
  error,
  onRetry,
  className,
  showError = true,
}) => {
  if (!isLoading && !error) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-loop-3 px-loop-4 py-loop-3 rounded-md',
        'bg-neutral-grayscale-10 border border-neutral-grayscale-20',
        className,
      )}
    >
      {isLoading && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-brand-accent-50" />
          <div className="flex items-center gap-loop-2">
            <MessageSquare className="h-4 w-4 text-brand-accent-50" />
            <span className="text-sm text-neutral-grayscale-90">
              Preparing your workspace...
            </span>
          </div>
        </>
      )}

      {error && showError && (
        <>
          <AlertCircle className="h-4 w-4 text-red-500" />
          <div className="flex-1">
            <span className="text-sm text-red-600">
              Failed to load conversation history
            </span>
            <p className="text-xs text-neutral-grayscale-70 mt-1">{error}</p>
          </div>
          {onRetry && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onRetry}
              className="h-6 px-loop-2 text-xs"
            >
              Retry
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export const MainThreadLoaderOverlay: React.FC<MainThreadLoaderProps> = ({
  isLoading,
  error,
  onRetry,
  onContinue,
  className,
  showError = true,
}) => {
  if (!isLoading && !error) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 bg-neutral-grayscale-0/80 backdrop-blur-sm',
        'flex items-center justify-center z-50',
        className,
      )}
    >
      <div className="bg-neutral-grayscale-0 rounded-lg shadow-lg p-loop-6 max-w-md mx-auto">
        <div className="text-center">
          {isLoading && (
            <>
              <div className="flex justify-center mb-loop-4">
                <div className="relative">
                  <MessageSquare className="h-8 w-8 text-brand-accent-50" />
                  <Loader2 className="h-4 w-4 animate-spin text-brand-accent-50 absolute -top-1 -right-1" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-neutral-grayscale-90 mb-loop-2">
                Initializing Your Workspace
              </h3>
              <p className="text-sm text-neutral-grayscale-70">
                We're setting up your conversation history and preparing
                everything for you...
              </p>
            </>
          )}

          {error && showError && (
            <>
              <div className="flex justify-center mb-loop-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-red-600 mb-loop-2">
                Setup Failed
              </h3>
              <p className="text-sm text-neutral-grayscale-70 mb-loop-4">
                We couldn't initialize your conversation history. You can still
                use the app, but your conversations may not be saved.
              </p>
              <div className="text-xs text-red-500 mb-loop-4 p-loop-3 bg-red-50 rounded">
                {error}
              </div>
              <div className="flex gap-loop-3 justify-center">
                {onContinue && (
                  <Button
                    variant="secondary"
                    onClick={onContinue}
                    className="flex-1"
                  >
                    Continue Anyway
                  </Button>
                )}
                {onRetry && (
                  <Button onClick={onRetry} className="flex-1">
                    Try Again
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
