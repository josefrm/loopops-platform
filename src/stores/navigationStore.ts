import { Team } from '@/models/Team';
import { callBackendApi } from '@/utils/backendApiHelper';
import { create } from 'zustand';

interface NavigationState {
  teams: Team[];
  loading: boolean;
  error: string | null;
  selectedTeamId?: string;
  isInitialized: boolean;
  setSelectedTeamId: (teamId: string, workspaceId?: string) => void;
  loadTeams: (workspaceId: string) => Promise<void>;
  initializeTeam: (workspaceId: string) => void;
  reset: () => void;
  clearError: () => void;
}

const parseTeams = (data: any): Team[] => {
  if (!data || !Array.isArray(data)) {
    console.warn('Invalid data format for teams:', data);
    return [];
  }
  return data.map((team: any) => ({
    id: team.id,
    name: team.name,
    key: team.id,
    color: team.color || '#000000',
    role: team.role || '',
    model: team.model?.model || '',
    prompt: team.system_message?.instructions || '',
    created_at: team.created_at || '',
    agents: (team.members || []).map((custom: any) => ({
      id: custom.id,
      name: custom.name,
      key: custom.id,
      color: custom.color || '#000000',
      role: custom.role || '',
      model: custom.model?.model || '',
      prompt: custom.system_message?.instructions || '',
      created_at: custom.created_at || '',
    })),
  }));
};

export const useNavigationStore = create<NavigationState>((set, get) => ({
  teams: [],
  loading: false,
  error: null,
  selectedTeamId: undefined,
  isInitialized: false,

  setSelectedTeamId: (teamId: string, workspaceId?: string) => {
    set({ selectedTeamId: teamId });

    // Persist to session storage with workspace-specific key
    if (workspaceId) {
      const storageKey = `selectedTeamId_${workspaceId}`;
      sessionStorage.setItem(storageKey, teamId);
    }
  },

  loadTeams: async (workspaceId: string) => {
    if (!workspaceId) return;

    const { loading, error } = get();

    // Prevent multiple simultaneous loads or retrying after recent error
    if (loading) return;

    // Don't retry immediately if there was a recent error (implement backoff)
    if (error) {
      console.warn(
        'Skipping teams load due to recent error. Use clearError() to retry.',
      );
      return;
    }

    set({ loading: true, error: null });
    try {
      const teamsData = await callBackendApi<any[]>(
        '/api/v1/teams',
        'GET',
        undefined,
        {
          retries: 0, // Disable automatic retries to prevent amplifying the issue
          timeout: 10000, // Shorter timeout
        },
      );
      const teams = parseTeams(teamsData);
      set({ teams, loading: false, error: null });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to load teams';
      console.error('Error loading teams:', error);
      set({
        loading: false,
        error: errorMessage,
        teams: [], // Clear teams on error to prevent stale data
      });
      // Don't throw the error to prevent unhandled promise rejection
    }
  },

  clearError: () => {
    set({ error: null });
  },

  initializeTeam: (workspaceId: string) => {
    const { teams, isInitialized } = get();

    if (teams.length > 0 && !isInitialized && workspaceId) {
      const storageKey = `selectedTeamId_${workspaceId}`;
      const storedTeamId = sessionStorage.getItem(storageKey);
      let teamToSelect = null;

      if (storedTeamId) {
        teamToSelect = teams.find((t) => t.id === storedTeamId);
        if (!teamToSelect) {
          sessionStorage.removeItem(storageKey);
        }
      }

      if (!teamToSelect) {
        teamToSelect = teams[0];
      }

      if (teamToSelect) {
        set({
          selectedTeamId: teamToSelect.id,
          isInitialized: true,
        });
        if (!storedTeamId) {
          sessionStorage.setItem(storageKey, teamToSelect.id);
        }
      }
    }
  },

  reset: () => {
    set({
      teams: [],
      loading: false,
      error: null,
      selectedTeamId: undefined,
      isInitialized: false,
    });
  },
}));
