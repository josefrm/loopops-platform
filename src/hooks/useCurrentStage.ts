import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { useSearchParams } from 'react-router-dom';
import { useProjectStages } from './useProjectStages';

export const useCurrentStage = () => {
  const [searchParams] = useSearchParams();
  const selectedProject = useWorkspaceProjectStore((state) =>
    state.getCurrentProject(),
  );
  const storeStageId = useWorkspaceProjectStore(
    (state) => state.currentStageId,
  );
  const { data: stages = [], isLoading } = useProjectStages(
    selectedProject?.id,
  );

  // Use URL param first, then fall back to store's currentStageId
  const stageParam = searchParams.get('stage');
  const currentStagePriority = stageParam
    ? parseInt(stageParam)
    : storeStageId ?? undefined;
  const currentStage = stages.find((s) => s.priority === currentStagePriority);

  return {
    currentStage,
    currentStagePriority,
    stages,
    isLoading,
    selectedProject,
  };
};
