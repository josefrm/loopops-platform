import { Message } from '@/models/Message';
import { produce } from 'immer';

import { create } from 'zustand';

/**
 * Message Store - Solo maneja mensajes (separación de concerns)
 * Usa immer para updates inmutables seguros
 */

interface MessageState {
  // Mensajes por sessionId
  messagesBySession: Record<string, Message[]>;
}

interface MessageActions {
  // CRUD básico
  addMessage: (sessionId: string, message: Message) => void;
  updateMessage: (
    sessionId: string,
    messageId: string,
    updates: Partial<Message>,
  ) => void;
  deleteMessage: (sessionId: string, messageId: string) => void;
  setMessages: (sessionId: string, messages: Message[]) => void;
  clearMessages: (sessionId: string) => void;
  clearAllMessages: () => void;

  // Queries
  getMessages: (sessionId: string) => Message[];
  getMessage: (sessionId: string, messageId: string) => Message | undefined;

  // Streaming helpers
  appendToMessage: (
    sessionId: string,
    messageId: string,
    content: string,
  ) => void;
}

type MessageStore = MessageState & MessageActions;

// Constante para el array vacío - evita crear nuevas referencias
const EMPTY_MESSAGES: Message[] = [];

export const useMessageStore = create<MessageStore>((set, get) => ({
  // State inicial
  messagesBySession: {},

  // CRUD Operations con immer
  addMessage: (sessionId, message) =>
    set(
      produce((draft) => {
        if (!draft.messagesBySession[sessionId]) {
          draft.messagesBySession[sessionId] = [];
        }
        draft.messagesBySession[sessionId].push(message);
      }),
    ),

  updateMessage: (sessionId, messageId, updates) =>
    set(
      produce((draft) => {
        const messages = draft.messagesBySession[sessionId];
        if (!messages) return;

        const messageIndex = messages.findIndex((m) => m.id === messageId);
        if (messageIndex !== -1) {
          // immer permite "mutation" directa
          Object.assign(messages[messageIndex], updates);
        }
      }),
    ),

  deleteMessage: (sessionId, messageId) =>
    set(
      produce((draft) => {
        const messages = draft.messagesBySession[sessionId];
        if (!messages) return;

        const index = messages.findIndex((m) => m.id === messageId);
        if (index !== -1) {
          messages.splice(index, 1);
        }
      }),
    ),

  setMessages: (sessionId, messages) =>
    set(
      produce((draft) => {
        // Deduplicate messages by id before setting
        const seen = new Set<string>();
        const duplicateIds: string[] = [];
        const uniqueMessages = messages.filter((msg) => {
          if (seen.has(msg.id)) {
            duplicateIds.push(msg.id);
            return false;
          }
          seen.add(msg.id);
          return true;
        });
        
        if (duplicateIds.length > 0) {
          console.warn(
            `[messageStore] ⚠️ DUPLICATES for session ${sessionId}: ` +
            `${messages.length} total → ${uniqueMessages.length} unique (${duplicateIds.length} removed)\n` +
            `  Duplicate IDs: ${[...new Set(duplicateIds)].slice(0, 5).join(', ')}${duplicateIds.length > 5 ? '...' : ''}`
          );
        }
        
        draft.messagesBySession[sessionId] = uniqueMessages;
      }),
    ),

  clearMessages: (sessionId) =>
    set(
      produce((draft) => {
        delete draft.messagesBySession[sessionId];
      }),
    ),

  clearAllMessages: () =>
    set({ messagesBySession: {} }),

  // Queries (no modifican state)
  getMessages: (sessionId) => {
    return get().messagesBySession[sessionId] || EMPTY_MESSAGES;
  },

  getMessage: (sessionId, messageId) => {
    const messages = get().messagesBySession[sessionId];
    return messages?.find((m) => m.id === messageId);
  },

  // Streaming helper - append content to existing message
  appendToMessage: (sessionId, messageId, content) =>
    set((state) => {
      const messages = state.messagesBySession[sessionId];
      if (!messages) return state;

      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1) return state;

      // Crear nuevo array con el mensaje actualizado para forzar re-render
      const updatedMessages = [...messages];
      updatedMessages[messageIndex] = {
        ...messages[messageIndex],
        content: (messages[messageIndex].content || '') + content,
      };

      return {
        ...state,
        messagesBySession: {
          ...state.messagesBySession,
          [sessionId]: updatedMessages,
        },
      };
    }),
}));
