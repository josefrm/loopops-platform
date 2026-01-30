import { cn } from '@/lib/utils';
import { Loader2, Wifi, WifiOff, X } from 'lucide-react';

interface SSEConnectionIndicatorProps {
  isStreaming: boolean;
  isConnectionActive: boolean;
  className?: string;
  alwaysShow?: boolean;
  onCancel?: () => void;
}

export const SSEConnectionIndicator = ({
  isStreaming,
  isConnectionActive,
  className,
  alwaysShow = false,
  onCancel,
}: SSEConnectionIndicatorProps) => {
  if (!alwaysShow && !isStreaming && !isConnectionActive) {
    return null;
  }

  return (
    <div
      className={cn(
        'relative z-10 mx-auto mb-loop-2 inline-flex w-fit items-center gap-loop-2 px-loop-4 py-loop-2 rounded-md border border-neutral-grayscale-20',
        className,
      )}
      data-testid="sse-connection-indicator"
    >
      {isStreaming ? (
        <>
          <Loader2 className="w-loop-4 h-loop-4 text-brand-accent-50 animate-spin" />
          <span className="text-md font-medium text-brand-accent-50">
            Processing your request...
          </span>
          {onCancel && (
            <button
              onClick={onCancel}
              className="ml-loop-2 p-1 rounded-full hover:bg-neutral-grayscale-10 transition-colors"
              title="Cancel request"
            >
              <X className="w-loop-4 h-loop-4 text-neutral-grayscale-50 hover:text-system-error-60" />
            </button>
          )}
        </>
      ) : isConnectionActive ? (
        <>
          <Wifi className="w-loop-4 h-loop-4 text-system-success-50" />
          <span className="text-md font-medium text-system-success-50">
            Connected
          </span>
        </>
      ) : (
        <>
          <WifiOff className="w-loop-4 h-loop-4 text-system-error-60" />
          <span className="text-md font-medium text-system-error-70">
            Reconnecting...
          </span>
        </>
      )}
    </div>
  );
};
