import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SessionManagementService } from '@/services/SessionManagementService';
import { useMessageStore } from '@/features/chat/stores/messageStore';
import { useSessionStore } from '@/features/chat/stores/sessionStore';

interface DeleteSessionOptions {
  workspaceId?: string;
  projectId?: string;
  userId?: string;
  componentId?: string;
}

export const useDeleteAgnoSession = (options: DeleteSessionOptions = {}) => {
  const queryClient = useQueryClient();
  const messageStore = useMessageStore.getState();
  const sessionStore = useSessionStore.getState();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      await SessionManagementService.deleteSession(sessionId);
      return sessionId;
    },
    onMutate: async (sessionId: string) => {
      const queryKey = [
        'agno-sessions',
        options.workspaceId,
        options.projectId,
        options.userId,
        options.componentId,
      ];

      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((s: any) => s.session_id !== sessionId),
          meta: {
            ...old.meta,
            total_count: Math.max(0, (old.meta?.total_count || 1) - 1),
          },
        };
      });

      const tabEntry = Object.entries(sessionStore.sessionsByTab).find(
        ([_, session]) => session.sessionId === sessionId,
      );
      if (tabEntry) {
        const [tabId] = tabEntry;
        sessionStore.deleteSession(tabId);
      }

      messageStore.clearMessages(sessionId);

      return { previousData, queryKey };
    },
    onError: (err, sessionId, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
  });
};

export const useUpdateAgnoSession = (options: DeleteSessionOptions = {}) => {
  const queryClient = useQueryClient();
  const sessionStore = useSessionStore.getState();

  return useMutation({
    mutationFn: async ({
      sessionId,
      sessionName,
    }: {
      sessionId: string;
      sessionName: string;
    }) => {
      await SessionManagementService.updateSessionName(sessionId, sessionName);
      return { sessionId, sessionName };
    },
    onMutate: async ({ sessionId, sessionName }) => {
      const queryKey = [
        'agno-sessions',
        options.workspaceId,
        options.projectId,
        options.userId,
        options.componentId,
      ];

      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((s: any) =>
            s.session_id === sessionId
              ? { ...s, session_name: sessionName }
              : s,
          ),
        };
      });

      const tabEntry = Object.entries(sessionStore.sessionsByTab).find(
        ([_, session]) => session.sessionId === sessionId,
      );
      if (tabEntry) {
        const [tabId] = tabEntry;
        sessionStore.updateSession(tabId, { title: sessionName });
      }

      return { previousData, queryKey };
    },
    onError: (err, variables, context: any) => {
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
  });
};

export const useInvalidateAgnoSessions = () => {
  const queryClient = useQueryClient();

  return (options: DeleteSessionOptions) => {
    const queryKey = [
      'agno-sessions',
      options.workspaceId,
      options.projectId,
      options.userId,
      options.componentId,
    ];

    queryClient.invalidateQueries({ queryKey });
    queryClient.refetchQueries({ queryKey });
  };
};

export const useAgnoSessionMutation = <TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: DeleteSessionOptions & {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
  } = {},
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      const queryKey = [
        'agno-sessions',
        options.workspaceId,
        options.projectId,
        options.userId,
        options.componentId,
      ];
      queryClient.invalidateQueries({ queryKey });

      // Callback custom
      options.onSuccess?.(data, variables);
    },
    onError: (error: any, variables) => {
      console.error('Mutation error:', error);
      options.onError?.(error, variables);
    },
  });
};
