import { useQueryClient } from '@tanstack/react-query';
import { sessionSyncKeys } from './sessionSyncKeys';

export const useInvalidateStageSessionsQuery = () => {
  const queryClient = useQueryClient();

  const invalidateStageSessions = (
    stageTemplateId: string,
    stageType: string,
    userId: string
  ) => {
    queryClient.invalidateQueries({
      queryKey: sessionSyncKeys.byStage(stageTemplateId, stageType, userId),
    });
  };

  const clearMessageCaches = () => {
    queryClient.removeQueries({ queryKey: ['sessions', 'messages'] });
  };

  return {
    invalidateStageSessions,
    clearMessageCaches,
  };
};
