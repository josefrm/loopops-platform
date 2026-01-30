import { useMindspaceFiles as useMindspaceFilesQuery } from '@/queries/mindspaceFilesQueries';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';

/**
 * Hook wrapper that uses workspace and project contexts
 * to fetch mindspace files using React Query
 */
export const useMindspaceFiles = () => {
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );
  const selectedProject = useWorkspaceProjectStore((state) =>
    state.getCurrentProject(),
  );

  const workspaceId = currentWorkspace?.id;
  const projectId = selectedProject?.id;

  const query = useMindspaceFilesQuery(workspaceId, projectId);

  return {
    documents: query.data || [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
  };
};
