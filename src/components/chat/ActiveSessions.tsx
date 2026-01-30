import {
  ChatTab,
  useChatControllerOptional,
} from '@/components/chat/ChatController';
import { useSessionContext } from '@/contexts/SessionSyncContext';
import { useSSEConnection } from '@/contexts/SSEConnectionContext';
import { useMessageStore } from '@/features/chat/stores/messageStore';
import { useCurrentStage } from '@/hooks/useCurrentStage';
import { useStageTemplate } from '@/hooks/useStageTemplate';
import { cn } from '@/lib/utils';
import { Loader2, Plus, X } from 'lucide-react';
import React, { useCallback, useMemo, useRef } from 'react';

interface SessionTabProps {
  tab: ChatTab;
  isActive: boolean;
  hasOperationsInProgress: boolean;
  onSessionClick: (sessionId: string) => void;
  onSessionClose: (sessionId: string) => void;
}

const SessionTab: React.FC<SessionTabProps> = ({
  tab,
  isActive,
  hasOperationsInProgress,
  onSessionClick,
  onSessionClose,
}) => {
  // Get message count from messageStore
  const messageCount = useMessageStore(
    useCallback(
      (state) => state.messagesBySession[tab.sessionId || '']?.length ?? 0,
      [tab.sessionId],
    ),
  );

  const displayTitle = tab.title || 'Loop';

  return (
    <div
      onClick={() =>
        !tab.isCreating &&
        !tab.isDeleting &&
        !hasOperationsInProgress &&
        onSessionClick(tab.id)
      }
      className={cn(
        'flex flex-shrink-0 items-center gap-loop-2 h-[32px] pl-loop-4 pr-loop-2 rounded-[20px] shadow-sm transition-all duration-200',
        !tab.isCreating &&
          !tab.isDeleting &&
          !hasOperationsInProgress &&
          'cursor-pointer',
        (tab.isDeleting || (hasOperationsInProgress && !tab.isCreating)) &&
          'opacity-50',
        hasOperationsInProgress &&
          !tab.isCreating &&
          !tab.isDeleting &&
          'cursor-not-allowed',
        isActive && !tab.isDeleting
          ? 'bg-brand-accent-50 text-neutral-grayscale-0'
          : 'bg-neutral-grayscale-0 text-neutral-grayscale-60 hover:bg-neutral-grayscale-10',
      )}
      data-testid={`chat-session-tab-${tab.id}`}
    >
      {tab.isCreating && (
        <Loader2 className="w-[14px] h-[14px] animate-spin text-brand-accent-50" />
      )}
      <span
        className={cn(
          'text-base max-w-[200px] truncate',
          isActive ? 'font-bold' : 'font-normal',
        )}
      >
        {displayTitle}
      </span>

      <div className="relative flex items-center justify-center w-[20px] h-[20px]">
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            isActive ? 'bg-neutral-grayscale-0' : 'bg-neutral-grayscale-60',
          )}
        />
        <span
          className={cn(
            'relative text-sm font-bold',
            isActive ? 'text-brand-accent-50' : 'text-neutral-grayscale-0',
          )}
        >
          {String(messageCount).padStart(2, '0')}
        </span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!tab.isDeleting && !hasOperationsInProgress) {
            onSessionClose(tab.id);
          }
        }}
        disabled={tab.isDeleting || hasOperationsInProgress}
        className={cn(
          'flex items-center justify-center w-[24px] h-[24px] rounded-full transition-all duration-200',
          (tab.isDeleting || hasOperationsInProgress) &&
            'cursor-not-allowed opacity-50',
          !tab.isDeleting &&
            !hasOperationsInProgress &&
            (isActive ? 'hover:bg-white/20' : 'hover:bg-neutral-grayscale-20'),
        )}
        aria-label="Close session"
      >
        {tab.isDeleting ? (
          <Loader2
            className={cn(
              'w-[14px] h-[14px] animate-spin',
              isActive
                ? 'text-neutral-grayscale-0'
                : 'text-neutral-grayscale-60',
            )}
          />
        ) : (
          <X
            className={cn(
              'w-[14px] h-[14px]',
              hasOperationsInProgress &&
                !isActive &&
                'text-neutral-grayscale-40',
              !hasOperationsInProgress &&
                (isActive
                  ? 'text-neutral-grayscale-0'
                  : 'text-neutral-grayscale-60'),
            )}
          />
        )}
      </button>
    </div>
  );
};

