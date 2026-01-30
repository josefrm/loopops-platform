import { ActiveSessions } from '@/components/chat/ActiveSessions';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { useChatViewStore } from '@/stores/chatViewStore';
import React, { forwardRef } from 'react';

interface MainChatAreaProps {
  className?: string;
  style?: React.CSSProperties;
  activeSessionsRef?: React.RefObject<HTMLDivElement>;
  chatHeaderNavigationRef?: React.RefObject<HTMLDivElement>;
  inputChatContainerRef?: React.RefObject<HTMLTextAreaElement>;
}

export const MainChatArea = forwardRef<HTMLDivElement, MainChatAreaProps>(
  (
    {
      className,
      style,
      activeSessionsRef,
      inputChatContainerRef,
      chatHeaderNavigationRef,
    },
    ref,
  ) => {
    const { isMaximized } = useChatViewStore();

    return (
      <div className={className} style={style} ref={ref} data-testid="main-chat-area">
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isMaximized ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div
            className="bg-neutral-grayscale-20 p-loop-4 rounded-t-lg"
            ref={activeSessionsRef}
            data-testid="chat-active-sessions"
          >
            <ActiveSessions />
          </div>
        </div>

        <ChatContainer
          className="flex-1 overflow-hidden bg-white h-full"
          inputChatContainerRef={inputChatContainerRef}
          chatHeaderNavigationRef={chatHeaderNavigationRef}
          style={{
            // clipPath: isMaximized ? 'inset(0px 16px 0px round 16px)' : 'none',
            borderTopLeftRadius: isMaximized ? 'calc(0.5em * 1.5)' : '0px',
            borderTopRightRadius: isMaximized ? 'calc(0.5em * 1.5)' : '0px',
          }}
          data-testid="chat-container"
        />
      </div>
    );
  },
);

MainChatArea.displayName = 'MainChatArea';
