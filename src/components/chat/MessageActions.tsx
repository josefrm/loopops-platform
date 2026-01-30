import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { MessageAction } from '@/models/Message';
import { cn } from '@/lib/utils';
import { filterActionsForStageNavigation } from '@/utils/stageNavigationActions';

interface MessageActionsProps {
  actions: MessageAction[];
  onActionClick: (action: MessageAction) => void;
  className?: string;
  stepFinished?: boolean;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  actions,
  onActionClick,
  className,
  stepFinished = false,
}) => {
  const filteredActions = useMemo(() => {
    return filterActionsForStageNavigation(actions, stepFinished);
  }, [actions, stepFinished]);

  if (!filteredActions || filteredActions.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2 mt-3', className)}>
      {filteredActions.map((action, index) => (
        <Button
          key={action.id || `action-${index}`}
          variant={action.type === 'primary' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onActionClick(action)}
          disabled={action.disabled}
          className={cn(
            'text-sm px-4 py-2 rounded-full transition-all',
            action.disabled && 'opacity-50 cursor-not-allowed',
            !action.disabled && action.type === 'primary'
              ? 'bg-white border border-neutral-grayscale-30 text-neutral-grayscale-90 hover:bg-neutral-grayscale-10'
              : 'bg-transparent border border-neutral-grayscale-30 text-neutral-grayscale-70 hover:bg-neutral-grayscale-5',
          )}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
};
