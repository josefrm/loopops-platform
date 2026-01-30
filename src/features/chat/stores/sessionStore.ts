import { produce } from 'immer';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Session Store - Manages session lifecycle and metadata
 *
 * @note This store only manages session state. For workspace/project state,
 * use `useWorkspaceProjectStore` from '@/stores/workspaceProjectStore'.
 */

interface SessionMetadata {
  sessionId: string;
  title?: string;
  loadedAt?: Date;
  createdAt?: Date;
  createdTimestamp?: number;
  isHistoryLoaded: boolean;
  stageId?: number;
  lastSeenMessageCount?: number;
  isCreating?: boolean;
  isDeleting?: boolean;
  historyPreloaded?: boolean;
  historyPreloadedAt?: number;
}

interface SessionState {
  // Sesiones activas por tabId
  sessionsByTab: Record<string, SessionMetadata>;
  // Active session (current tab)
  activeSessionId: string | null;
  // Active tab per stage
  stageActiveTabs: Record<string, string>;
  /**
   * @deprecated Use `useWorkspaceProjectStore` instead
   * Kept for backwards compatibility during migration
   */
  currentWorkspace: {
    id: string;
    name: string;
  } | null;
}

interface SessionActions {
  // Session lifecycle
  createSession: (
    tabId: string,
    metadata: Omit<SessionMetadata, 'isHistoryLoaded' | 'loadedAt'>,
  ) => void;
  updateSession: (tabId: string, updates: Partial<SessionMetadata>) => void;
  deleteSession: (tabId: string) => void;

  // Active session
  setActiveSession: (sessionId: string | null) => void;

  // Queries
  getSession: (tabId: string) => SessionMetadata | undefined;
  getActiveSession: () => SessionMetadata | undefined;

  // History loading state
  markHistoryLoaded: (tabId: string) => void;
  markHistoryPreloaded: (tabId: string) => void; // Nuevo: marca historial como precargado
  isHistoryLoaded: (tabId: string) => boolean;
  isHistoryPreloaded: (tabId: string) => boolean; // Nuevo: verifica si historial fue precargado
  needsHistoryLoad: (tabId: string) => boolean; // Nuevo: determina si necesita cargar historial

  // New messages tracking
  markMessagesSeen: (tabId: string, count: number) => void;
  hasNewMessages: (tabId: string, currentCount: number) => boolean;

  // Stage active tabs management
  setStageActiveTab: (stageTemplateId: string, tabId: string) => void;
  getStageActiveTab: (stageTemplateId: string) => string | undefined;

  // Tab creation from existing session
  createTabFromSession: (
    sessionId: string,
    stageId: number,
    stageTemplateId?: string,
    title?: string,
  ) => string;

  /**
   * @deprecated Use `useWorkspaceProjectStore.setCurrentWorkspaceId()` instead
   */
  setCurrentWorkspace: (workspace: { id: string; name: string } | null) => void;
  /**
   * @deprecated Use `useWorkspaceProjectStore.getCurrentWorkspace()` instead
   */
  getCurrentWorkspace: () => { id: string; name: string } | null;

  // Store cleanup
  clearStore: () => void;
  clearSessionsForStage: (stageId: number) => void;
}

