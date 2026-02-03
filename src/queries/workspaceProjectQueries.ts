import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
export const workspaceQueryKeys = {
  all: ['workspaces'] as const,
  list: () => [...workspaceQueryKeys.all, 'list'] as const,
  detail: (id: string) => [...workspaceQueryKeys.all, id] as const,
};

export const projectQueryKeys = {
  all: ['projects'] as const,
  list: (workspaceId: string) =>
    [...projectQueryKeys.all, 'list', workspaceId] as const,
  detail: (id: string) => [...projectQueryKeys.all, id] as const,
};

export const stageQueryKeys = {
  all: ['stages'] as const,
  list: (projectId: string) =>
    [...stageQueryKeys.all, 'list', projectId] as const,
};

export const workspaceProjectsQueryKeys = {
  all: ['workspace-projects'] as const,
  list: () => [...workspaceProjectsQueryKeys.all, 'list'] as const,
};

/**
 * Fetch user's workspaces and populate the store
 */
export const useWorkspacesQuery = () => {
  const { user, isFullyAuthenticated } = useAuth();
  const { toast } = useToast();
  const {
    setWorkspaces,
    setCurrentWorkspaceId,
    setWorkspacesLoading,
    setWorkspacesError,
    currentWorkspaceId,
  } = useWorkspaceProjectStore();

  const query = useQuery({
    queryKey: workspaceQueryKeys.list(),
    queryFn: async (): Promise<Workspace[]> => {
      if (!user?.id) return [];

      // Use WorkspaceService which handles both owned and invited workspaces
      try {
        const workspaces = await WorkspaceService.getUserWorkspacesV2();

        return workspaces.map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
          organization: workspace.name,
          description: '',
          is_private: false,
          domain: null,
          role: workspace.role || 'member',
          created_at: workspace.created_at,
        }));
      } catch (error) {
        console.error('Error fetching workspaces from V2:', error);

        // Fall back to old schema if V2 fails
        const { data: memberData, error: memberError } = await supabase
          .from('workspace_members')
          .select(
            `
            workspace_id,
            role,
            team,
            workspaces!inner (
              id,
              name,
              organization,
              description,
              is_private,
              domain
            )
          `,
          )
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (memberError) throw memberError;

        return (memberData || []).map((item: any) => ({
          id: item.workspaces.id,
          name: item.workspaces.name,
          organization: item.workspaces.organization,
          description: item.workspaces.description,
          is_private: item.workspaces.is_private,
          domain: item.workspaces.domain,
          role: item.role,
        }));
      }
    },
    enabled: isFullyAuthenticated && !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync query results to store
  useEffect(() => {
    setWorkspacesLoading(query.isLoading);
  }, [query.isLoading, setWorkspacesLoading]);

  useEffect(() => {
    if (query.error) {
      const errorMessage =
        query.error instanceof Error
          ? query.error.message
          : 'Failed to load workspaces';
      setWorkspacesError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } else {
      setWorkspacesError(null);
    }
  }, [query.error, setWorkspacesError, toast]);

  useEffect(() => {
    if (query.data) {
      setWorkspaces(query.data);

      // Auto-select first workspace if none selected
      if (!currentWorkspaceId && query.data.length > 0) {
        setCurrentWorkspaceId(query.data[0].id);
      }
      // Validate current selection still exists
      else if (
        currentWorkspaceId &&
        !query.data.find((w) => w.id === currentWorkspaceId)
      ) {
        setCurrentWorkspaceId(query.data.length > 0 ? query.data[0].id : null);
      }
    }
  }, [query.data, setWorkspaces, currentWorkspaceId, setCurrentWorkspaceId]);

  return query;
};

/**
 * Fetch projects for current workspace and populate the store
 */
