import { useAuth } from '@/contexts/AuthContext';
import { AgnoSession } from '@/services/AgnoSessionService';
import { StageTemplateService } from '@/services/StageTemplateService';
import { isValidSessionId } from '@/utils/sessionValidation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

export const queryKeys = {
  sessions: {
    all: ['sessions'] as const,
    detail: (sessionId: string) => ['sessions', sessionId] as const,
    messages: (sessionId: string) =>
      ['sessions', sessionId, 'messages'] as const,
  },
};

export const useSessionMessages = (
  sessionId: string | null,
  _enabled: boolean = true,
  _sessionType?: 'agent' | 'team',
) => {
  const queryClient = useQueryClient();

  const cachedMessages = useMemo(() => {
    if (!sessionId || !isValidSessionId(sessionId)) return [];

    const agnoSessionsData = queryClient.getQueryData<AgnoSession[]>([
      'agno-sessions',
    ]);
    if (!agnoSessionsData) return null;

    const session = agnoSessionsData.find((s) => s.session_id === sessionId);
    return session?.chat_history || [];
  }, [sessionId, queryClient]);

  return useQuery({
    queryKey: queryKeys.sessions.messages(sessionId || 'none'),
    queryFn: async () => cachedMessages || [],
    enabled: false,
    initialData: cachedMessages || [],
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

export const useCreateSession = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: {
      sessionName?: string;
      workspaceId: string;
      projectId?: string;
      sessionType: 'agent' | 'team' | 'workflow';
      componentId?: string;
    }) => {
      if (!user) {
        throw new Error('User authentication required');
      }

      const sessionResponse = await StageTemplateService.createSession({
        sessionName: options.sessionName || 'New Chat',
        userId: user.id,
        workspaceId: options.workspaceId,
        projectId: options.projectId,
        sessionType: options.sessionType,
        componentId: options.componentId,
      });
      return sessionResponse.session_id;
    },
    onSuccess: (sessionId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
      queryClient.setQueryData(queryKeys.sessions.messages(sessionId), []);
    },
  });
};

export const useInvalidateSessionMessages = () => {
  const queryClient = useQueryClient();

  return (sessionId: string) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.sessions.messages(sessionId),
    });
  };
};

export const usePrefetchSessionMessages = () => {
  const queryClient = useQueryClient();

  return async (sessionId: string, _sessionType?: 'agent' | 'team') => {
    if (!sessionId) return;

    const agnoSessionsData = queryClient.getQueryData<AgnoSession[]>([
      'agno-sessions',
    ]);
    if (!agnoSessionsData) return;

    const session = agnoSessionsData.find((s) => s.session_id === sessionId);
    const messages = session?.chat_history || [];

    await queryClient.prefetchQuery({
      queryKey: queryKeys.sessions.messages(sessionId),
      queryFn: async () => messages,
      staleTime: Infinity,
    });
  };
};
