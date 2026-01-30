import { DeliverablesService } from '@/services/DeliverablesService';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { useQuery } from '@tanstack/react-query';

export const useStageDeliverables = (stageId: number | undefined) => {
  const selectedProject = useWorkspaceProjectStore((state) =>
    state.getCurrentProject(),
  );

  return useQuery({
    queryKey: ['available-deliverables', selectedProject?.id, stageId],
    queryFn: () => {
      if (!selectedProject?.id || !stageId) {
        return Promise.resolve([]);
      }
      return DeliverablesService.getAvailableDeliverablesForStage(
        selectedProject.id,
        stageId,
      );
    },
    enabled: !!selectedProject?.id && !!stageId,
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });
};
