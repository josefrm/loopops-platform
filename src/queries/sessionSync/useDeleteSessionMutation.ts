import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SessionManagementService } from '@/services/SessionManagementService';
import { sessionSyncKeys } from './sessionSyncKeys';

interface DeleteSessionOptions {
  userId: string;
  stageTemplateId: string;
  stageType: string;
}

export const useDeleteSessionMutation = ({
  userId,
  stageTemplateId,
  stageType,
}: DeleteSessionOptions) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      await SessionManagementService.deleteSession(sessionId);
    },
    onMutate: async (sessionId: string) => {
      const queryKey = sessionSyncKeys.byStage(stageTemplateId, stageType, userId);
      await queryClient.cancelQueries({ queryKey });
      const previousSessions = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old) return old;
        return old.filter((session: any) => session.session_id !== sessionId);
      });
      return { previousSessions, queryKey };
    },
    onError: (err, sessionId, context: any) => {
      if (context?.previousSessions) {
        queryClient.setQueryData(context.queryKey, context.previousSessions);
      }
    },
  });
};

export const useDeleteSessionGenericMutation = () => {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      await SessionManagementService.deleteSession(sessionId);
    },
  });
};
