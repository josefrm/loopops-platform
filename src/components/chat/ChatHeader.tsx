import { cn } from '@/lib/utils';
import { useChatViewStore } from '@/stores/chatViewStore';
import React from 'react';
import { SizeToggle } from '../ui/SizeToggle';
import { ChatHeaderAgents, ChatHeaderNavigation } from './chat-header';

interface ChatHeaderProps {
  className?: string;
  chatHeaderNavigationRef?: React.RefObject<HTMLDivElement>;
  chatInterfaceMinimizeRef?: React.RefObject<HTMLDivElement>;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  className = '',
  chatHeaderNavigationRef,
  chatInterfaceMinimizeRef,
}) => {
  const { isMaximized, toggleMaximize } = useChatViewStore();

  const handleMaximize = () => {
    if (!isMaximized) toggleMaximize();
  };
  const handleMinimize = () => {
    if (isMaximized) toggleMaximize();
  };
  return (
    <div
      className={cn(
        'h-loop-16 px-loop-6 bg-neutral-grayscale-0 border-b border-b-neutral-grayscale-20',
        className,
      )}
      data-testid="chat-header"
    >
      <div className="h-full flex items-center justify-between">
        <div className="flex items-center">
          <div className="-ml-2">
            <ChatHeaderAgents />
          </div>
        </div>

        <ChatHeaderNavigation ref={chatHeaderNavigationRef} />

        <div
          ref={chatInterfaceMinimizeRef}
          data-testid="chat-header-size-toggle"
        >
          <SizeToggle
            isMaximized={!isMaximized}
            onMaximize={handleMinimize}
            onMinimize={handleMaximize}
            className={className}
            maximizeTitle="Maximize chat"
            minimizeTitle="Minimize chat"
          />
        </div>
      </div>
    </div>
  );
};
