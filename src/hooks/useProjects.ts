import { useProjectsQuery } from '@/queries/workspaceProjectQueries';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';

interface UseProjectsOptions {
  autoSelectFirst?: boolean;
  onProjectSelected?: (project: any) => void;
}

interface UseProjectsReturn {
  projects: any[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to manage projects for the current workspace
 * Uses the unified workspaceProjectStore as the source of truth
 */
export const useProjects = (
  options: UseProjectsOptions = {},
): UseProjectsReturn => {
  const { autoSelectFirst = false, onProjectSelected } = options;

  // Use the React Query hook which auto-syncs with the store
  const query = useProjectsQuery();

  // Get state from store
  const projects = useWorkspaceProjectStore((state) => state.projects);
  const projectsLoading = useWorkspaceProjectStore(
    (state) => state.projectsLoading,
  );
  const projectsError = useWorkspaceProjectStore(
    (state) => state.projectsError,
  );
  const setCurrentProjectId = useWorkspaceProjectStore(
    (state) => state.setCurrentProjectId,
  );
  const currentProjectId = useWorkspaceProjectStore(
    (state) => state.currentProjectId,
  );

  // Handle auto-select and callback
  // This is handled inside useProjectsQuery now, but we keep the callback support
  if (
    autoSelectFirst &&
    projects.length > 0 &&
    !currentProjectId &&
    onProjectSelected
  ) {
    const selectedProject = projects[0];
    setCurrentProjectId(selectedProject.id);
    onProjectSelected(selectedProject);
  }

  return {
    projects,
    isLoading: projectsLoading || query.isLoading,
    error: projectsError,
    refetch: async () => {
      await query.refetch();
    },
  };
};
