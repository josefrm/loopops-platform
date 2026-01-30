import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { MarkdownMessage } from '@/components/chat/MarkdownMessage';
import { TypewriterText } from '@/components/ui/TypewriterText';
import { useScrollToBottom } from '@/hooks/useScrollToBottom';
import { Message } from '@/models/Message';

interface StreamingMessageProps {
  message: Message;
  isStreaming?: boolean;
  disableTypingEffect?: boolean;
  onStreamingComplete?: () => void;
  className?: string;
}

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  message,
  isStreaming = false,
  disableTypingEffect = false,
  onStreamingComplete,
  className,
}) => {
  const [fullContent, setFullContent] = useState(message.content);
  const [isTypingComplete, setIsTypingComplete] = useState(disableTypingEffect);

  const { containerRef, scrollToBottom } = useScrollToBottom([fullContent], {
    enabled: isStreaming || !isTypingComplete,
    delay: 100,
    behavior: 'smooth',
  });

  useEffect(() => {
    if (message.content !== fullContent) {
      setFullContent(message.content);
    }
  }, [message.content, fullContent]);

  const handleTypingComplete = () => {
    setIsTypingComplete(true);
    onStreamingComplete?.();
    setTimeout(() => scrollToBottom(true), 100);
  };

  if (disableTypingEffect || (!isStreaming && message.content)) {
    return (
      <div ref={containerRef} className={className}>
        <Card className="p-4">
          <MarkdownMessage content={message.content} />
        </Card>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      <Card className="p-4">
        <div className="prose prose-sm max-w-none">
          <TypewriterText
            text={fullContent}
            disabled={disableTypingEffect}
            onComplete={handleTypingComplete}
            speed={3}
            interval={30}
          />
        </div>
      </Card>
    </div>
  );
};
