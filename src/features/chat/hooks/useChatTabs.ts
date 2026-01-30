import { useSessionStore } from '@/features/chat/stores/sessionStore';
import { useUIStore } from '@/features/chat/stores/uiStore';

/**
 * Hook para obtener todos los tabs con su información
 * Compatible con el sistema antiguo de ChatController
 */
export function useChatTabs() {
  const sessionStore = useSessionStore();
  const uiStore = useUIStore();

  // Convertir sessions a tabs
  const tabs = Object.keys(sessionStore.sessionsByTab).map((tabId) => {
    const session = sessionStore.sessionsByTab[tabId];
    return {
      id: tabId,
      sessionId: session.sessionId,
      title: session.title,
      stageId: session.stageId,
      streamingMessageId: uiStore.getStreamingMessageId(session.sessionId),
      loadedSessionId: session.sessionId,
    };
  });

  return {
    tabs,
    activeTabId: sessionStore.activeSessionId || '',
  };
}
