import { Message } from '@/models/Message';

/**
 * Utilidades para parsear y procesar mensajes
 * Separado para reutilización y testing
 */

export interface ParsedMessage extends Message {
  hasActions: boolean;
  isEmpty: boolean;
}

/**
 * Parsea un mensaje y extrae metadata útil
 */
export function parseMessage(message: Message): ParsedMessage {
  return {
    ...message,
    hasActions: (message.actions?.length ?? 0) > 0,
    isEmpty: !message.content || message.content.trim() === '',
  };
}

/**
 * Filtra mensajes válidos (excluye mensajes vacíos sin acciones)
 */
export function filterValidMessages(messages: Message[], streamingMessageId?: string | null): Message[] {
  return messages.filter((message) => {
    // Always show messages that are currently streaming, even if empty
    if (streamingMessageId && message.id === streamingMessageId) {
      return true;
    }
    
    if (message.sender === 'agent' && (!message.content || message.content.trim() === '')) {
      // Permitir si tiene acciones
      if (message.actions && message.actions.length > 0) {
        return true;
      }
      return false;
    }
    return true;
  });
}

/**
 * Genera título automático desde mensajes
 */
export function generateTitleFromMessages(messages: Message[]): string {
  const firstUserMessage = messages.find(m => m.sender === 'user');
  
  if (!firstUserMessage?.content) {
    return 'New Chat';
  }

  // Tomar primeras palabras (max 6) y truncar
  const words = firstUserMessage.content.split(' ').slice(0, 6);
  let title = words.join(' ');
  
  if (firstUserMessage.content.split(' ').length > 6) {
    title += '...';
  }

  return title;
}

/**
 * Extrae eventos SSE de un chunk
 */
export function parseSSEChunk(chunk: any): {
  type: string;
  content: string;
  metadata?: any;
} | null {
  if (!chunk) return null;

  // Si es string, intentar parsear como JSON
  if (typeof chunk === 'string') {
    try {
      chunk = JSON.parse(chunk);
    } catch {
      return { type: 'content', content: chunk };
    }
  }

  // Extraer type y content
  const type = chunk.type || chunk.event_type || 'content';
  const content = chunk.content || chunk.text || chunk.message || '';

  return {
    type,
    content,
    metadata: chunk,
  };
}

/**
 * Combina mensajes consecutivos del mismo sender
 */
export function mergeConsecutiveMessages(messages: Message[]): Message[] {
  if (messages.length === 0) return [];

  const merged: Message[] = [];
  let current = { ...messages[0] };

  for (let i = 1; i < messages.length; i++) {
    const message = messages[i];
    
    // Si es del mismo sender y dentro de 1 minuto, combinar
    if (
      message.sender === current.sender &&
      Math.abs(message.timestamp.getTime() - current.timestamp.getTime()) < 60000
    ) {
      current.content = `${current.content}\n\n${message.content}`;
    } else {
      merged.push(current);
      current = { ...message };
    }
  }

  merged.push(current);
  return merged;
}
