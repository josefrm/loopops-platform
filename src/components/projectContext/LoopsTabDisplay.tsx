import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { type SortOption } from '@/hooks/useFileFilters';
import {
  useStageTemplateDetails,
  useStageTemplateId,
} from '@/queries/stageTemplateQueries';
import { useDeleteAgnoSession } from '@/queries/useAgnoSessionMutations';
import { useAgnoSessions } from '@/queries/useAgnoSessions';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { transformTeamDetails } from '@/utils/teamTransformers';
import { Loader2, Trash } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AILoadingState } from '../ui/AILoadingState';
import { InformationTileAction } from '../ui/InformationTile';
import { LoopItemContent } from './LoopItemContent';
import { Stage } from './TabNavigationControl';

// Project-specific item interface
export interface SessionItem {
  id: string;
  sessionId?: string;
  title: string;
  description: string;
  created_at: Date;
  updated_at: Date;
  stage_name: string;
  is_plugin?: boolean;
  chip_name?: string | null;
}

interface LoopsTabContentProps {
  stage: Stage | null;
  activeStageAction?: string;
  sortBy?: SortOption;
}

const STATIC_STAGES = [
  'Onboarding',
  'Discovery',
  'Design',
  'Refine',
  'Develop',
];

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

export const LoopsTabDisplay: React.FC<LoopsTabContentProps> = ({
  stage,
  sortBy = 'group-by-stage',
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );
  const currentProject = useWorkspaceProjectStore((state) =>
    state.getCurrentProject(),
  );
  const stageId = stage?.project_stage_id || null;

  const { data: templateId, isLoading: isLoadingTemplateId } =
    useStageTemplateId(stageId);
  const { data: templateDetails, isLoading: isLoadingTemplateDetails } =
    useStageTemplateDetails(templateId, currentWorkspace?.id);

  const stageTemplate = transformTeamDetails(templateDetails);
  const isLoadingStageTemplate =
    isLoadingTemplateId || isLoadingTemplateDetails;

  const {
    sessions,
    isLoading: isLoadingSessions,
    refresh: refreshSessions, // Alias refresh to refreshSessions
  } = useAgnoSessions({
    workspaceId: currentWorkspace?.id,
    projectId: currentProject?.id,
    userId: user?.id,
    // componentId: stageTemplate?.id,
    enabled:
      !!user?.id &&
      !!stageTemplate?.id &&
      !!currentWorkspace?.id &&
      !!currentProject?.id,
  });

  const hasRefreshedRef = useRef(false);
  useEffect(() => {
    if (
      stageTemplate?.id &&
      currentWorkspace?.id &&
      currentProject?.id &&
      user?.id &&
      !hasRefreshedRef.current
    ) {
      hasRefreshedRef.current = true;
      refreshSessions();
    }
  }, [
    stageTemplate?.id,
    currentWorkspace?.id,
    currentProject?.id,
    user?.id,
    refreshSessions,
  ]);

  const deleteSessionMutation = useDeleteAgnoSession({
    workspaceId: currentWorkspace?.id,
    projectId: currentProject?.id,
    userId: user?.id,
    componentId: stageTemplate?.id,
  });

  const items: SessionItem[] = useMemo(() => {
    const mappedItems = sessions.map((session, index) => {
      const messageCount = session.chat_history?.length ?? 0;
      const title = session.session_name || `Loop ${index + 1}`;
      const createdDate = session.created_at
        ? new Date(session.created_at)
        : new Date();

      return {
        id: session.session_id || `session-${index}`,
        sessionId: session.session_id,
        title,
        description: `${messageCount} messages • ${
          session.metadata?.is_main_thread ? 'Principal' : 'Loop'
        }`,
        created_at: createdDate,
        updated_at: createdDate,
        stage_name: session.stage_name || 'Uncategorized',
      };
    });

    if (sortBy === 'group-by-stage') {
      return mappedItems;
    }

    return [...mappedItems].sort((a, b) => {
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
  }, [sessions, sortBy]);

  const { toast } = useToast();

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

  const handleDeleteSession = useCallback(
    async (sessionId: string, itemTitle: string) => {
      if (!sessionId) return;

      try {
        await deleteSessionMutation.mutateAsync(sessionId);

        toast({
          title: 'Loop deleted',
          description: `"${itemTitle}" has been successfully deleted.`,
        });
      } catch (error) {
        console.error('Error deleting session:', error);
        toast({
          title: 'Error',
          description: 'Could not delete the loop. Please try again.',
          variant: 'destructive',
        });
      }
    },
    [deleteSessionMutation, toast],
  );

  // Memoize wrapper function for generateActions
  const generateActionsWithType = useCallback(
    (item: SessionItem) => {
      const isDeleting = deleteSessionMutation.isPending;
      return generateProjectActions(item, handleDeleteSession, isDeleting);
    },
    [handleDeleteSession, deleteSessionMutation.isPending],
  );

  const showLoading = isLoadingSessions || isLoadingStageTemplate;

  const renderContent = () => {
    if (sortBy === 'group-by-stage') {
      return (
        <div className="pb-loop-1">
          {STATIC_STAGES.map((stageName) => {
            const stageItems = items.filter(
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

    // Flat list rendering for other sort options
    if (items.length === 0) {
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
        {items.map((item) => {
          const actions = generateActionsWithType(item);
          const milestonesCount = 0; // Keeping 0 as in original code logic

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
    );
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Content Area */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-hide"
          style={{
            maskImage:
              'linear-gradient(to bottom, black calc(100% - 48px), transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black calc(100% - 48px), transparent 100%)',
          }}
        >
          {!stage || showLoading ? (
            <div className="flex items-center justify-center h-full p-loop-8">
              <AILoadingState message="Loading your loops..." />
            </div>
          ) : (
            renderContent()
          )}
        </div>
      </div>
    </>
  );
};
