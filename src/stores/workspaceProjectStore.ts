import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Unified Workspace & Project Store
 *
 * Single source of truth for workspace, project, and stage selection.
 * Replaces: WorkspaceContext, ProjectContext (context), projectContextStore, sessionStore.currentWorkspace
 */

export interface Workspace {
  id: string;
  name: string;
  organization?: string;
  description?: string;
  is_private?: boolean;
  domain?: string | null;
  role?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  name: string;
  key?: string;
  description?: string;
  status?: string;
  workspace_id: string;
  role?: 'owner' | 'member' | string;
  created_at?: string;
}

export interface WorkspaceWithProjects {
  workspace_id: string;
  workspace_name: string;
  projects: {
    project_id: string;
    project_name: string;
    role: 'owner' | 'member' | string;
  }[];
}

export interface GetWorkspaceProjectsResponse {
  workspaces: WorkspaceWithProjects[];
}

export interface Stage {
  id: number;
  name: string;
  priority: number;
  project_stage_id?: string;
  template_id?: string;
}

export interface WorkspaceProjectState {
  // Workspace state
  workspaces: Workspace[];
  currentWorkspaceId: string | null;

  // Project state
  projects: Project[];
  currentProjectId: string | null;

  // Stage state
  stages: Stage[];
  currentStageId: number | null;
}

export interface WorkspaceProjectActions {
  // Workspace actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspaceId: (id: string | null) => void;

  // Project actions
  setProjects: (projects: Project[]) => void;
  setCurrentProjectId: (id: string | null) => void;

  // Stage actions
  setStages: (stages: Stage[]) => void;
  setCurrentStageId: (id: number | null) => void;

  // Utility actions
  reset: () => void;
  clearWorkspaceData: () => void;
  clearProjectData: () => void;
  setWorkspaceProjects: (data: GetWorkspaceProjectsResponse) => void;

  // Computed getters (for convenience, prefer using selectors)
  getCurrentWorkspace: () => Workspace | null;
  getCurrentProject: () => Project | null;
  getCurrentStage: () => Stage | null;
  getNavigationTitle: () => string;
}

export type WorkspaceProjectStore = WorkspaceProjectState &
  WorkspaceProjectActions;

const initialState: WorkspaceProjectState = {
  workspaces: [],
  currentWorkspaceId: null,

  projects: [],
  currentProjectId: null,

  stages: [],
  currentStageId: null,
};

export const useWorkspaceProjectStore = create<WorkspaceProjectStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Workspace actions
      setWorkspaces: (workspaces) => set({ workspaces }),

      setCurrentWorkspaceId: (id) => {
        set({ currentWorkspaceId: id });
        // Clear project and stage data when workspace changes
        if (id !== get().currentWorkspaceId) {
          get().clearProjectData();
        }
      },

      // Project actions
      setProjects: (projects) => set({ projects }),

      setCurrentProjectId: (id) => {
        set({ currentProjectId: id });
        // Clear stage data when project changes
        if (id !== get().currentProjectId) {
          set({ stages: [], currentStageId: null });
        }
      },

      // Stage actions
      setStages: (stages) => set({ stages }),
      setCurrentStageId: (id) => set({ currentStageId: id }),

      // Utility actions
      reset: () => set(initialState),

      clearWorkspaceData: () =>
        set({
          workspaces: [],
          currentWorkspaceId: null,
          projects: [],
          currentProjectId: null,
          stages: [],
          currentStageId: null,
        }),

      clearProjectData: () =>
        set({
          projects: [],
          currentProjectId: null,
          stages: [],
          currentStageId: null,
        }),

      setWorkspaceProjects: (data) => {
        const { currentWorkspaceId, currentProjectId } = get();

        // 1. Transform and set workspaces
        const workspaces: Workspace[] = data.workspaces.map((ws) => ({
          id: ws.workspace_id,
          name: ws.workspace_name,
          organization: ws.workspace_name,
          role: ws.projects.some((p) => p.role === 'owner')
            ? ('owner' as const)
            : ('member' as const),
        }));

        let nextWorkspaceId = currentWorkspaceId;
        // Auto-select first workspace if none selected or if current no longer exists
        if (workspaces.length > 0) {
          if (!currentWorkspaceId || !workspaces.find((w) => w.id === currentWorkspaceId)) {
            nextWorkspaceId = workspaces[0].id;
          }
        } else {
          nextWorkspaceId = null;
        }

        // 2. Find projects for the selected workspace
        const currentWsData = data.workspaces.find(
          (ws) => ws.workspace_id === nextWorkspaceId,
        );

        const projects: Project[] = currentWsData
          ? currentWsData.projects.map((p) => ({
              id: p.project_id,
              name: p.project_name,
              workspace_id: nextWorkspaceId!,
              role: p.role,
            }))
          : [];

        let nextProjectId = currentProjectId;
        // Auto-select first project if none selected or current doesn't exist in new workspace
        if (projects.length > 0) {
          if (!currentProjectId || !projects.find((p) => p.id === currentProjectId)) {
            nextProjectId = projects[0].id;
          }
        } else {
          nextProjectId = null;
        }

        // 3. Batch update state
        set({
          workspaces,
          currentWorkspaceId: nextWorkspaceId,
          projects,
          currentProjectId: nextProjectId,
        });
      },

      // Computed getters
      getCurrentWorkspace: () => {
        const { workspaces, currentWorkspaceId } = get();
        return workspaces.find((w) => w.id === currentWorkspaceId) ?? null;
      },

      getCurrentProject: () => {
        const { projects, currentProjectId } = get();
        return projects.find((p) => p.id === currentProjectId) ?? null;
      },

      getCurrentStage: () => {
        const { stages, currentStageId } = get();
        return stages.find((s) => s.id === currentStageId) ?? null;
      },

      getNavigationTitle: () => {
        const workspace = get().getCurrentWorkspace();
        const project = get().getCurrentProject();

        if (project?.name && workspace?.name) {
          return `${workspace.name} / ${project.name}`;
        }
        if (project?.name) {
          return project.name;
        }
        if (workspace?.name) {
          return workspace.name;
        }
        return 'New Chat';
      },
    }),
    {
      name: 'workspace-project-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Persist IDs and full lists to ensure data availability on reload
        currentWorkspaceId: state.currentWorkspaceId,
        workspaces: state.workspaces,
        currentProjectId: state.currentProjectId,
        projects: state.projects,
        currentStageId: state.currentStageId,
        stages: state.stages,
      }),
    },
  ),
);

// Selector hooks for optimal re-render performance
export const useCurrentWorkspaceId = () =>
  useWorkspaceProjectStore((state) => state.currentWorkspaceId);

export const useCurrentProjectId = () =>
  useWorkspaceProjectStore((state) => state.currentProjectId);

export const useCurrentStageId = () =>
  useWorkspaceProjectStore((state) => state.currentStageId);

export const useWorkspaces = () =>
  useWorkspaceProjectStore((state) => state.workspaces);

export const useProjects = () =>
  useWorkspaceProjectStore((state) => state.projects);

export const useStages = () =>
  useWorkspaceProjectStore((state) => state.stages);
