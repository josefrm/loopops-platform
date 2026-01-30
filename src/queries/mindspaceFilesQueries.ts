import { useQuery } from '@tanstack/react-query';
import { MindspaceFilesService } from '@/services/MindspaceFilesService';

export const mindspaceFilesKeys = {
  all: ['mindspace-files'] as const,
  byWorkspaceProject: (workspaceId: string | undefined, projectId: string | undefined) =>
    [...mindspaceFilesKeys.all, workspaceId, projectId] as const,
};

export const useMindspaceFiles = (
  workspaceId: string | undefined,
  projectId: string | undefined,
) => {
  return useQuery({
    queryKey: mindspaceFilesKeys.byWorkspaceProject(workspaceId, projectId),
    queryFn: async () => {
      if (!workspaceId || !projectId) return [];
      return MindspaceFilesService.getFiles(workspaceId, projectId);
    },
    enabled: !!workspaceId && !!projectId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
};
