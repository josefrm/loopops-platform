import { useAuth } from '@/contexts/AuthContext';
import { useMessageStore } from '@/features/chat/stores/messageStore';
import { useUIStore } from '@/features/chat/stores/uiStore';
import { transformBackendMessages } from '@/features/chat/utils/messageParser.utils';
import { useCurrentStage } from '@/hooks/useCurrentStage';
import { useStageTemplate } from '@/hooks/useStageTemplate';
import { useAgnoSessions } from '@/queries/useAgnoSessions';
import { AgnoSession } from '@/services/AgnoSessionService';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import { useQueryClient } from '@tanstack/react-query';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// =============================================================================
// TYPES
// =============================================================================

export type Session = AgnoSession;

interface SessionContextType {
  // Query State
  isLoading: boolean;
  isFetching: boolean;
  isSyncing: boolean;
  error: Error | null;

  // Sessions (from query)
  sessions: Session[];
  hasSessions: boolean;
  sessionsCount: number;

  // Active Session (derived from URL)
  activeSessionId: string | null;
  activeSession: Session | undefined;
  setActiveSession: (sessionId: string | null) => void;

  // Lookup
  getSession: (sessionId: string) => Session | undefined;

  // Actions
  refetch: () => void;
  invalidateAndRefetch: () => Promise<void>;

  // Stage Info
  currentStageId: number | undefined;
  stageTemplateId: string | undefined;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

// =============================================================================
// HOOKS
// =============================================================================

export const useSessionContext = () => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSessionContext must be used within SessionProvider');
  }
  return context;
};

export const useActiveSession = () => {
  const { activeSessionId, activeSession, setActiveSession, sessions } =
    useSessionContext();
  return { activeSessionId, activeSession, setActiveSession, sessions };
};

export const useSessions = () => {
  const { sessions, hasSessions, sessionsCount, isLoading, getSession } =
    useSessionContext();
  return { sessions, hasSessions, sessionsCount, isLoading, getSession };
};

// =============================================================================
// PROVIDER
// =============================================================================

interface SessionProviderProps {
  children: React.ReactNode;
}