export const ActiveSessions: React.FC = () => {
  const chatController = useChatControllerOptional();
  const { currentStagePriority: currentStageId } = useCurrentStage();
  const { stageTemplate, isLoadingStageTemplate } = useStageTemplate();
  const { isSyncing } = useSessionContext();
  const { abortAllForSession, hasActiveStreamForSession } = useSSEConnection();

  // Prevent rapid session switches
  const switchInProgressRef = useRef(false);
  const lastSwitchTimeRef = useRef(0);
  const SWITCH_DEBOUNCE_MS = 200;

  const tabs = useMemo(
    () => chatController?.tabs ?? [],
    [chatController?.tabs],
  );
  const activeTab = chatController?.activeTab ?? '';
  const setActiveTab = useMemo(
    () => chatController?.setActiveTab ?? (() => {}),
    [chatController?.setActiveTab],
  );
  const closeTab = useMemo(
    () => chatController?.closeTab ?? (() => {}),
    [chatController?.closeTab],
  );
  const addNewTab = useMemo(
    () => chatController?.addNewTab ?? (async () => {}),
    [chatController?.addNewTab],
  );
  const canAddNewTab = useMemo(
    () => chatController?.canAddNewTab ?? (() => false),
    [chatController?.canAddNewTab],
  );
  const hasOperationsInProgress =
    chatController?.hasOperationsInProgress ?? false;

  const handleSessionClick = useCallback(
    (tabId: string) => {
      if (hasOperationsInProgress) return;

      // Prevent rapid switching
      const now = Date.now();
      if (
        switchInProgressRef.current ||
        now - lastSwitchTimeRef.current < SWITCH_DEBOUNCE_MS
      ) {
        console.debug('[ActiveSessions] Session switch debounced');
        return;
      }

      // Get the session for this tab
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab?.sessionId) return;

      // Don't switch to already active tab
      if (tab.sessionId === activeTab) return;

      switchInProgressRef.current = true;
      lastSwitchTimeRef.current = now;

      // NOTE: We do NOT abort streams when switching sessions.
      // The runner continues in the background and messages accumulate in messageStore.
      // When user returns to this session, they will see the accumulated messages
      // and the streaming indicator if still active.

      setActiveTab(tabId);

      // Reset switch flag after a short delay
      setTimeout(() => {
        switchInProgressRef.current = false;
      }, 100);
    },
    [hasOperationsInProgress, tabs, activeTab, setActiveTab],
  );

  const handleSessionClose = useCallback(
    (tabId: string) => {
      if (hasOperationsInProgress) return;
      if (tabs.length > 1) {
        // Abort any active stream for this session before closing
        const tab = tabs.find((t) => t.id === tabId);
        if (tab?.sessionId && hasActiveStreamForSession(tab.sessionId)) {
          abortAllForSession(tab.sessionId);
        }
        closeTab(tabId);
      }
    },
    [
      hasOperationsInProgress,
      tabs,
      hasActiveStreamForSession,
      abortAllForSession,
      closeTab,
    ],
  );

  const handleNewSession = useCallback(async () => {
    if (hasOperationsInProgress) return;
    if (!stageTemplate || isLoadingStageTemplate) {
      return;
    }
    if (canAddNewTab()) {
      await addNewTab();
    }
  }, [
    hasOperationsInProgress,
    stageTemplate,
    isLoadingStageTemplate,
    canAddNewTab,
    addNewTab,
  ]);

  if (!chatController) {
    return null;
  }

  const filteredTabs = tabs.filter(
    (tab) => !tab.stageId || tab.stageId === currentStageId,
  );

  // Tabs are already sorted by session order from the query
  const sortedTabs = filteredTabs;

  const showLoader = isSyncing && sortedTabs.length === 0;

  if (showLoader) {
    return (
      <div
        className="flex gap-loop-4 items-center pb-1"
        data-testid="active-sessions-loading"
      >
        <div className="flex flex-shrink-0 items-center gap-loop-2 h-[32px] px-loop-4 rounded-[20px] bg-neutral-grayscale-0 shadow-sm">
          <Loader2 className="w-[14px] h-[14px] animate-spin text-brand-accent-50" />
          <span className="text-base text-neutral-grayscale-60">
            Loading sessions...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex gap-loop-4 items-center overflow-x-auto scrollbar-custom pb-1"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: '#DBDBDB transparent',
      }}
      data-testid="active-sessions-container"
    >
      {sortedTabs.map((tab) => (
        <SessionTab
          key={tab.id}
          tab={tab}
          isActive={tab.sessionId === activeTab}
          hasOperationsInProgress={hasOperationsInProgress}
          onSessionClick={handleSessionClick}
          onSessionClose={handleSessionClose}
        />
      ))}
      <button
        onClick={handleNewSession}
        disabled={
          !canAddNewTab() ||
          hasOperationsInProgress ||
          !stageTemplate ||
          isLoadingStageTemplate
        }
        className={cn(
          'flex flex-shrink-0 items-center justify-center w-[32px] h-[32px] rounded-full transition-all duration-200',
          !canAddNewTab() ||
            hasOperationsInProgress ||
            !stageTemplate ||
            isLoadingStageTemplate
            ? 'opacity-50 cursor-not-allowed bg-neutral-grayscale-0'
            : 'bg-neutral-grayscale-0 hover:bg-neutral-grayscale-10 cursor-pointer',
        )}
        aria-label="New session"
        data-testid="new-session-button"
      >
        <Plus className="w-[18px] h-[18px] text-neutral-grayscale-60" />
      </button>
    </div>
  );
};
