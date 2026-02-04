import { useWorkspaceProjectsQuery } from '@/queries/workspaceProjectQueries';
import {
  Project,
  useWorkspaceProjectStore,
} from '@/stores/workspaceProjectStore';

/**
 * Hook to get the currently selected project
 * Uses shallow comparison to prevent unnecessary re-renders
 */
export const useCurrentProject = (): Project | null => {
  const projects = useWorkspaceProjectStore((state) => state.projects);
  const currentProjectId = useWorkspaceProjectStore(
    (state) => state.currentProjectId,
  );

  return projects.find((p) => p.id === currentProjectId) ?? null;
};

/**
 * Hook to get project loading state
 */
export const useProjectLoading = (): boolean => {
  const query = useWorkspaceProjectsQuery();
  return query.isLoading;
};

/**
 * Hook to get all available projects
 */
export const useAvailableProjects = (): Project[] => {
  return useWorkspaceProjectStore((state) => state.projects);
};

/**
 * Hook to switch project
 */
export const useSwitchProject = () => {
  const setCurrentProjectId = useWorkspaceProjectStore(
    (state) => state.setCurrentProjectId,
  );

  return (projectId: string) => {
    setCurrentProjectId(projectId);
  };
};
