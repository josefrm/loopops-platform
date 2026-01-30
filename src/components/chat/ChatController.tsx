import { useAuth } from '@/contexts/AuthContext';
import { useSessionContext } from '@/contexts/SessionSyncContext';
import { useMessageStore } from '@/features/chat/stores/messageStore';
import { useToast } from '@/hooks/use-toast';
import { useStageTemplate } from '@/hooks/useStageTemplate';
import { useWorkspaceId } from '@/hooks/useWorkspaceId';
import { useDeleteSessionMutation } from '@/queries/sessionSyncQueries';
import { StageTemplateService } from '@/services/StageTemplateService';
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export interface ChatTab {
  id: string;
  sessionId?: string;
  title?: string;
  stageId?: number;
  isCreating?: boolean;
  isDeleting?: boolean;
}

interface ChatControllerContextType {
  tabs: ChatTab[];
  activeTab: string;
  addNewTab: () => Promise<void>;
  loadChatInNewTab: (messages: any[], title: string, chatId: string) => void;
  closeTab: (tabId: string, messages?: any[], title?: string) => Promise<void>;
  updateTabTitle: (tabId: string, title: string) => void;
  updateTabChatId: (tabId: string, chatId: string) => void;
  setActiveTab: (tabId: string) => void;
  canAddNewTab: () => boolean;
  getActiveTabInfo: () => { tabId: string; title: string | undefined } | null;
  hasOperationsInProgress: boolean;
}

const ChatControllerContext = createContext<ChatControllerContextType | null>(
  null,
);

export const useChatController = () => {
  const context = useContext(ChatControllerContext);
  if (!context) {
    throw new Error(
      'useChatController must be used within a ChatControllerProvider',
    );
  }
  return context;
};

// Optional version that returns null instead of throwing (useful for components that may render during HMR)
export const useChatControllerOptional = () => {
  return useContext(ChatControllerContext);
};

interface ChatControllerProviderProps {
  children: ReactNode;
}