export const SessionProvider: React.FC<SessionProviderProps> = ({
  children,
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const currentWorkspace = useWorkspaceProjectStore((s) => s.getCurrentWorkspace());
  const currentProject = useWorkspaceProjectStore((s) => s.getCurrentProject());
  const { currentStagePriority: currentStageId } = useCurrentStage();
  const { stageTemplate, isLoadingStageTemplate } = useStageTemplate();

  // Ref to prevent duplicate message sync
  const lastSyncKeyRef = useRef<string | null>(null);

  // ===========================================================================
  // URL PARAMS (Source of Truth)
  // ===========================================================================
  const sessionIdFromUrl = searchParams.get('session_id');

  // ===========================================================================
  // QUERY
  // ===========================================================================
  const workspaceId = currentWorkspace?.id;
  const projectId = currentProject?.id;

  const queryEnabled =
    !isLoadingStageTemplate &&
    !!user?.id &&
    !!stageTemplate?.id &&
    !!workspaceId &&
    !!projectId;

  const {
    sessions,
    isLoading,
    isFetching,
    error,
    refresh,
  } = useAgnoSessions({
    workspaceId,
    projectId,
    userId: user?.id,
    componentId: stageTemplate?.id,
    enabled: queryEnabled,
  });

  // ===========================================================================
  // DERIVED STATE
  // ===========================================================================
  const hasSessions = (sessions?.length ?? 0) > 0;
  const sessionsCount = sessions?.length ?? 0;

  const getSession = useCallback(
    (sessionId: string): Session | undefined => {
      return sessions?.find((s) => s.session_id === sessionId);
    },
    [sessions]
  );

  // Active session derived from URL + validation against query data
  const activeSessionId = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      return null;
    }
    // If URL has valid session, use it
    if (sessionIdFromUrl) {
      const exists = sessions.some((s) => s.session_id === sessionIdFromUrl);
      if (exists) {
        return sessionIdFromUrl;
      }
    }
    // Fallback to first session
    return sessions[0].session_id;
  }, [sessionIdFromUrl, sessions]);

  const activeSession = useMemo(() => {
    return activeSessionId ? getSession(activeSessionId) : undefined;
  }, [activeSessionId, getSession]);

  // ===========================================================================
  // URL SYNC (Correct invalid URLs)
  // ===========================================================================
  useEffect(() => {
    if (!sessions || sessions.length === 0 || isLoading) {
      return;
    }

    const urlSessionId = searchParams.get('session_id');
    const urlStage = searchParams.get('stage');

    // Check if URL needs correction
    const urlSessionValid = urlSessionId && sessions.some((s) => s.session_id === urlSessionId);
    const shouldCorrectSession = !urlSessionValid && sessions.length > 0;
    const shouldAddStage = !urlStage && currentStageId;

    if (shouldCorrectSession || shouldAddStage) {
      const newParams = new URLSearchParams(searchParams);
      
      if (currentStageId) {
        newParams.set('stage', currentStageId.toString());
      }
      
      if (shouldCorrectSession) {
        newParams.set('session_id', sessions[0].session_id);
      }
      
      navigate(`?${newParams.toString()}`, { replace: true });
    }
  }, [sessions, isLoading, searchParams, currentStageId, navigate]);

  // ===========================================================================
  // NAVIGATION
  // ===========================================================================
  const setActiveSession = useCallback(
    (sessionId: string | null) => {
      const newParams = new URLSearchParams(searchParams);
      
      if (currentStageId) {
        newParams.set('stage', currentStageId.toString());
      }
      
      if (sessionId) {
        newParams.set('session_id', sessionId);
      } else {
        newParams.delete('session_id');
      }
      
      navigate(`?${newParams.toString()}`, { replace: true });
    },
    [searchParams, currentStageId, navigate]
  );

  // ===========================================================================
  // MESSAGE SYNC (Backend → messageStore for UI)
  // ===========================================================================
  useEffect(() => {
    if (isLoading || !sessions || !stageTemplate?.id) {
      return;
    }

    // Prevent duplicate processing
    const syncKey = `${stageTemplate.id}-${sessions.length}-${sessions.map(s => s.session_id).join(',')}`;
    if (lastSyncKeyRef.current === syncKey) {
      return;
    }

    const messageStore = useMessageStore.getState();
    const uiStore = useUIStore.getState();

    // Don't overwrite during active streaming
    const hasActiveStreaming = Object.values(uiStore.streamingBySession).some(
      (state) => state?.isActive
    );
    if (hasActiveStreaming) {
      return;
    }

    lastSyncKeyRef.current = syncKey;

    // Sync messages from backend to messageStore
    sessions.forEach((session) => {
      const sessionId = session.session_id;
      const existingMessages = messageStore.getMessages(sessionId);
      const backendHistory = session.chat_history || [];

      // Only sync if backend has more messages (or initial load)
      if (backendHistory.length > existingMessages.length) {
        const filteredMessages = backendHistory
          .filter((msg: { role: string }) => msg.role === 'user' || msg.role === 'assistant')
          .map((msg: { role: string }) => ({
            ...msg,
            role: msg.role as 'user' | 'assistant',
          }));

        const transformed = transformBackendMessages(filteredMessages);
        messageStore.setMessages(sessionId, transformed);
      }
    });
  }, [sessions, isLoading, stageTemplate?.id]);

  // Reset sync key on stage change
  useEffect(() => {
    if (stageTemplate?.id) {
      lastSyncKeyRef.current = null;
    }
  }, [stageTemplate?.id]);

  // ===========================================================================
  // QUERY ACTIONS
  // ===========================================================================
  const invalidateAndRefetch = useCallback(async () => {
    lastSyncKeyRef.current = null;
    await queryClient.invalidateQueries({ queryKey: ['agno-sessions'] });
    refresh();
  }, [queryClient, refresh]);

  // ===========================================================================
  // CONTEXT VALUE
  // ===========================================================================
  const value: SessionContextType = useMemo(
    () => ({
      isLoading,
      isFetching,
      isSyncing: isLoading || isFetching,
      error: error as Error | null,

      sessions: sessions || [],
      hasSessions,
      sessionsCount,

      activeSessionId,
      activeSession,
      setActiveSession,

      getSession,

      refetch: refresh,
      invalidateAndRefetch,

      currentStageId,
      stageTemplateId: stageTemplate?.id,
    }),
    [
      isLoading,
      isFetching,
      error,
      sessions,
      hasSessions,
      sessionsCount,
      activeSessionId,
      activeSession,
      setActiveSession,
      getSession,
      refresh,
      invalidateAndRefetch,
      currentStageId,
      stageTemplate?.id,
    ]
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
};
