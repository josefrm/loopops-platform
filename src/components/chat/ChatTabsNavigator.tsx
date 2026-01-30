import { useChatController } from '@/components/chat/ChatController';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMessageStore } from '@/features/chat/stores/messageStore';
import { X } from 'lucide-react';
import React, { useCallback } from 'react';

interface ChatTabsNavigatorProps {
  className?: string;
}

export const ChatTabsNavigator: React.FC<ChatTabsNavigatorProps> = ({
  className,
}) => {
  const { tabs, activeTab, setActiveTab, closeTab } = useChatController();

  const needsCompressedLayout = useCallback(() => {
    return tabs.length > 6;
  }, [tabs.length]);

  const getTabStyles = useCallback(() => {
    const containerMaxWidthVw = 50;
    const minTabWidthPx = 30;

    if (tabs.length > 12) {
      const availableWidth = `calc(${containerMaxWidthVw}vw / ${tabs.length})`;
      return {
        minWidth: `${minTabWidthPx}px`,
        maxWidth: availableWidth,
        width: availableWidth,
      };
    } else if (needsCompressedLayout()) {
      return {
        minWidth: '80px',
        maxWidth: '150px',
        flexShrink: 1,
        flexGrow: 0,
      };
    } else {
      return { minWidth: 'auto', maxWidth: 'auto' };
    }
  }, [tabs.length, needsCompressedLayout]);
  const handleCloseTab = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.preventDefault();
      e.stopPropagation();
      e.nativeEvent.stopImmediatePropagation();
      closeTab(tabId);
    },
    [closeTab],
  );

  return (
    <div className={className} data-testid="chat-tabs-navigator">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-loop-8 overflow-hidden bg-none bg-color-none max-w-[50vw] overflow-x-auto scrollbar-hide space-x-loop-1" data-testid="chat-tabs-list">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={`flex items-center justify-center relative rounded-sm flex-shrink-0 max-h-loop-8 max-w-[125px] space-x-loop-2 ${
                tab.id === activeTab
                  ? '!bg-neutral-grayscale-60 !text-white'
                  : '!bg-neutral-grayscale-20 !text-neutral-grayscale-50 border border-neutral-grayscale-30'
              }`}
              style={getTabStyles()}
              data-testid={`chat-tab-${tab.id}`}
            >
              {tabs.length > 12 ? (
                tabs.length > 1 && (
                  <div
                    className="h-loop-8 border border-neutral-grayscale-30 w-loop-8 text-base bold p-0 hover:text-brand-accent-50 hover:bg-color-none flex items-center justify-center cursor-pointer rounded group"
                    onClick={(e) => handleCloseTab(e, tab.id)}
                  >
                    <X
                      width={24}
                      height={24}
                      className="text-neutral-grayscale-40 bold group-hover:text-brand-accent-50 transition-colors"
                    />
                  </div>
                )
              ) : needsCompressedLayout() ? (
                <div className="flex items-center space-x-loop-2 min-w-0 flex-1">
                  <span
                    className="truncate flex-1 min-w-0 text-base max-w-[45px]"
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                    }}
                  >
                    {tab.title}
                  </span>
                  <div className="w-[16px] h-[16px] rounded-full bg-brand-accent-50 flex items-center justify-center">
                    <span className="text-sm text-white">
                      {tab.sessionId
                        ? useMessageStore
                            .getState()
                            .getMessages(tab.sessionId).length
                        : 0}
                    </span>
                  </div>
                  {tabs.length > 1 && (
                    <div
                      className="hover:text-brand-accent-50 hover:bg-color-none flex items-center justify-center cursor-pointer rounded group flex-shrink-0"
                      onClick={(e) => handleCloseTab(e, tab.id)}
                    >
                      <X
                        width={16}
                        height={16}
                        className="text-neutral-grayscale-40 bold group-hover:text-brand-accent-50 transition-colors"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-loop-2">
                  <span
                    className="truncate max-w-[45px]"
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                    }}
                  >
                    {tab.title}
                  </span>
                  <div className="w-[16px] h-[16px] rounded-full bg-brand-accent-50 flex items-center justify-center">
                    <span className="text-sm text-white">
                      {tab.sessionId
                        ? useMessageStore
                            .getState()
                            .getMessages(tab.sessionId).length
                        : 0}
                    </span>
                  </div>
                  {tabs.length > 1 && (
                    <div
                      className="hover:text-brand-accent-50 hover:bg-color-none flex items-center justify-center cursor-pointer rounded group"
                      onClick={(e) => handleCloseTab(e, tab.id)}
                    >
                      <X
                        width={16}
                        height={16}
                        className="text-neutral-grayscale-40 bold group-hover:text-brand-accent-50 transition-colors"
                      />
                    </div>
                  )}
                </div>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
};
