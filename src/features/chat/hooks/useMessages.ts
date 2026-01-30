import { Message } from '@/models/Message';
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useMessageStore } from '../stores/messageStore';

/**
 * Hook para manejo de mensajes (CRUD operations)
 * Separado del hook principal para mejor mantenibilidad
 */

export interface UseMessagesResult {
  messages: Message[];
  addMessage: (message: Omit<Message, 'id'>) => Message;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  clearMessages: () => void;
  getMessage: (messageId: string) => Message | undefined;
  appendContent: (messageId: string, content: string) => void;
}

// Array vacío constante para evitar nuevas referencias
const EMPTY_MESSAGES: Message[] = [];

export function useMessages(sessionId: string): UseMessagesResult {
  // Suscribirse solo al array de mensajes de esta sesión específica
  const messages = useMessageStore(
    useCallback(
      (state) => state.messagesBySession[sessionId] ?? EMPTY_MESSAGES,
      [sessionId],
    ),
  );

  // Add message with auto-generated ID - NO incluir store en dependencias
  const addMessage = useCallback(
    (message: Omit<Message, 'id'>): Message => {
      const newMessage: Message = {
        ...message,
        id: uuidv4(),
      };
      useMessageStore.getState().addMessage(sessionId, newMessage);
      return newMessage;
    },
    [sessionId],
  );

  // Update message
  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      useMessageStore.getState().updateMessage(sessionId, messageId, updates);
    },
    [sessionId],
  );

  // Delete message
  const deleteMessage = useCallback(
    (messageId: string) => {
      useMessageStore.getState().deleteMessage(sessionId, messageId);
    },
    [sessionId],
  );

  // Clear all messages
  const clearMessages = useCallback(() => {
    useMessageStore.getState().clearMessages(sessionId);
  }, [sessionId]);

  // Get single message
  const getMessage = useCallback(
    (messageId: string) => {
      return useMessageStore.getState().getMessage(sessionId, messageId);
    },
    [sessionId],
  );

  // Append content to message (for streaming)
  const appendContent = useCallback(
    (messageId: string, content: string) => {
      useMessageStore.getState().appendToMessage(sessionId, messageId, content);
    },
    [sessionId],
  );

  return {
    messages,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
    getMessage,
    appendContent,
  };
}
