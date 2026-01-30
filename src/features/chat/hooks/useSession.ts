import { useCallback, useMemo } from 'react';
import { useSessionStore } from '../stores/sessionStore';

/**
 * Hook para manejo de sesión y su lifecycle
 * Separado para mejor organización
 */

export interface UseSessionResult {
  sessionId: string | null;
  title: string | undefined;
  isHistoryLoaded: boolean;
  metadata: {
    stageId?: number;
    workspaceId?: string;
    projectId?: string;
  };
  createSession: (sessionId: string, metadata?: {
    title?: string;
    stageId?: number;
    workspaceId?: string;
    projectId?: string;
  }) => void;
  updateTitle: (title: string) => void;
  updateMetadata: (metadata: Partial<{
    stageId?: number;
    workspaceId?: string;
    projectId?: string;
  }>) => void;
  markHistoryLoaded: () => void;
}

export function useSession(tabId: string): UseSessionResult {
  // Suscribirse solo a la sesión específica para evitar re-renders innecesarios
  const session = useSessionStore(
    useCallback((state) => state.sessionsByTab[tabId], [tabId])
  );

  // Create session - No incluir stores en dependencias
  const createSession = useCallback(
    (
      sessionId: string,
      metadata?: {
        title?: string;
        stageId?: number;
        workspaceId?: string;
        projectId?: string;
      }
    ) => {
      useSessionStore.getState().createSession(tabId, {
        sessionId,
        title: metadata?.title,
        stageId: metadata?.stageId,
        workspaceId: metadata?.workspaceId,
        projectId: metadata?.projectId,
      });
    },
    [tabId]
  );

  // Update title
  const updateTitle = useCallback(
    (title: string) => {
      useSessionStore.getState().updateSession(tabId, { title });
    },
    [tabId]
  );

  // Update metadata
  const updateMetadata = useCallback(
    (
      metadata: Partial<{
        stageId?: number;
        workspaceId?: string;
        projectId?: string;
      }>
    ) => {
      useSessionStore.getState().updateSession(tabId, metadata);
    },
    [tabId]
  );

  // Mark history as loaded
  const markHistoryLoaded = useCallback(() => {
    useSessionStore.getState().markHistoryLoaded(tabId);
  }, [tabId]);

  // Memoizar metadata para evitar nuevas referencias
  const metadata = useMemo(() => ({
    stageId: session?.stageId,
    workspaceId: session?.workspaceId,
    projectId: session?.projectId,
  }), [session?.stageId, session?.workspaceId, session?.projectId]);

  return {
    sessionId: session?.sessionId || null,
    title: session?.title,
    isHistoryLoaded: session?.isHistoryLoaded || false,
    metadata,
    createSession,
    updateTitle,
    updateMetadata,
    markHistoryLoaded,
  };
}