export const useProjectsQuery = () => {
  const { toast } = useToast();
  const {
    currentWorkspaceId,
    setProjects,
    setCurrentProjectId,
    setProjectsLoading,
    setProjectsError,
    currentProjectId,
  } = useWorkspaceProjectStore();

  const query = useQuery({
    queryKey: projectQueryKeys.list(currentWorkspaceId ?? ''),
    queryFn: async (): Promise<Project[]> => {
      if (!currentWorkspaceId) return [];

      const projects = await WorkspaceService.getProjectsByWorkspaceV2(
        currentWorkspaceId,
      );

      return projects.map((p: any) => ({
        id: p.id,
        name: p.name,
        key: p.key || p.id,
        description: p.description,
        status: p.status,
        workspace_id: currentWorkspaceId,
        created_at: p.created_at,
      }));
    },
    enabled: !!currentWorkspaceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Sync query results to store
  useEffect(() => {
    setProjectsLoading(query.isLoading);
  }, [query.isLoading, setProjectsLoading]);

  useEffect(() => {
    if (query.error) {
      const errorMessage =
        query.error instanceof Error
          ? query.error.message
          : 'Failed to load projects';
      setProjectsError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } else {
      setProjectsError(null);
    }
  }, [query.error, setProjectsError, toast]);

  useEffect(() => {
    if (query.data) {
      setProjects(query.data);

      // Auto-select first project if none selected
      if (!currentProjectId && query.data.length > 0) {
        setCurrentProjectId(query.data[0].id);
      }
      // Validate current selection still exists
      else if (
        currentProjectId &&
        !query.data.find((p) => p.id === currentProjectId)
      ) {
        setCurrentProjectId(query.data.length > 0 ? query.data[0].id : null);
      }
    }
  }, [query.data, setProjects, currentProjectId, setCurrentProjectId]);

  return query;
};

/**
 * Fetch stages for current project and populate the store
 */
export const useStagesQuery = () => {
  const {
    currentProjectId,
    setStages,
    setCurrentStageId,
    setStagesLoading,
    setStagesError,
    currentStageId,
  } = useWorkspaceProjectStore();

  const query = useQuery({
    queryKey: stageQueryKeys.list(currentProjectId ?? ''),
    queryFn: async (): Promise<Stage[]> => {
      if (!currentProjectId) return [];

      const stages = await ProjectStageService.getStages(currentProjectId);
      return stages;
    },
    enabled: !!currentProjectId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Sync query results to store
  useEffect(() => {
    setStagesLoading(query.isLoading);
  }, [query.isLoading, setStagesLoading]);

  useEffect(() => {
    if (query.error) {
      const errorMessage =
        query.error instanceof Error
          ? query.error.message
          : 'Failed to load stages';
      setStagesError(errorMessage);
    } else {
      setStagesError(null);
    }
  }, [query.error, setStagesError]);

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
 * Fetch all workspaces with their projects using the get-workspace-projects edge function
 * Returns workspaces with projects including user roles for each project
 */
export const useWorkspaceProjectsQuery = () => {
  const { isFullyAuthenticated } = useAuth();
  const { toast } = useToast();
  const {
    setWorkspaces,
    setProjects,
    setCurrentWorkspaceId,
    setCurrentProjectId,
    setWorkspacesLoading,
    setWorkspacesError,
    setProjectsLoading,
    setProjectsError,
    currentWorkspaceId,
    currentProjectId,
  } = useWorkspaceProjectStore();

  const query = useQuery({
    queryKey: workspaceProjectsQueryKeys.list(),
    queryFn: async (): Promise<GetWorkspaceProjectsResponse> => {
      return WorkspaceService.getWorkspaceProjects();
    },
    enabled: isFullyAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sync query results to store
  useEffect(() => {
    setWorkspacesLoading(query.isLoading);
    setProjectsLoading(query.isLoading);
  }, [query.isLoading, setWorkspacesLoading, setProjectsLoading]);

  useEffect(() => {
    if (query.error) {
      const errorMessage =
        query.error instanceof Error
          ? query.error.message
          : 'Failed to load workspace projects';
      setWorkspacesError(errorMessage);
      setProjectsError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } else {
      setWorkspacesError(null);
      setProjectsError(null);
    }
  }, [query.error, setWorkspacesError, setProjectsError, toast]);

  // Effect to set workspaces when data arrives
  useEffect(() => {
    if (query.data?.workspaces) {
      // Transform workspaces for the store
      const workspaces: Workspace[] = query.data.workspaces.map((ws) => ({
        id: ws.workspace_id,
        name: ws.workspace_name,
        organization: ws.workspace_name,
        role: ws.projects.some((p) => p.role === 'owner') ? 'owner' : 'member',
      }));
      setWorkspaces(workspaces);

      // Auto-select first workspace if none selected
      if (!currentWorkspaceId && workspaces.length > 0) {
        setCurrentWorkspaceId(workspaces[0].id);
      }
      // Validate current selection still exists
      else if (
        currentWorkspaceId &&
        !workspaces.find((w) => w.id === currentWorkspaceId)
      ) {
        setCurrentWorkspaceId(workspaces.length > 0 ? workspaces[0].id : null);
      }
    }
  }, [query.data, setWorkspaces, currentWorkspaceId, setCurrentWorkspaceId]);

  // Effect to update projects when workspace changes or data arrives
  useEffect(() => {
    if (!query.data?.workspaces || !currentWorkspaceId) return;

    const currentWs = query.data.workspaces.find(
      (ws) => ws.workspace_id === currentWorkspaceId,
    );

    if (currentWs) {
      const projects: Project[] = currentWs.projects.map((p) => ({
        id: p.project_id,
        name: p.project_name,
        workspace_id: currentWs.workspace_id,
        role: p.role,
      }));
      setProjects(projects);

      // Auto-select first project if none selected or current doesn't exist in new workspace
      const currentProjectExists = projects.find((p) => p.id === currentProjectId);
      if (!currentProjectId || !currentProjectExists) {
        setCurrentProjectId(projects.length > 0 ? projects[0].id : null);
      }
    } else {
      // Workspace not found in data, clear projects
      setProjects([]);
      setCurrentProjectId(null);
    }
  }, [
    query.data,
    currentWorkspaceId,
    currentProjectId,
    setProjects,
    setCurrentProjectId,
  ]);

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
      // Invalidate projects query to refetch
      queryClient.invalidateQueries({
        queryKey: projectQueryKeys.list(currentWorkspaceId ?? ''),
      });
      // Also invalidate workspace-projects query
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
