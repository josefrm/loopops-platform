import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { ProjectStageService } from '@/services/ProjectStageService';
import { WorkspaceService } from '@/services/WorkspaceService';
import {
  GetWorkspaceProjectsResponse,
  Project,
  Stage,
  Workspace,
  WorkspaceWithProjects,
  useWorkspaceProjectStore,
} from '@/stores/workspaceProjectStore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// Query keys
export const stageQueryKeys = {
  all: ['stages'] as const,
  list: (projectId: string) =>
    [...stageQueryKeys.all, 'list', projectId] as const,
};

export const workspaceProjectsQueryKeys = {
  all: ['workspace-projects'] as const,
  list: () => [...workspaceProjectsQueryKeys.all, 'list'] as const,
};

// Global subscriber to sync workspace-projects with the store without using useEffect in every hook call.
// This ensures that whenever the cache is updated (via fetch or manual search), the store stays in sync.
queryClient.getQueryCache().subscribe((event) => {
  if (
    event.type === 'updated' &&
    event.query.queryKey[0] === workspaceProjectsQueryKeys.all[0]
  ) {
    const data = event.query.state.data as GetWorkspaceProjectsResponse | undefined;
    if (data) {
      useWorkspaceProjectStore.getState().setWorkspaceProjects(data);
    }
  }
});

/**
 * Fetch all workspaces with their projects using the get-workspace-projects edge function.
 * This is the primary query for workspace and project data.
 */
export const useWorkspaceProjectsQuery = () => {
  const { isFullyAuthenticated } = useAuth();

  return useQuery({
    queryKey: workspaceProjectsQueryKeys.list(),
    queryFn: async () => WorkspaceService.getWorkspaceProjects(),
    enabled: isFullyAuthenticated,
    // Indefinite caching as requested by the user ("ya no cambia")
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });
};

/**
 * Fetch stages for current project and populate the store
 */
export const useStagesQuery = () => {
  const { currentProjectId, setStages, setCurrentStageId, currentStageId } =
    useWorkspaceProjectStore();

  const query = useQuery({
    queryKey: stageQueryKeys.list(currentProjectId ?? ''),
    queryFn: async (): Promise<Stage[]> => {
      if (!currentProjectId) return [];

      const stages = await ProjectStageService.getStages(currentProjectId);
      return stages;
    },
    enabled: !!currentProjectId,
    // Stages might change more often than workspaces/projects
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Sync query results to store
  useEffect(() => {
    if (query.data) {
      setStages(query.data);

      // Auto-select first stage if none selected
      if (!currentStageId && query.data.length > 0) {
        setCurrentStageId(query.data[0].id);
      }
      // Validate current selection still exists
      else if (
        currentStageId &&
        !query.data.find((s) => s.id === currentStageId)
      ) {
        setCurrentStageId(query.data.length > 0 ? query.data[0].id : null);
      }
    }
  }, [query.data, setStages, currentStageId, setCurrentStageId]);

  return query;
};

/**
 * Get the current user's role for a specific project
 */
export const useProjectRole = (projectId: string | null) => {
  const projects = useWorkspaceProjectStore((state) => state.projects);
  const project = projects.find((p) => p.id === projectId);
  return project?.role ?? null;
};

/**
 * Check if user can create projects in current workspace (must be owner)
 */
export const useCanCreateProject = () => {
  const currentWorkspace = useWorkspaceProjectStore((state) =>
    state.getCurrentWorkspace(),
  );
  return currentWorkspace?.role === 'owner';
};

/**
 * Create a new project mutation
 */
export const useCreateProjectMutation = () => {
  const queryClient = useQueryClient();
  const { currentWorkspaceId, setCurrentProjectId } =
    useWorkspaceProjectStore();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      if (!currentWorkspaceId) {
        throw new Error('No workspace selected');
      }

      const result = await WorkspaceService.createProjectV2({
        name: data.name,
        workspace_id: currentWorkspaceId,
      });

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({
        queryKey: workspaceProjectsQueryKeys.list(),
      });

      // Select the new project
      if (result?.project?.id) {
        setCurrentProjectId(result.project.id);
      }

      toast({
        title: 'Project created',
        description: 'Your new project has been created successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to create project. Please try again.',
        variant: 'destructive',
      });
    },
  });
};
