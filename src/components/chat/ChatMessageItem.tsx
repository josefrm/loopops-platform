import { Message, MessageAction } from '@/models/Message';
import { RunError } from '@/features/chat/stores/runErrorStore';
import React from 'react';
import { MessageAvatar } from './MessageAvatar';
import { MessageContent } from './MessageContent';

interface ChatMessageItemProps {
  message: Message;
  isStreaming: boolean;
  userMetadata?: {
    avatar_url?: string;
    full_name?: string;
  };
  userEmail?: string;
  onMessageActionClick?: (action: MessageAction, messageId: string) => void;
  onDocumentClick?: (title: string, content: string) => void;
  /** Error to display below this message */
  error?: RunError | null;
  /** Callback when retry is clicked */
  onRetry?: () => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isStreaming,
  userMetadata,
  userEmail,
  onMessageActionClick,
  onDocumentClick,
  error,
  onRetry,
}) => {
  const isUser = message.sender === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`} data-testid={`chat-message-${message.id}`}>
      <div
        className={`flex max-w-[85%] ${
          isUser ? 'flex-row-reverse' : 'flex-row'
        } items-start`}
      >
        <MessageAvatar
          isUser={isUser}
          userMetadata={userMetadata}
          userEmail={userEmail}
        />

        <div>
          <MessageContent
            message={message}
            isStreaming={isStreaming}
            onMessageActionClick={onMessageActionClick}
            onDocumentClick={onDocumentClick}
            error={error}
            onRetry={onRetry}
          />
        </div>
      </div>
    </div>
  );
};
