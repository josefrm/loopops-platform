import { Message } from '@/models/Message';


export const filterValidMessages = (messages: Message[]): Message[] => {
  return messages.filter((message) => {
    if (message.sender === 'agent' && (!message.content || message.content.trim() === '')) {
      if (message.actions && message.actions.length > 0) {
        return true;
      }
      return false;
    }
    return true;
  });
};

export const isMessageStreaming = (
  messageId: string,
  streamingMessageId: string | null,
  disableStreaming: boolean
): boolean => {
  return !disableStreaming && streamingMessageId === messageId;
};
