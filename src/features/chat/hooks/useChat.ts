import { useMessages } from './useMessages';
import { useStreaming } from './useStreaming';
import { useSessionContext } from '@/contexts/SessionSyncContext';
import { useEffect, useMemo, useRef, useCallback, useState } from 'react';

export interface UseChatOptions {
  /** The session ID to use for this chat - comes from SessionSyncContext */
  sessionId?: string | null;
  /** Optional callback when title changes */
  onTitleChange?: (title: string) => void;
}

export interface UseChatResult {
  // Messages
  messages: ReturnType<typeof useMessages>['messages'];
  addMessage: ReturnType<typeof useMessages>['addMessage'];
  updateMessage: ReturnType<typeof useMessages>['updateMessage'];
  clearMessages: ReturnType<typeof useMessages>['clearMessages'];
  
  // Streaming
  isStreaming: boolean;
  streamingMessageId: string | null;
  startStreaming: (messageId: string) => void;
  stopStreaming: () => void;
  isTyping: boolean;
  setTyping: (isTyping: boolean) => void;
  
  // Session
  sessionId: string | null;
  title: string | undefined;
  isHistoryLoaded: boolean;
  updateTitle: (title: string) => void;
  markHistoryLoaded: () => void;
}

/**
 * Hook principal - Solo composición, sin lógica compleja
 * 
 * @example
 * const { activeSessionId } = useSessionContext();
 * const chat = useChat({ sessionId: activeSessionId });
 * 
 * // Agregar mensaje
 * chat.addMessage({ content: 'Hello', sender: 'user', timestamp: new Date() });
 * 
 * // Iniciar streaming
 * chat.startStreaming(messageId);
 */
export function useChat({ sessionId: providedSessionId, onTitleChange }: UseChatOptions): UseChatResult {
  // Get session from context
  const { getSession } = useSessionContext();
  
  // Track history loaded state per session
  const [historyLoadedSessions, setHistoryLoadedSessions] = useState<Set<string>>(new Set());
  
  // Get session data from context
  const session = useMemo(() => {
    return providedSessionId ? getSession(providedSessionId) : undefined;
  }, [providedSessionId, getSession]);
  
  const sessionId = providedSessionId || null;
  const title = session?.session_name || session?.session_name;
  
  // Use empty string if no session to prevent undefined errors
  // Operations will check for valid sessionId before executing
  const effectiveSessionId = sessionId || '';
  const messages = useMessages(effectiveSessionId);
  const streaming = useStreaming(effectiveSessionId);
  
  // Track if history is loaded for this session
  const isHistoryLoaded = sessionId ? historyLoadedSessions.has(sessionId) : false;
  
  const markHistoryLoaded = useCallback(() => {
    if (sessionId) {
      setHistoryLoadedSessions(prev => new Set(prev).add(sessionId));
    }
  }, [sessionId]);
  
  // Title update - for now just a no-op, real update should use mutation
  const updateTitle = useCallback((_title: string) => {
    // Title updates should go through session mutation
    // This is handled by ChatInterface using updateSessionNameMutation
  }, []);
  
  // Guardar callback en ref para evitar que cambie de referencia cause re-renders
  const onTitleChangeRef = useRef(onTitleChange);
  useEffect(() => {
    onTitleChangeRef.current = onTitleChange;
  });
  
  // Notificar cambios de título - solo depende del título, no del callback
  useEffect(() => {
    if (onTitleChangeRef.current && title) {
      onTitleChangeRef.current(title);
    }
  }, [title]);

  return {
    // Messages
    messages: messages.messages,
    addMessage: messages.addMessage,
    updateMessage: messages.updateMessage,
    clearMessages: messages.clearMessages,
    
    // Streaming
    isStreaming: streaming.isStreaming,
    streamingMessageId: streaming.streamingMessageId,
    startStreaming: streaming.startStreaming,
    stopStreaming: streaming.stopStreaming,
    isTyping: streaming.isTyping,
    setTyping: streaming.setTyping,
    
    // Session
    sessionId,
    title,
    isHistoryLoaded,
    updateTitle,
    markHistoryLoaded,
  };
}
