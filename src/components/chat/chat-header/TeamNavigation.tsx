import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSSEConnection } from '@/contexts/SSEConnectionContext';
import { useCurrentStage } from '@/hooks/useCurrentStage';
import { cn } from '@/lib/utils';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';

import { sessionSyncKeys } from '@/queries/sessionSync/sessionSyncKeys';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface TeamNavigationProps {
  className?: string;
  variant?: 'default' | 'dark' | 'navigation';
  keepOpen?: boolean; // For debugging purposes
}

export const TeamNavigation: React.FC<TeamNavigationProps> = ({
  className = '',
  variant = 'navigation',
  keepOpen = false,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isNavigating, setIsNavigating] = useState(false);
  const [targetStageName, setTargetStageName] = useState<string>('');
  const navigationInProgressRef = useRef(false);
  const { forceCleanupStuckStreaming } = useSSEConnection();

  const {
    stages,
    isLoading,
    currentStagePriority: currentStageId,
    currentStage: currentStageData,
    selectedProject,
  } = useCurrentStage();

  const currentStage = useMemo(() => {
    return currentStageData;
  }, [currentStageData]);

  const handleStageChange = useCallback(
    async (stagePriorityString: string) => {
      const stagePriority = parseInt(stagePriorityString, 10);
      if (isNaN(stagePriority)) return;

      // Prevent duplicate navigation
      if (navigationInProgressRef.current) {
        console.debug(
          '[TeamNavigation] Navigation already in progress, ignoring',
        );
        return;
      }

      // Don't navigate to the same stage
      if (stagePriority === currentStageId) {
        return;
      }

      const selectedStage = stages.find((s) => s.priority === stagePriority);
      setTargetStageName(selectedStage?.name || 'Stage');
      setIsNavigating(true);
      navigationInProgressRef.current = true;

      try {
        // NOTE: We do NOT abort streams when switching stages.
        // Runners continue in the background and messages accumulate.
        // When user returns to the session, they will see accumulated messages
        // and streaming indicators if still active.

        // Note: We still cleanup stuck states that have been running too long
        forceCleanupStuckStreaming();

        // NOTE: We do NOT clear messages or events here!
        // Messages accumulate in background from active streams.
        // When user returns to the session, they will see the accumulated messages.

        await queryClient.invalidateQueries({
          queryKey: sessionSyncKeys.all,
        });

        // Update store's currentStageId to persist the stage selection across navigation
        if (selectedStage) {
          useWorkspaceProjectStore
            .getState()
            .setCurrentStageId(selectedStage.id);
        }

        // Navigate with cleared session - new stage will set its own
        const params = new URLSearchParams({ stage: stagePriority.toString() });
        // Don't include session_id - the new stage's SessionSync will set it
        navigate(`/chat?${params.toString()}`, { replace: true });
      } finally {
        setIsNavigating(false);
        navigationInProgressRef.current = false;
      }
    },
    [navigate, queryClient, stages, currentStageId, forceCleanupStuckStreaming],
  );

  if (isLoading) {
    const loadingTextColor = 'text-brand-accent-50';
    const spinnerColor = 'border-brand-accent-50 border-t-transparent';

    return (
      <div
        className={cn('flex items-center space-x-loop-2', className)}
        data-testid="team-navigation-loading"
      >
        <div
          className={`w-4 h-4 border-2 ${spinnerColor} rounded-full animate-spin`}
        />
        <span className={`text-sm ${loadingTextColor}`}>Loading stages...</span>
      </div>
    );
  }

  if (stages.length === 0) {
    const noStagesTextColor = 'text-brand-accent-50';

    return (
      <div
        className={cn('flex items-center', className)}
        data-testid="team-navigation-empty"
      >
        <span className={`text-sm ${noStagesTextColor}`}>
          No stages available
        </span>
      </div>
    );
  }

  const projectName = selectedProject?.name || 'Project';
  const stageName = currentStage?.name || 'Stage';

  if (isNavigating) {
    return (
      <div
        className={cn('flex items-center space-x-loop-2', className)}
        data-testid="team-navigation-navigating"
      >
        <Loader2 className="w-4 h-4 text-brand-accent-50 animate-spin" />
        <span className="text-sm text-brand-accent-50">
          Switching to {targetStageName}...
        </span>
      </div>
    );
  }

  return (
    <Select
      value={currentStageId?.toString() || ''}
      onValueChange={handleStageChange}
    >
      <SelectTrigger
        className={cn(
          'h-auto text-lg font-bold !border-none !shadow-none !ring-0 !outline-none bg-transparent hover:bg-transparent focus:ring-0 focus:outline-none p-0',
          className,
        )}
        data-testid="team-navigation-trigger"
      >
        <SelectValue
          placeholder={
            variant === 'navigation' ? projectName : 'Select a stage'
          }
        >
          {variant === 'navigation' ? (
            <span className="text-brand-accent-50 font-bold tracking-[-0.48px]">
              {projectName} / {stageName}
            </span>
          ) : currentStage ? (
            <span className="text-brand-accent-50 font-bold tracking-[-0.48px]">
              {stageName}
            </span>
          ) : (
            <span className="text-brand-accent-50 font-bold">
              Select a stage
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        showDividers={false}
        chevronClassName="text-neutral-grayscale-50"
        className="max-h-[300px] w-[var(--radix-select-trigger-width)] min-w-0 p-loop-4 shadow-lg bg-neutral-grayscale-0 rounded-md border border-neutral-grayscale-20"
        onCloseAutoFocus={(e) => {
          if (keepOpen) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (keepOpen) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onPointerDownOutside={(e) => {
          if (keepOpen) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        data-testid="team-navigation-content"
      >
        {stages.map((stage) => (
          <SelectItem
            key={stage.priority}
            value={stage.priority.toString()}
            className="p-loop-2 text-md cursor-pointer transition-colors duration-200 text-neutral-grayscale-50 rounded-xs focus:bg-neutral-grayscale-10 focus:text-neutral-grayscale-90 data-[state=checked]:bg-neutral-grayscale-10 data-[state=checked]:text-neutral-grayscale-90"
            data-testid={`team-navigation-stage-${stage.priority}`}
          >
            <div className="flex items-center space-x-loop-2 text-base">
              <span>{stage.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