type SessionStore = SessionState & SessionActions;

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      // State inicial
      sessionsByTab: {},
      activeSessionId: null,
      stageActiveTabs: {},
      currentWorkspace: null,

      // Session lifecycle
      createSession: (tabId, metadata) =>
        set(
          produce((draft) => {
            const now = new Date();
            const timestamp = metadata.createdTimestamp || Date.now();

            draft.sessionsByTab[tabId] = {
              ...metadata,
              isHistoryLoaded: false,
              loadedAt: now,
              createdTimestamp: timestamp,
            };
          }),
        ),

      updateSession: (tabId, updates) =>
        set(
          produce((draft) => {
            if (draft.sessionsByTab[tabId]) {
              const existingCreatedTimestamp =
                draft.sessionsByTab[tabId].createdTimestamp;
              Object.assign(draft.sessionsByTab[tabId], updates);
              if (existingCreatedTimestamp && !updates.createdTimestamp) {
                draft.sessionsByTab[tabId].createdTimestamp =
                  existingCreatedTimestamp;
              }
            }
          }),
        ),

      deleteSession: (tabId) =>
        set(
          produce((draft) => {
            delete draft.sessionsByTab[tabId];
          }),
        ),

      // Active session
      setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),

      // Queries
      getSession: (tabId) => {
        return get().sessionsByTab[tabId];
      },

      getActiveSession: () => {
        const { activeSessionId, sessionsByTab } = get();
        if (!activeSessionId) return undefined;

        // Find tab with this session
        const tabId = Object.keys(sessionsByTab).find(
          (tab) => sessionsByTab[tab].sessionId === activeSessionId,
        );
        return tabId ? sessionsByTab[tabId] : undefined;
      },

      // History loading
      markHistoryLoaded: (tabId) =>
        set(
          produce((draft) => {
            if (draft.sessionsByTab[tabId]) {
              draft.sessionsByTab[tabId].isHistoryLoaded = true;
            }
          }),
        ),

      markHistoryPreloaded: (tabId) =>
        set(
          produce((draft) => {
            if (draft.sessionsByTab[tabId]) {
              draft.sessionsByTab[tabId].isHistoryLoaded = true;
              draft.sessionsByTab[tabId].historyPreloaded = true;
              draft.sessionsByTab[tabId].historyPreloadedAt = Date.now();
            }
          }),
        ),

      isHistoryLoaded: (tabId) => {
        return get().sessionsByTab[tabId]?.isHistoryLoaded || false;
      },

      isHistoryPreloaded: (tabId) => {
        return get().sessionsByTab[tabId]?.historyPreloaded || false;
      },

      needsHistoryLoad: (tabId) => {
        const session = get().sessionsByTab[tabId];
        if (!session) return false;
        
        if (session.isHistoryLoaded) return false;
        
        if (session.historyPreloaded && session.historyPreloadedAt) {
          const fiveMinutes = 5 * 60 * 1000;
          const timeSincePreload = Date.now() - session.historyPreloadedAt;
          if (timeSincePreload < fiveMinutes) {
            return false;
          }
        }
        
        return true;
      },

      // New messages tracking
      markMessagesSeen: (tabId, count) =>
        set(
          produce((draft) => {
            if (draft.sessionsByTab[tabId]) {
              draft.sessionsByTab[tabId].lastSeenMessageCount = count;
            }
          }),
        ),

      hasNewMessages: (tabId, currentCount) => {
        const lastSeen = get().sessionsByTab[tabId]?.lastSeenMessageCount;
        return lastSeen !== undefined && currentCount > lastSeen;
      },

      // Stage active tabs management
      setStageActiveTab: (stageTemplateId, tabId) =>
        set(
          produce((draft) => {
            draft.stageActiveTabs[stageTemplateId] = tabId;
          }),
        ),

      getStageActiveTab: (stageTemplateId) => {
        return get().stageActiveTabs[stageTemplateId];
      },

      createTabFromSession: (
        sessionId,
        stageId,
        stageTemplateId,
        title = 'Loop',
      ) => {
        const {
          sessionsByTab,
          createSession,
          setActiveSession,
          setStageActiveTab,
        } = get();

        const existingTabId = Object.keys(sessionsByTab).find(
          (tabId) => sessionsByTab[tabId].sessionId === sessionId,
        );

        if (existingTabId) {
          setActiveSession(sessionId);
          return existingTabId;
        }

        const newTabId = `tab-${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}`;

        createSession(newTabId, {
          sessionId,
          title,
          stageId,
          isCreating: false,
        });

        setActiveSession(sessionId);

        if (stageTemplateId) {
          setStageActiveTab(stageTemplateId, newTabId);
        }

        return newTabId;
      },

      // Workspace management
      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),

      getCurrentWorkspace: () => {
        return get().currentWorkspace;
      },

      clearStore: () =>
        set({
          sessionsByTab: {},
          activeSessionId: null,
          stageActiveTabs: {},
          currentWorkspace: null,
        }),

      clearSessionsForStage: (stageId) =>
        set(
          produce((draft) => {
            // Delete all sessions for this stage AND sessions without stageId (legacy)
            Object.keys(draft.sessionsByTab).forEach((tabId) => {
              const sessionStageId = draft.sessionsByTab[tabId].stageId;
              // Remove if: matches the stage OR doesn't have stageId (legacy sessions)
              if (sessionStageId === stageId || !sessionStageId) {
                delete draft.sessionsByTab[tabId];
              }
            });
            // Clear active session if it was from this stage
            if (draft.activeSessionId) {
              const activeTabId = Object.keys(draft.sessionsByTab).find(
                (tabId) => draft.sessionsByTab[tabId].sessionId === draft.activeSessionId,
              );
              if (!activeTabId) {
                draft.activeSessionId = null;
              }
            }
          }),
        ),
    }),
    {
      name: 'loopops-session-store',
      version: 1,
      storage: createJSONStorage(() => localStorage, {
        reviver: (key, value) => {
          if (key === 'createdAt' || key === 'loadedAt') {
            return value ? new Date(value as string) : value;
          }
          return value;
        },
      }),
      partialize: (state) => ({
        sessionsByTab: state.sessionsByTab,
        stageActiveTabs: state.stageActiveTabs,
        activeSessionId: state.activeSessionId,
        currentWorkspace: state.currentWorkspace,
      }),
      migrate: (persistedState: any) => {
        if (persistedState?.sessionsByTab) {
          Object.keys(persistedState.sessionsByTab).forEach((tabId) => {
            const session = persistedState.sessionsByTab[tabId];
            if (!session.createdTimestamp) {
              if (session.createdAt) {
                session.createdTimestamp = new Date(
                  session.createdAt,
                ).getTime();
              } else {
                session.createdTimestamp = 0;
              }
            }
          });
        }
        return persistedState;
      },
    },
  ),
);
