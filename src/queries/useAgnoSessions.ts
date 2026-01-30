import {
  AgnoSession,
  AgnoSessionService,
  GetSessionsParams,
} from '@/services/AgnoSessionService';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface UseAgnoSessionsOptions {
  workspaceId: string | undefined;
  projectId: string | undefined;
  userId: string | undefined;
  componentId?: string;
  enabled?: boolean;
}

export const useAgnoSessions = ({
  workspaceId,
  projectId,
  userId,
  componentId,
  enabled = true,
}: UseAgnoSessionsOptions) => {
  const queryClient = useQueryClient();

  const queryKey = [
    'agno-sessions',
    workspaceId,
    projectId,
    userId,
    componentId,
  ];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!workspaceId || !projectId || !userId) {
        return { data: [], meta: null };
      }

      const params: GetSessionsParams = {
        workspace_id: workspaceId,
        project_id: projectId,
        user_id: userId,
        component_id: componentId,
      };

      const response = await AgnoSessionService.getSessions(params);
      return response;
    },
    enabled: enabled && !!workspaceId && !!projectId && !!userId,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 2,
    initialData: () => {
      const cached = queryClient.getQueryData(queryKey);
      return cached as any;
    },
  });

  return {
    ...query,
    sessions: query.data?.data || [],
    meta: query.data?.meta,
    getSession: (sessionId: string): AgnoSession | undefined => {
      return query.data?.data.find((s) => s.session_id === sessionId);
    },
    refresh: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  };
};

export const useAgnoSession = (
  sessionId: string | undefined,
  options: Omit<
    UseAgnoSessionsOptions,
    'workspaceId' | 'projectId' | 'userId' | 'componentId'
  > & {
    workspaceId?: string;
    projectId?: string;
    userId?: string;
    componentId?: string;
  },
) => {
  const agnoSessionsQuery = useAgnoSessions({
    workspaceId: options.workspaceId,
    projectId: options.projectId,
    userId: options.userId,
    componentId: options.componentId,
    enabled: options.enabled && !!sessionId,
  });

  const session = sessionId
    ? agnoSessionsQuery.getSession(sessionId)
    : undefined;

  return {
    ...agnoSessionsQuery,
    session,
    messages: session?.chat_history || [],
  };
};

export const usePrefetchAgnoSessions = () => {
  const queryClient = useQueryClient();

  return (params: GetSessionsParams) => {
    const queryKey = [
      'agno-sessions',
      params.workspace_id,
      params.project_id,
      params.user_id,
      params.component_id,
    ];

    queryClient.prefetchQuery({
      queryKey,
      queryFn: () => AgnoSessionService.getSessions(params),
      staleTime: 5 * 60 * 1000,
    });
  };
};
