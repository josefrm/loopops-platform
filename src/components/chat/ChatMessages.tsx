import { useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Message, MessageAction } from '@/models/Message';
import { ChatMessageItem } from './ChatMessageItem';
import { TypingIndicator } from './TypingIndicator';
import { LoadingIndicator } from './LoadingIndicator';
import { MessageAvatar } from './MessageAvatar';
import { InlineRunError } from './InlineRunError';
import { filterValidMessages, isMessageStreaming } from './chatMessageUtils';
import { useRunErrorStore } from '@/features/chat/stores/runErrorStore';

interface ChatMessagesProps {
  messages: Message[];
  isTyping: boolean;
  isLoading?: boolean;
  suggestedActions?: Array<{
    title: string;
    description: string;
    isPremium?: boolean;
    onActionClick: () => void;
  }>;
  disableStreaming?: boolean;
  streamingMessageId?: string | null;
  onMessageActionClick?: (action: MessageAction, messageId: string) => void;
  onDocumentClick?: (title: string, content: string) => void;
  sessionId?: string;
}

export function ChatMessages({
  messages,
  isTyping,
  isLoading = false,
  disableStreaming = false,
  streamingMessageId = null,
  onMessageActionClick,
  onDocumentClick,
  sessionId,
}: ChatMessagesProps) {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get error for this session - also check for any error if sessionId not provided
  const activeErrorBySession = useRunErrorStore(state => state.activeErrorBySession);
  const sessionError = sessionId 
    ? activeErrorBySession[sessionId] 
    : Object.values(activeErrorBySession)[0] || null;
  const clearError = useRunErrorStore(state => state.clearError);

  // Debug log
  console.log('[ChatMessages] sessionId:', sessionId, 'sessionError:', sessionError, 'allErrors:', activeErrorBySession);

  const validMessages = filterValidMessages(messages);
  const hasMessages = validMessages.length > 0;
  const showLoading = !hasMessages && isLoading;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-full overflow-y-auto scrollbar-hide px-loop-10">
      <div
        className={`${
          !hasMessages
            ? 'h-full flex flex-col justify-center'
            : 'flex flex-col pt-[130px] pb-loop-4 space-y-loop-4'
        }`}
      >
        {showLoading && <LoadingIndicator />}

        {validMessages.map((message) => {
          const messageKey = sessionId ? `${sessionId}-${message.id}` : message.id;
          
          return (
            <ChatMessageItem
              key={messageKey}
              message={message}
              isStreaming={isMessageStreaming(
                message.id,
                streamingMessageId,
                disableStreaming
              )}
              userMetadata={user.user_metadata}
              userEmail={user.email}
              onMessageActionClick={onMessageActionClick}
              onDocumentClick={onDocumentClick}
            />
          );
        })}

        {isTyping && !isLoading && (
          <TypingIndicator
            avatar={<MessageAvatar isUser={false} />}
          />
        )}

        {/* Show error if exists for this session */}
        {sessionError && (
          <div className="flex justify-start">
            <div 
              className="max-w-[85%] p-4 bg-red-100 border-2 border-red-500 rounded-lg"
              style={{ minWidth: '300px' }}
            >
              <div className="text-red-700 font-bold mb-2">⚠️ Error en el run</div>
              <InlineRunError
                message={sessionError.message}
                isRetrying={false}
                onRetry={sessionError.isRetriable ? () => {
                  console.log('Retry requested for session:', sessionId);
                  clearError(sessionId!);
                } : undefined}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
