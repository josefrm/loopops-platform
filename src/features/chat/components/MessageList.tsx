import { ChatMessageItem } from '@/components/chat/ChatMessageItem';
import { LoadingIndicator } from '@/components/chat/LoadingIndicator';
import { useAuth } from '@/contexts/AuthContext';
import { useRunErrorStore } from '@/features/chat/stores/runErrorStore';
import { Message, MessageAction } from '@/models/Message';
import { memo, useEffect, useRef } from 'react';

interface MessageListProps {
  messages: Message[];
  isStreaming?: boolean;
  streamingMessageId?: string | null;
  isLoading?: boolean;
  onMessageActionClick?: (action: MessageAction, messageId: string) => void;
  onDocumentClick?: (title: string, content: string) => void;
  autoScrollToBottom?: boolean;
  sessionId?: string;
}

export const MessageList = memo(
  function MessageList({
    messages,
    isStreaming = false,
    streamingMessageId = null,
    isLoading = false,
    onMessageActionClick,
    onDocumentClick,
    autoScrollToBottom = true,
    sessionId,
  }: MessageListProps) {
    const { user } = useAuth();
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const prevSessionIdRef = useRef<string | undefined>(sessionId);

    // Get error for this session
    const sessionError = useRunErrorStore(state => 
      sessionId ? state.activeErrorBySession[sessionId] : null
    );
    const clearError = useRunErrorStore(state => state.clearError);

    const validMessages = messages.filter((msg) => {
      if (streamingMessageId && msg.id === streamingMessageId) {
        return true;
      }
      return msg.content && msg.content.trim().length > 0;
    });

    const hasMessages = validMessages.length > 0;
    const showLoading = !hasMessages && isLoading;
    const lastMessageContent =
      validMessages[validMessages.length - 1]?.content || '';

    useEffect(() => {
      if (!autoScrollToBottom || !bottomRef.current) return;

      const isSessionChange = prevSessionIdRef.current !== sessionId;
      prevSessionIdRef.current = sessionId;

      requestAnimationFrame(() => {
        if (isSessionChange) {
          scrollContainerRef.current?.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'instant' as ScrollBehavior,
          });
        } else {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      });
    }, [
      validMessages.length,
      lastMessageContent,
      isStreaming,
      autoScrollToBottom,
      sessionId,
    ]);

    return (
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-loop-9 scroll-smooth"
        style={{
          minHeight: 0,
          height: '100%',
          width: '100%',
        }}
        data-testid="message-list-scroll-container"
      >
        <div className="flex flex-col pt-[130px] pb-loop-4 min-h-full w-full" data-testid="message-list-content">
          {showLoading && (
            <div className="flex-1 flex items-center justify-center">
              <LoadingIndicator />
            </div>
          )}

          {hasMessages && (
            <div className="flex flex-col gap-loop-6 w-full">
              {validMessages.map((message, index) => {
                const isMessageStreaming = streamingMessageId === message.id;
                const messageKey = sessionId ? `${sessionId}-${message.id}` : message.id;
                const isUserMessage = message.sender === 'user';
                const isLastUserMessage = isUserMessage && 
                  !validMessages.slice(index + 1).some(m => m.sender === 'user');
                
                // Show error on the last user message
                const messageError = isLastUserMessage ? sessionError : null;

                return (
                  <div key={messageKey} className="w-full">
                    <ChatMessageItem
                      message={message}
                      isStreaming={isMessageStreaming}
                      userMetadata={user?.user_metadata}
                      userEmail={user?.email}
                      onMessageActionClick={onMessageActionClick}
                      onDocumentClick={onDocumentClick}
                      error={messageError}
                      onRetry={() => clearError(sessionId!)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>
    );
  },
  // Note: removed memo comparison function to allow re-renders when error store changes
);
