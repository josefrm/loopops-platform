import { useChatController } from '@/components/chat/ChatController';
import { ChatEmptyState } from '@/components/chat/ChatEmptyState';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ChatLoadingState } from '@/components/chat/ChatLoadingState';
import { StageTemplateEmptyState } from '@/components/chat/StageTemplateEmptyState';
import { useChatViewState } from '@/hooks/useChatViewState';
import { cn } from '@/lib/utils';
import { useChatViewStore } from '@/stores/chatViewStore';
import { Loader2 } from 'lucide-react';
import React, { forwardRef } from 'react';

interface ChatContainerProps {
  className?: string;
  style?: React.CSSProperties;
  chatHeaderNavigationRef?: React.RefObject<HTMLDivElement>;
  inputChatContainerRef?: React.RefObject<HTMLTextAreaElement>;
}

export const ChatContainer = forwardRef<HTMLDivElement, ChatContainerProps>(
  (
    { className, style, chatHeaderNavigationRef, inputChatContainerRef },
    ref,
  ) => {
    const {
      tabs,
      activeTab,
      updateTabChatId,
      closeTab,
      addNewTab,
    } = useChatController();
    const { isMaximized } = useChatViewStore();
    const viewState = useChatViewState({ tabs, activeTab });

    // Tabs now come directly from SessionSyncContext via ChatController
    // No need to manually create tabs from URL - that's handled by the context

    const handleCreateNewLoop = async () => {
      await addNewTab();
    };

    switch (viewState.type) {
      case 'loading':
        return <ChatLoadingState className={className} ref={ref} />;

      case 'no-template':
        return (
          <div
            className={cn(
              'relative flex items-center justify-center h-full',
              className,
            )}
            ref={ref}
          >
            <div
              ref={chatHeaderNavigationRef}
              className="absolute top-0 w-full h-16 pointer-events-none"
            />
            <StageTemplateEmptyState />
          </div>
        );

      case 'no-sessions':
        return (
          <ChatEmptyState
            className={className}
            onCreateNewLoop={handleCreateNewLoop}
            chatHeaderNavigationRef={chatHeaderNavigationRef}
            inputChatContainerRef={inputChatContainerRef}
            ref={ref}
          />
        );

      case 'session-loading':
        return <ChatLoadingState className={className} ref={ref} />;

      case 'ready':
        break;
    }

    if (viewState.type !== 'ready') {
      return null;
    }

    const activeTabData = tabs.find((tab) => tab.id === viewState.activeTabId);
    if (!activeTabData) {
      return <ChatLoadingState className={className} ref={ref} />;
    }

    const handleChatSaved = (chatId: string) => {
      updateTabChatId(activeTabData.id, chatId);
    };

    const handleClose = (messages: any[], title: string) => {
      closeTab(activeTabData.id, messages, title);
    };

    if (activeTabData.isCreating === true) {
      return (
        <div
          className={cn(
            'relative flex items-center justify-center h-full',
            className,
          )}
          ref={ref}
        >
          {/* Walkthrough Fallback Anchors */}
          <div
            ref={chatHeaderNavigationRef}
            className="absolute top-0 w-full h-16 pointer-events-none"
          />

          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-brand-accent-50" />
            <p className="text-slate-600">Creating new session...</p>
            {/* Input anchor for consistency, though less interactive here */}
            <div
              ref={inputChatContainerRef as any}
              className="w-full h-10 pointer-events-none"
            />
          </div>
        </div>
      );
    }

    return (
      <ChatInterface
        className={className}
        style={style}
        ref={ref}
        tabId={activeTabData.id}
        loadedTitle={activeTabData.title}
        currentChatId={activeTabData.sessionId}
        onChatSaved={handleChatSaved}
        onClose={handleClose}
        isCollapsed={isMaximized}
        chatHeaderNavigationRef={chatHeaderNavigationRef}
        inputChatContainerRef={inputChatContainerRef}
      />
    );
  },
);

ChatContainer.displayName = 'ChatContainer';
