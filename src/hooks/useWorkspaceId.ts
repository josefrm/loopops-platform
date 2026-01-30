import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';

/**
 * Hook to get the current workspace ID
 * Uses the unified workspaceProjectStore as the single source of truth
 */
export const useWorkspaceId = (): string | null => {
  return useWorkspaceProjectStore((state) => state.currentWorkspaceId);
};
