import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * UI Store - Maneja estado de UI con persist selectivo
 * streamingBySession y typingBySession se persisten para mantener feedback visual
 */

interface StreamingState {
  sessionId: string;
  messageId: string;
  isActive: boolean;
}

interface UIState {
  // Typing indicators por sessionId
  typingBySession: Record<string, boolean>;
  
  // Streaming state
  streamingBySession: Record<string, StreamingState | null>;
  
  // Input values por tabId
  inputValuesByTab: Record<string, string>;
  
  // Scroll state
  shouldScrollToBottom: Record<string, boolean>;
  
  // Loading states
  loadingHistoryBySession: Record<string, boolean>;
}

interface UIActions {
  // Typing indicators
  setTyping: (sessionId: string, isTyping: boolean) => void;
  isTyping: (sessionId: string) => boolean;
  
  // Streaming
  setStreaming: (sessionId: string, messageId: string | null) => void;
  getStreamingMessageId: (sessionId: string) => string | null;
  isStreaming: (sessionId: string) => boolean;
  
  // Input values
  setInputValue: (tabId: string, value: string) => void;
  getInputValue: (tabId: string) => string;
  clearInputValue: (tabId: string) => void;
  
  // Scroll
  setShouldScroll: (sessionId: string, shouldScroll: boolean) => void;
  shouldScroll: (sessionId: string) => boolean;
  
  // Loading
  setLoadingHistory: (sessionId: string, isLoading: boolean) => void;
  isLoadingHistory: (sessionId: string) => boolean;
  
  // Cleanup
  clearSession: (sessionId: string) => void;
  clearAllSessions: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // State inicial
      typingBySession: {},
      streamingBySession: {},
      inputValuesByTab: {},
      shouldScrollToBottom: {},
      loadingHistoryBySession: {},

  // Typing indicators
  setTyping: (sessionId, isTyping) =>
    set((state) => ({
      typingBySession: {
        ...state.typingBySession,
        [sessionId]: isTyping,
      },
    })),

  isTyping: (sessionId) => {
    return get().typingBySession[sessionId] || false;
  },

  // Streaming
  setStreaming: (sessionId, messageId) =>
    set((state) => ({
      streamingBySession: {
        ...state.streamingBySession,
        [sessionId]: messageId
          ? { sessionId, messageId, isActive: true }
          : null,
      },
    })),

  getStreamingMessageId: (sessionId) => {
    return get().streamingBySession[sessionId]?.messageId || null;
  },

  isStreaming: (sessionId) => {
    return get().streamingBySession[sessionId]?.isActive || false;
  },

  // Input values
  setInputValue: (tabId, value) =>
    set((state) => ({
      inputValuesByTab: {
        ...state.inputValuesByTab,
        [tabId]: value,
      },
    })),

  getInputValue: (tabId) => {
    return get().inputValuesByTab[tabId] || '';
  },

  clearInputValue: (tabId) =>
    set((state) => {
      const newInputs = { ...state.inputValuesByTab };
      delete newInputs[tabId];
      return { inputValuesByTab: newInputs };
    }),

  // Scroll
  setShouldScroll: (sessionId, shouldScroll) =>
    set((state) => ({
      shouldScrollToBottom: {
        ...state.shouldScrollToBottom,
        [sessionId]: shouldScroll,
      },
    })),

  shouldScroll: (sessionId) => {
    return get().shouldScrollToBottom[sessionId] ?? true;
  },

  // Loading
  setLoadingHistory: (sessionId, isLoading) =>
    set((state) => ({
      loadingHistoryBySession: {
        ...state.loadingHistoryBySession,
        [sessionId]: isLoading,
      },
    })),

  isLoadingHistory: (sessionId) => {
    return get().loadingHistoryBySession[sessionId] || false;
  },

  // Cleanup - remover todo el estado de una sesión
  // NO limpia streaming activo para mantener feedback visual
  clearSession: (sessionId) =>
    set((state) => {
      const newTyping = { ...state.typingBySession };
      const newStreaming = { ...state.streamingBySession };
      const newScroll = { ...state.shouldScrollToBottom };
      const newLoading = { ...state.loadingHistoryBySession };

      // NO borrar streaming si está activo
      const isStreamingActive = newStreaming[sessionId]?.isActive;
      if (!isStreamingActive) {
        delete newStreaming[sessionId];
      }
      
      delete newTyping[sessionId];
      delete newScroll[sessionId];
      delete newLoading[sessionId];

      return {
        typingBySession: newTyping,
        streamingBySession: newStreaming,
        shouldScrollToBottom: newScroll,
        loadingHistoryBySession: newLoading,
      };
    }),

  clearAllSessions: () =>
    set({
      typingBySession: {},
      streamingBySession: {},
      shouldScrollToBottom: {},
      loadingHistoryBySession: {},
    }),
    }),
    {
      name: 'loopops-ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Solo persistir streaming y typing para mantener feedback visual
        streamingBySession: state.streamingBySession,
        typingBySession: state.typingBySession,
      }),
    }
  )
);
