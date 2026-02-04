import { useWorkspaceProjectsQuery } from '@/queries/workspaceProjectQueries';
import {
  useWorkspaceProjectStore,
  Workspace,
} from '@/stores/workspaceProjectStore';

/**
 * Hook to get the currently selected workspace
 * Uses shallow comparison to prevent unnecessary re-renders
 */
export const useCurrentWorkspace = (): Workspace | null => {
  const workspaces = useWorkspaceProjectStore((state) => state.workspaces);
  const currentWorkspaceId = useWorkspaceProjectStore(
    (state) => state.currentWorkspaceId,
  );

  return workspaces.find((w) => w.id === currentWorkspaceId) ?? null;
};

/**
 * Hook to get workspace loading state
 */
export const useWorkspaceLoading = (): boolean => {
  const query = useWorkspaceProjectsQuery();
  return query.isLoading;
};

/**
 * Hook to get all available workspaces
 */
export const useAvailableWorkspaces = (): Workspace[] => {
  return useWorkspaceProjectStore((state) => state.workspaces);
};

/**
 * Hook to switch workspace
 */
export const useSwitchWorkspace = () => {
  const setCurrentWorkspaceId = useWorkspaceProjectStore(
    (state) => state.setCurrentWorkspaceId,
  );

  return (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
  };
};
