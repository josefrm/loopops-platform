import { useToast } from '@/hooks/use-toast';
import { type SortOption } from '@/hooks/useFileFilters';
import { useLoopSessions } from '@/hooks/useLoopSessions';
import { Loader2, Trash } from 'lucide-react';
import React, { useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AILoadingState } from '../ui/AILoadingState';
import { InformationTileAction } from '../ui/InformationTile';
import { LoopItemContent } from './LoopItemContent';
import { SessionItem } from './LoopsTabDisplay';
import { Stage } from './TabNavigationControl';

const STATIC_STAGES = [
  'Onboarding',
  'Discovery',
  'Design',
  'Refine',
  'Develop',
];

interface InternalLoopsDisplayProps {
  stage: Stage | null;
  sortBy?: SortOption;
}

const generateProjectActions = (
  item: SessionItem,
  onDelete: (sessionId: string, title: string) => Promise<void>,
  isDeleting: boolean,
): InformationTileAction[] => {
  return [
    {
      id: 'trash',
      icon: isDeleting ? (
        <Loader2 size={16} className="text-neutral-grayscale-50 animate-spin" />
      ) : (
        <Trash
          size={16}
          className="text-neutral-grayscale-50 fill-neutral-grayscale-50"
        />
      ),
      label: 'Remove from loop',
      onClick: async () => {
        if (item.sessionId && !isDeleting) {
          await onDelete(item.sessionId, item.title);
        }
      },
    },
  ];
};

interface LoopsStageSectionProps {
  stageName: string;
  items: SessionItem[];
  generateActionsWithType: (item: SessionItem) => InformationTileAction[];
  handleNavigateToChat: (sessionId: string) => void;
  handleShowMilestones: (sessionId: string, count: number) => void;
}

const LoopsStageSection: React.FC<LoopsStageSectionProps> = ({
  stageName,
  items,
  generateActionsWithType,
  handleNavigateToChat,
  handleShowMilestones,
}) => {
  if (items.length === 0) {
    return (
      <div className="mb-loop-8">
        <h3 className="text-lg font-bold text-neutral-grayscale-90 mb-loop-4">
          {stageName} Stage
        </h3>
        <div className="p-loop-4 border border-dashed border-neutral-grayscale-30 rounded-md text-center">
          <p className="text-neutral-grayscale-50 text-sm">
            No loops in this stage.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-loop-8">
      <h3 className="text-lg font-bold text-neutral-grayscale-90 mb-loop-4">
        {stageName} Stage
      </h3>
      <div className="flex flex-col gap-loop-4">
        {items.map((item) => {
          const actions = generateActionsWithType(item);
          const milestonesCount = 0;

          return (
            <div key={item.id}>
              <LoopItemContent
                data={item}
                actions={actions}
                onOpenLoop={() =>
                  item.sessionId && handleNavigateToChat(item.sessionId)
                }
                onShowMilestones={() =>
                  item.sessionId &&
                  handleShowMilestones(item.sessionId, milestonesCount)
                }
                milestonesCount={milestonesCount}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const InternalLoopsDisplay: React.FC<InternalLoopsDisplayProps> = ({
  stage,
  sortBy = 'group-by-stage',
}) => {
  const {
    items: allItems,
    isLoading,
    deleteSession,
    isDeleting,
  } = useLoopSessions({
    stage,
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const internalItems = useMemo(() => {
    // Filter for non-plugin items
    // Assuming is_plugin is explicitly false or undefined for internal loops
    const filtered = allItems.filter((item) => !item.is_plugin);

    if (sortBy === 'group-by-stage') {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'newest-to-oldest') {
        return b.created_at.getTime() - a.created_at.getTime();
      }
      if (sortBy === 'oldest-to-newest') {
        return a.created_at.getTime() - b.created_at.getTime();
      }
      if (sortBy === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'alphabetical-z-a') {
        return b.title.localeCompare(a.title);
      }
      return 0;
    });
  }, [allItems, sortBy]);

  const handleNavigateToChat = useCallback(
    (sessionId: string) => {
      if (!stage) return;
      const params = new URLSearchParams(searchParams);
      params.set('stage', stage.priority.toString());
      params.set('session_id', sessionId);
      navigate(`/chat?${params.toString()}`);
    },
    [navigate, stage, searchParams],
  );

  const handleShowMilestones = useCallback(
    (sessionId: string, milestonesCount: number) => {
      toast({
        title: 'Milestones',
        description: `This loop has ${milestonesCount} milestone${
          milestonesCount !== 1 ? 's' : ''
        }`,
      });
    },
    [toast],
  );

  const generateActionsWithType = useCallback(
    (item: SessionItem) => {
      return generateProjectActions(item, deleteSession, isDeleting);
    },
    [deleteSession, isDeleting],
  );

  const renderContent = () => {
    if (sortBy === 'group-by-stage') {
      return (
        <div className="pb-loop-1">
          {STATIC_STAGES.map((stageName) => {
            const stageItems = internalItems.filter(
              (item) => item.stage_name === stageName,
            );
            return (
              <LoopsStageSection
                key={stageName}
                stageName={stageName}
                items={stageItems}
                generateActionsWithType={generateActionsWithType}
                handleNavigateToChat={handleNavigateToChat}
                handleShowMilestones={handleShowMilestones}
              />
            );
          })}
        </div>
      );
    }

    if (internalItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-loop-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <p className="text-neutral-grayscale-50 text-base font-medium">
            No loops found.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-loop-4 pb-loop-1">
        {internalItems.map((item) => {
          const actions = generateActionsWithType(item);
          return (
            <div key={item.id}>
              <LoopItemContent
                data={item}
                actions={actions}
                onOpenLoop={() =>
                  item.sessionId && handleNavigateToChat(item.sessionId)
                }
                onShowMilestones={() =>
                  item.sessionId && handleShowMilestones(item.sessionId, 0)
                }
                milestonesCount={0}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-hide"
        style={{
          maskImage:
            'linear-gradient(to bottom, black calc(100% - 48px), transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black calc(100% - 48px), transparent 100%)',
        }}
      >
        {!stage || isLoading ? (
          <div className="flex items-center justify-center h-full p-loop-8">
            <AILoadingState message="Loading your loops..." />
          </div>
        ) : (
          renderContent()
        )}
      </div>
    </div>
  );
};
