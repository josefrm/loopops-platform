import { ProjectStageService } from '@/services/ProjectStageService';
import { useQuery } from '@tanstack/react-query';

export const ASSETS_QUERY_KEY = 'projectAssets';
export const ARTIFACTS_QUERY_KEY = 'stageArtifacts';

export const useProjectAssets = (projectId: string | undefined) => {
  return useQuery({
    queryKey: [ASSETS_QUERY_KEY, projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return await ProjectStageService.getProjectAssets(projectId);
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useStageArtifacts = (
  workspaceId: string | undefined,
  projectId: string | undefined,
  stageId: string | undefined,
) => {
  return useQuery({
    queryKey: [ARTIFACTS_QUERY_KEY, workspaceId, projectId, stageId],
    queryFn: async () => {
      if (!workspaceId || !projectId || !stageId) return [];
      return await ProjectStageService.getStageArtifacts(
        workspaceId,
        projectId,
        stageId,
      );
    },
    enabled: !!workspaceId && !!projectId && !!stageId,
  });
};
