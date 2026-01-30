import { Stage } from '@/components/projectContext/TabNavigationControl';
import { ProjectStageService } from '@/services/ProjectStageService';
import { create } from 'zustand';

interface StagesState {
  stages: Stage[];
  loading: boolean;
  selectedStageId?: number;
  isInitialized: boolean;
  setSelectedStageId: (
    stageId: number,
    projectId?: string,
    updateUrl?: boolean,
  ) => void;
  loadStages: (projectId?: string) => Promise<void>;
  initializeStage: (projectId?: string) => void;
  initializeFromUrl: (stageId: number, projectId?: string) => void;
  getSelectedStageTeamId: () => string | undefined;
  getSelectedProjectStageId: () => string | undefined;
  reset: () => void;
}

export const useStagesStore = create<StagesState>((set, get) => ({
  stages: [],
  loading: false,
  selectedStageId: undefined,
  isInitialized: false,

  setSelectedStageId: (
    stageId: number,
    projectId?: string,
    updateUrl: boolean = true,
  ) => {
    set({ selectedStageId: stageId });

    // Persist to session storage with project-specific key
    if (projectId) {
      const storageKey = `selectedStageId_${projectId}`;
      sessionStorage.setItem(storageKey, stageId.toString());
    }

    // Update URL if requested
    if (updateUrl && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('stage', stageId.toString());
      window.history.replaceState({}, '', url.toString());
    }
  },

  loadStages: async (projectId?: string) => {
    set({ loading: true });
    try {
      const stages = await ProjectStageService.getStages(projectId);
      set({ stages, loading: false });
    } catch (error) {
      console.error('Error loading stages:', error);
      set({ loading: false });
      throw error;
    }
  },

  initializeStage: (projectId?: string) => {
    const { stages, isInitialized } = get();

    if (stages.length > 0 && !isInitialized) {
      const storageKey = projectId
        ? `selectedStageId_${projectId}`
        : 'selectedStageId';
      const storedStageId = sessionStorage.getItem(storageKey);
      let stageToSelect = null;

      if (storedStageId) {
        const stageId = parseInt(storedStageId, 10);
        stageToSelect = stages.find((s) => s.id === stageId);
        if (!stageToSelect) {
          sessionStorage.removeItem(storageKey);
        }
      }

      if (!stageToSelect) {
        stageToSelect = stages[0];
      }

      if (stageToSelect) {
        set({
          selectedStageId: stageToSelect.id,
          isInitialized: true,
        });
        if (!storedStageId && projectId) {
          sessionStorage.setItem(storageKey, stageToSelect.id.toString());
        }
      }
    }
  },

  initializeFromUrl: (stageId: number, projectId?: string) => {
    const { stages } = get();

    // Verify the stage exists
    const stageExists = stages.find((s) => s.id === stageId);
    if (stageExists) {
      set({
        selectedStageId: stageId,
        isInitialized: true,
      });

      // Persist to session storage
      if (projectId) {
        const storageKey = `selectedStageId_${projectId}`;
        sessionStorage.setItem(storageKey, stageId.toString());
      }
    }
  },

  getSelectedStageTeamId: () => {
    const { stages, selectedStageId } = get();
    if (!selectedStageId) return undefined;
    const selectedStage = stages.find((s) => s.id === selectedStageId);
    return selectedStage?.team_id;
  },

  getSelectedProjectStageId: () => {
    const { stages, selectedStageId } = get();
    if (!selectedStageId) return undefined;

    const selectedStage = stages.find((s) => s.id === selectedStageId);
    return selectedStage?.project_stage_id;
  },

  reset: () => {
    set({
      stages: [],
      loading: false,
      selectedStageId: undefined,
      isInitialized: false,
    });
  },
}));
