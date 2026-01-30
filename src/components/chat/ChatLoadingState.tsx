import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface ChatLoadingStateProps {
  className?: string;
}

export const ChatLoadingState = forwardRef<HTMLDivElement, ChatLoadingStateProps>(
  ({ className }, ref) => {
    return (
      <div className={cn('flex items-center justify-center h-full', className)} ref={ref} data-testid="chat-loading-state">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-accent-50" />
        </div>
      </div>
    );
  }
);

ChatLoadingState.displayName = 'ChatLoadingState';
