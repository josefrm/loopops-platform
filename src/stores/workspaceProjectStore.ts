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
  created_at?: string;
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
  workspacesLoading: boolean;
  workspacesError: string | null;

  // Project state
  projects: Project[];
  currentProjectId: string | null;
  projectsLoading: boolean;
  projectsError: string | null;

  // Stage state
  stages: Stage[];
  currentStageId: number | null;
  stagesLoading: boolean;
  stagesError: string | null;
}

export interface WorkspaceProjectActions {
  // Workspace actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspaceId: (id: string | null) => void;
  setWorkspacesLoading: (loading: boolean) => void;
  setWorkspacesError: (error: string | null) => void;

  // Project actions
  setProjects: (projects: Project[]) => void;
  setCurrentProjectId: (id: string | null) => void;
  setProjectsLoading: (loading: boolean) => void;
  setProjectsError: (error: string | null) => void;

  // Stage actions
  setStages: (stages: Stage[]) => void;
  setCurrentStageId: (id: number | null) => void;
  setStagesLoading: (loading: boolean) => void;
  setStagesError: (error: string | null) => void;

  // Utility actions
  reset: () => void;
  clearWorkspaceData: () => void;
  clearProjectData: () => void;

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
  workspacesLoading: false,
  workspacesError: null,

  projects: [],
  currentProjectId: null,
  projectsLoading: false,
  projectsError: null,

  stages: [],
  currentStageId: null,
  stagesLoading: false,
  stagesError: null,
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

      setWorkspacesLoading: (loading) => set({ workspacesLoading: loading }),
      setWorkspacesError: (error) => set({ workspacesError: error }),

      // Project actions
      setProjects: (projects) => set({ projects }),

      setCurrentProjectId: (id) => {
        set({ currentProjectId: id });
        // Clear stage data when project changes
        if (id !== get().currentProjectId) {
          set({ stages: [], currentStageId: null });
        }
      },

      setProjectsLoading: (loading) => set({ projectsLoading: loading }),
      setProjectsError: (error) => set({ projectsError: error }),

      // Stage actions
      setStages: (stages) => set({ stages }),
      setCurrentStageId: (id) => set({ currentStageId: id }),
      setStagesLoading: (loading) => set({ stagesLoading: loading }),
      setStagesError: (error) => set({ stagesError: error }),

      // Utility actions
      reset: () => set(initialState),

      clearWorkspaceData: () =>
        set({
          workspaces: [],
          currentWorkspaceId: null,
          workspacesError: null,
          projects: [],
          currentProjectId: null,
          projectsError: null,
          stages: [],
          currentStageId: null,
          stagesError: null,
        }),

      clearProjectData: () =>
        set({
          projects: [],
          currentProjectId: null,
          projectsError: null,
          stages: [],
          currentStageId: null,
          stagesError: null,
        }),

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
