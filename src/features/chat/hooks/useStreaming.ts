import { useCallback } from 'react';
import { useUIStore } from '../stores/uiStore';

/**
 * Hook para manejo de streaming SSE
 * Separado para claridad y reutilización
 */

export interface UseStreamingResult {
  isStreaming: boolean;
  streamingMessageId: string | null;
  startStreaming: (messageId: string) => void;
  stopStreaming: () => void;
  isTyping: boolean;
  setTyping: (isTyping: boolean) => void;
}

export function useStreaming(sessionId: string): UseStreamingResult {
  // Suscribirse solo al streaming state de esta sesión
  // Retornar valores primitivos directamente en lugar de objetos para evitar re-renders
  const isStreaming = useUIStore(
    useCallback((state) => state.streamingBySession[sessionId]?.isActive ?? false, [sessionId])
  );
  const streamingMessageId = useUIStore(
    useCallback((state) => state.streamingBySession[sessionId]?.messageId ?? null, [sessionId])
  );
  const isTyping = useUIStore(
    useCallback((state) => state.typingBySession[sessionId] ?? false, [sessionId])
  );

  // Start streaming - No incluir store en dependencias
  const startStreaming = useCallback(
    (messageId: string) => {
      useUIStore.getState().setStreaming(sessionId, messageId);
    },
    [sessionId]
  );

  // Stop streaming
  const stopStreaming = useCallback(() => {
    useUIStore.getState().setStreaming(sessionId, null);
  }, [sessionId]);

  // Typing indicator  
  const setTyping = useCallback(
    (isTyping: boolean) => {
      useUIStore.getState().setTyping(sessionId, isTyping);
    },
    [sessionId]
  );

  return {
    isStreaming,
    streamingMessageId,
    startStreaming,
    stopStreaming,
    isTyping,
    setTyping,
  };
}
