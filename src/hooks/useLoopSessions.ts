import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  useStageTemplateDetails,
  useStageTemplateId,
} from '@/queries/stageTemplateQueries';
import { useDeleteAgnoSession } from '@/queries/useAgnoSessionMutations';
import { useAgnoSessions } from '@/queries/useAgnoSessions';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { transformTeamDetails } from '@/utils/teamTransformers';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { SessionItem } from '../components/projectContext/LoopsTabDisplay';
import { Stage } from '../components/projectContext/TabNavigationControl';

interface UseLoopSessionsProps {
  stage: Stage | null;
}

export const useLoopSessions = ({ stage }: UseLoopSessionsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
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
    refresh: refreshSessions,
  } = useAgnoSessions({
    workspaceId: currentWorkspace?.id,
    projectId: currentProject?.id,
    userId: user?.id,
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

  const items: SessionItem[] = useMemo(() => {
    return sessions.map((session, index) => {
      const messageCount = session.chat_history?.length ?? 0;
      const title =
        session.session_data?.session_name ||
        session.session_name ||
        `Loop ${index + 1}`;

      // Use the last message's created_at if available, otherwise fallback to session created_at
      const lastMessage =
        session.chat_history && session.chat_history.length > 0
          ? session.chat_history[session.chat_history.length - 1]
          : null;

      const parseDate = (dateVal: string | number | undefined | Date): Date => {
        if (!dateVal) return new Date();
        if (dateVal instanceof Date) return dateVal;

        // If it's a number (Unix timestamp)
        if (typeof dateVal === 'number') {
          // If less than 10 billion, assume seconds (10 billion seconds is ~ year 2286)
          // If greater than 10 billion, assume milliseconds
          return new Date(dateVal < 10000000000 ? dateVal * 1000 : dateVal);
        }

        // If it's a string, let Date parse it
        return new Date(dateVal);
      };

      const createdDate = parseDate(
        session.updated_at || lastMessage?.created_at,
      );

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
        // Extract chip_name and is_plugin from metadata or session object
        // As per user request: "the session data includes now, is_plugin: boolean and chip_name: string"
        is_plugin: session?.is_plugin ?? false,
        chip_name: session?.chip_name || null,
      };
    });
  }, [sessions]);

  return {
    sessions,
    items,
    isLoading: isLoadingSessions || isLoadingStageTemplate,
    deleteSession: handleDeleteSession,
    isDeleting: deleteSessionMutation.isPending,
  };
};
