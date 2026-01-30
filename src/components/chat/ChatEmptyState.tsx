import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { forwardRef } from 'react';

interface ChatEmptyStateProps {
  className?: string;
  onCreateNewLoop: () => void;
  chatHeaderNavigationRef?: React.RefObject<HTMLDivElement>;
  inputChatContainerRef?: React.RefObject<HTMLTextAreaElement>;
}

export const ChatEmptyState = forwardRef<HTMLDivElement, ChatEmptyStateProps>(
  (
    {
      className,
      onCreateNewLoop,
      chatHeaderNavigationRef,
      inputChatContainerRef,
    },
    ref
  ) => {
    return (
      <div
        className={cn(
          'relative flex items-center justify-center h-full',
          className,
        )}
        ref={ref}
        data-testid="chat-empty-state"
      >
        <div
          ref={chatHeaderNavigationRef}
          className="absolute top-0 w-full h-16 pointer-events-none"
        />

        <div className="flex flex-col items-center space-y-4" data-testid="chat-empty-state-content">
          <p className="text-slate-600">
            No active sessions. Click + to create a new loop.
          </p>
          <div ref={inputChatContainerRef as any}>
            <Button
              onClick={onCreateNewLoop}
              variant="default"
              size="sm"
              className="flex items-center gap-2"
              data-testid="chat-empty-state-create-btn"
            >
              <Plus className="w-4 h-4" />
              Create New Loop
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

ChatEmptyState.displayName = 'ChatEmptyState';
