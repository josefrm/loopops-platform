import { useCurrentStage } from '@/hooks/useCurrentStage';
import { Team } from '@/models/Team';
import {
  useStageTemplateDetails,
  useStageTemplateId,
} from '@/queries/stageTemplateQueries';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { transformTeamDetails } from '@/utils/teamTransformers';

interface UseStageTemplateResult {
  stageId: string | null;
  stageTemplate: Team | null;
  isLoadingStageTemplate: boolean;
  error: string | null;
}

export const useStageTemplate = (
  providedStageId?: string | null,
): UseStageTemplateResult => {
  const { currentStage } = useCurrentStage();
  const stageId = providedStageId || currentStage?.project_stage_id || null;

  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );

  const {
    data: agentTemplateId,
    isLoading: isLoadingTemplateId,
    isFetching: isFetchingTemplateId,
    error: templateIdError,
    isSuccess: isSuccessTemplateId,
  } = useStageTemplateId(stageId);

  const {
    data: templateDetails,
    isLoading: isLoadingTemplateDetails,
    isFetching: isFetchingTemplateDetails,
    error: templateDetailsError,
    isSuccess: isSuccessTemplateDetails,
  } = useStageTemplateDetails(agentTemplateId, currentWorkspace?.id);

  const stageTemplate = transformTeamDetails(templateDetails);

  const errorMessage =
    templateIdError || templateDetailsError
      ? templateIdError instanceof Error
        ? templateIdError.message
        : templateDetailsError instanceof Error
          ? templateDetailsError.message
          : 'Unknown error'
      : null;

  // Consider loading only if queries are actively loading/fetching without success yet
  // If a query completes successfully (even with null), it's not loading anymore
  const isLoading =
    isLoadingTemplateId ||
    isLoadingTemplateDetails ||
    (isFetchingTemplateId && !isSuccessTemplateId) ||
    (isFetchingTemplateDetails && !isSuccessTemplateDetails);

  return {
    stageId,
    stageTemplate,
    isLoadingStageTemplate: isLoading,
    error: errorMessage,
  };
};
