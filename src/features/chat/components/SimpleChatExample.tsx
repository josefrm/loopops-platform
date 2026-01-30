import { useChat } from '../hooks/useChat';
import { MessageList } from './MessageList';

/**
 * Ejemplo de uso del nuevo sistema de chat refactorizado
 * 
 * Este componente muestra cómo usar los nuevos hooks y componentes
 * Es MUCHO más simple que ChatInterface.tsx original
 */

interface SimpleChatExampleProps {
  tabId: string;
  onTitleChange?: (title: string) => void;
}

export function SimpleChatExample({ tabId, onTitleChange }: SimpleChatExampleProps) {
  // ✅ Hook principal - Simple y claro
  const chat = useChat({ tabId, onTitleChange });

  // Handler para enviar mensaje
  const handleSendMessage = (content: string) => {
    // 1. Agregar mensaje del usuario
    chat.addMessage({
      content,
      sender: 'user',
      timestamp: new Date(),
    });

    // 2. Crear mensaje placeholder para agente
    const agentMessage = chat.addMessage({
      content: '',
      sender: 'agent',
      timestamp: new Date(),
    });

    // 3. Iniciar streaming
    chat.startStreaming(agentMessage.id);

    // 4. Aquí iría la llamada SSE real
    // ChatServiceSSE.sendMessage(..., {
    //   onChunk: (chunk) => chat.updateMessage(agentMessage.id, { content: chunk }),
    //   onComplete: () => chat.stopStreaming(),
    // })
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2>{chat.title || 'New Chat'}</h2>
        <p className="text-sm text-gray-500">
          Session: {chat.sessionId || 'Not created'}
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={chat.messages}
          streamingMessageId={chat.streamingMessageId}
          autoScrollToBottom={true}
        />
      </div>

      <div className="p-4 border-t">
        <input
          type="text"
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.currentTarget.value) {
              handleSendMessage(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          disabled={chat.isStreaming}
          className="w-full p-2 border rounded"
        />
        {chat.isTyping && (
          <p className="text-sm text-gray-500 mt-2">Agent is typing...</p>
        )}
      </div>
    </div>
  );
}
