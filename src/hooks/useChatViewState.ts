import { useMemo, useRef } from 'react';
import { useChatLoadingState } from './useChatLoadingState';
import { useCurrentStage } from './useCurrentStage';
import { ChatTab } from '@/components/chat/ChatController';
import { useSessionContext } from '@/contexts/SessionSyncContext';

export type ChatViewState = 
  | { type: 'loading' }
  | { type: 'no-template' }
  | { type: 'no-sessions' }
  | { type: 'session-loading' }
  | { type: 'ready'; activeTabId: string };

interface UseChatViewStateOptions {
  tabs: ChatTab[];
  activeTab: string;
}

export const useChatViewState = ({ tabs, activeTab }: UseChatViewStateOptions): ChatViewState => {
  const loadingState = useChatLoadingState();
  const { currentStagePriority } = useCurrentStage();
  const { isSyncing, hasSessions } = useSessionContext();
  
  // Track last valid state to prevent flicker during transitions
  const lastValidStateRef = useRef<ChatViewState | null>(null);

  return useMemo(() => {
    // Always show loading during initial load
    if (!loadingState.isChatReady) {
      return { type: 'loading' };
    }

    if (!loadingState.hasTemplate) {
      return { type: 'no-template' };
    }

    const tabsForCurrentStage = tabs.filter(
      (tab) => tab.stageId === currentStagePriority
    );

    // Check if there's a tab being created (should always show as ready/loading, not empty)
    const creatingTab = tabsForCurrentStage.find((tab) => tab.isCreating);
    if (creatingTab) {
      const state = { type: 'ready' as const, activeTabId: creatingTab.id };
      lastValidStateRef.current = state;
      return state;
    }

    // If syncing and no tabs yet, show loading instead of empty state
    // This prevents the empty state flash during stage transitions
    if (isSyncing && tabsForCurrentStage.length === 0) {
      return { type: 'session-loading' };
    }

    // If we know there are sessions in backend but tabs haven't synced yet
    if (hasSessions && tabsForCurrentStage.length === 0) {
      return { type: 'session-loading' };
    }

    if (tabsForCurrentStage.length === 0) {
      return { type: 'no-sessions' };
    }

    const activeTabData = tabsForCurrentStage.find((tab) => tab.sessionId === activeTab);
    if (!activeTabData) {
      if (tabsForCurrentStage.length > 0) {
        const state = { type: 'ready' as const, activeTabId: tabsForCurrentStage[0].id };
        lastValidStateRef.current = state;
        return state;
      }
      return { type: 'no-sessions' };
    }

    const state = { type: 'ready' as const, activeTabId: activeTabData.id };
    lastValidStateRef.current = state;
    return state;
  }, [loadingState, tabs, activeTab, currentStagePriority, isSyncing, hasSessions]);
};