export const ChatControllerProvider: React.FC<ChatControllerProviderProps> = ({
  children,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const workspaceId = useWorkspaceId();
  const selectedProject = useWorkspaceProjectStore((state) =>
    state.getCurrentProject(),
  );
  const { stageTemplate } = useStageTemplate();
  const { toast } = useToast();

  // Session context - source of truth
  const {
    sessions,
    activeSessionId,
    setActiveSession,
    currentStageId,
    invalidateAndRefetch,
  } = useSessionContext();

  // Local state for optimistic UI during mutations
  const [pendingSession, setPendingSession] = useState<{
    tabId: string;
    tempSessionId: string;
  } | null>(null);
  const [deletingSessionIds, setDeletingSessionIds] = useState<Set<string>>(
    new Set(),
  );

  const creationInProgress = useRef(false);

  const deleteSessionMutation = useDeleteSessionMutation({
    userId: user?.id || '',
    stageTemplateId: stageTemplate?.id || '',
    stageType:
      (stageTemplate?.type as 'agent' | 'team' | 'workflow') || 'agent',
  });

  // ===========================================================================
  // TABS - Derived from sessions + pending state
  // ===========================================================================
  // ===========================================================================
  // TABS - Derived from sessions + pending state
  // ===========================================================================
  const tabs: ChatTab[] = useMemo(() => {
    // Sort sessions by created_at to ensure stable order (oldest first)
    const sortedSessions = [...sessions].sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateA - dateB;
    });

    // Sessions already come filtered by stageTemplateId from the query
    // No need to filter again here
    const sessionTabs: ChatTab[] = sortedSessions.map((session) => ({
      // Use session_id directly as the stable ID to prevent re-mounting/flickering
      // when other tabs are added/removed (which changes the index)
      id: session.session_id,
      sessionId: session.session_id,
      title: session.session_name || 'Loop',
      stageId: currentStageId,
      isCreating: false,
      isDeleting: deletingSessionIds.has(session.session_id),
    }));

    // Add pending session if exists
    if (pendingSession) {
      const pendingTab: ChatTab = {
        // Use tempSessionId as the ID for consistency
        id: pendingSession.tempSessionId,
        sessionId: pendingSession.tempSessionId,
        title: 'New Chat',
        stageId: currentStageId,
        isCreating: true,
        isDeleting: false,
      };

      if (sessionTabs.length > 0) {
        // Insert before the last element (Second to last) to reserve the last spot
        sessionTabs.splice(sessionTabs.length - 1, 0, pendingTab);
      } else {
        sessionTabs.push(pendingTab);
      }
    }

    return sessionTabs;
  }, [sessions, currentStageId, pendingSession, deletingSessionIds]);

  const activeTab = pendingSession?.tempSessionId || activeSessionId || '';

  // ===========================================================================
  // NAVIGATION
  // ===========================================================================
  const setActiveTab = useCallback(
    (tabId: string) => {
      const targetTab = tabs.find((t) => t.id === tabId);
      if (!targetTab?.sessionId) return;
      setActiveSession(targetTab.sessionId);
    },
    [tabs, setActiveSession],
  );

  // ===========================================================================
  // CREATE SESSION
  // ===========================================================================
  const addNewTab = useCallback(async () => {
    if (creationInProgress.current) return;

    if (tabs.length >= 15) {
      toast({
        title: 'Tab Limit Reached',
        description: 'You have reached the maximum number of open loops (15).',
        variant: 'destructive',
      });
      return;
    }

    if (authLoading) {
      toast({
        title: 'Initializing...',
        description: 'Please wait while we connect to your workspace.',
      });
      return;
    }

    if (!user?.id || !workspaceId || !stageTemplate?.id) {
      toast({
        title: 'Missing requirements',
        description:
          'Please ensure you are logged in and have a workspace selected.',
        variant: 'destructive',
      });
      return;
    }

    creationInProgress.current = true;

    const tempSessionId = `temp-${Date.now()}`;

    // Optimistic UI - show pending tab
    // We use tempSessionId as the tabId for consistency with the new stable ID strategy
    setPendingSession({ tabId: tempSessionId, tempSessionId });

    try {
      const sessionResponse = await StageTemplateService.createSession({
        sessionName: 'Loop',
        userId: user.id,
        workspaceId,
        projectId: selectedProject?.id,
        sessionType: (stageTemplate.type || 'team') as
          | 'agent'
          | 'team'
          | 'workflow',
        componentId: stageTemplate.id,
      });

      // 1. Invalidate to get the new session in the query (optimistically)
      // We await this so the new content is ready in the 'sessions' array
      await invalidateAndRefetch();

      // 2. Navigate to the new session
      const newParams = new URLSearchParams(searchParams);
      if (currentStageId) {
        newParams.set('stage', currentStageId.toString());
      }
      newParams.set('session_id', sessionResponse.session_id);
      navigate(`?${newParams.toString()}`, { replace: true });

      // 3. Finally clear pending session
      // Doing this LAST ensures there is no gap where neither pending nor real session is active
      setPendingSession(null);
    } catch (error: any) {
      setPendingSession(null);
      toast({
        title: 'Session Error',
        description: error.message || 'Failed to create chat session',
        variant: 'destructive',
      });
    } finally {
      creationInProgress.current = false;
    }
  }, [
    tabs.length,
    authLoading,
    user?.id,
    workspaceId,
    stageTemplate,
    selectedProject?.id,
    toast,
    searchParams,
    currentStageId,
    navigate,
    invalidateAndRefetch,
  ]);

  // Keyboard shortcut for new tab
  const addNewTabRef = useRef(addNewTab);
  React.useEffect(() => {
    addNewTabRef.current = addNewTab;
  });

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 't') {
        event.preventDefault();
        addNewTabRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ===========================================================================
  // DELETE SESSION
  // ===========================================================================
  const closeTab = useCallback(
    async (tabId: string) => {
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab?.sessionId) return;

      const sessionId = tab.sessionId;
      const isClosingActiveTab = sessionId === activeSessionId;

      // Optimistic UI - mark as deleting
      setDeletingSessionIds((prev) => new Set(prev).add(sessionId));

      try {
        await deleteSessionMutation.mutateAsync(sessionId);

        // Clear messages
        useMessageStore.getState().clearMessages(sessionId);

        // Navigate to next session if needed
        if (isClosingActiveTab) {
          const remainingSessions = sessions.filter(
            (s) => s.session_id !== sessionId,
          );
          if (remainingSessions.length > 0) {
            setActiveSession(remainingSessions[0].session_id);
          } else {
            // No sessions left - clear URL
            const newParams = new URLSearchParams(searchParams);
            if (currentStageId) {
              newParams.set('stage', currentStageId.toString());
            }
            newParams.delete('session_id');
            navigate(`?${newParams.toString()}`, { replace: true });
          }
        }

        // Invalidate to refresh list
        await invalidateAndRefetch();
      } catch (error) {
        console.error('Error deleting session:', error);
        toast({
          title: 'Delete Error',
          description: 'Failed to delete session',
          variant: 'destructive',
        });
      } finally {
        setDeletingSessionIds((prev) => {
          const next = new Set(prev);
          next.delete(sessionId);
          return next;
        });
      }
    },
    [
      tabs,
      activeSessionId,
      sessions,
      deleteSessionMutation,
      setActiveSession,
      searchParams,
      currentStageId,
      navigate,
      invalidateAndRefetch,
      toast,
    ],
  );

  // ===========================================================================
  // OTHER ACTIONS
  // ===========================================================================
  const loadChatInNewTab = useCallback(
    (_messages: any[], _title: string, chatId: string) => {
      setActiveSession(chatId);
    },
    [setActiveSession],
  );

  const updateTabTitle = useCallback((_tabId: string, _title: string) => {
    // No-op - Title is derived from session data in query
    // Title updates go through session mutation which invalidates the query
  }, []);

  const updateTabChatId = useCallback((_tabId: string, _chatId: string) => {
    // No-op - sessions are managed by backend
  }, []);

  const canAddNewTab = useCallback(() => tabs.length < 15, [tabs.length]);

  const getActiveTabInfo = useCallback(() => {
    const tab = tabs.find((t) => t.sessionId === activeSessionId);
    return tab ? { tabId: tab.id, title: tab.title } : null;
  }, [tabs, activeSessionId]);

  const hasOperationsInProgress = useMemo(() => {
    return (
      pendingSession !== null ||
      deletingSessionIds.size > 0 ||
      deleteSessionMutation.isPending
    );
  }, [
    pendingSession,
    deletingSessionIds.size,
    deleteSessionMutation.isPending,
  ]);

  // ===========================================================================
  // CONTEXT VALUE
  // ===========================================================================
  const value: ChatControllerContextType = useMemo(
    () => ({
      tabs,
      activeTab,
      addNewTab,
      loadChatInNewTab,
      closeTab,
      updateTabTitle,
      updateTabChatId,
      setActiveTab,
      canAddNewTab,
      getActiveTabInfo,
      hasOperationsInProgress,
    }),
    [
      tabs,
      activeTab,
      addNewTab,
      loadChatInNewTab,
      closeTab,
      updateTabTitle,
      updateTabChatId,
      setActiveTab,
      canAddNewTab,
      getActiveTabInfo,
      hasOperationsInProgress,
    ],
  );

  return (
    <ChatControllerContext.Provider value={value}>
      {children}
    </ChatControllerContext.Provider>
  );
};
