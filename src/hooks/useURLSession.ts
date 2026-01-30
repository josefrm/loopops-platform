/**
 * URL-Derived Session Hook
 * 
 * This hook makes URL the single source of truth for the current session.
 * It derives the current session from URL parameters and ensures store consistency.
 * 
 * The URL is authoritative - the store syncs TO the URL, never the other way around.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/features/chat/stores/sessionStore';
import { useUIStore } from '@/features/chat/stores/uiStore';
import { useRunEventsStore } from '@/features/chat/stores/runEventsStore';

interface URLSessionState {
  /**
   * Session ID from URL (source of truth)
   */
  sessionId: string | null;
  
  /**
   * Stage priority from URL
   */
  stagePriority: number | null;
  
  /**
   * Whether URL session exists in the store
   */
  sessionExistsInStore: boolean;
  
  /**
   * The full session metadata from store (if exists)
   */
  sessionMetadata: ReturnType<typeof useSessionStore.getState>['sessionsByTab'][string] | null;
  
  /**
   * Navigate to a specific session (updates URL and syncs store)
   */
  navigateToSession: (sessionId: string, options?: { replace?: boolean }) => void;
  
  /**
   * Navigate to a specific stage
   */
  navigateToStage: (stagePriority: number, options?: { replace?: boolean }) => void;
  
  /**
   * Clear current session from URL
   */
  clearSession: () => void;
  
  /**
   * Check if a given session ID is the current URL session
   */
  isCurrentSession: (sessionId: string) => boolean;
}

/**
 * Hook that makes URL the absolute source of truth for session state.
 * 
 * Usage:
 * ```tsx
 * const { sessionId, navigateToSession, isCurrentSession } = useURLSession();
 * 
 * // Check if this is the active session
 * if (isCurrentSession(mySessionId)) {
 *   // This session is active
 * }
 * 
 * // Navigate to a session
 * navigateToSession('session-123');
 * ```
 */
export function useURLSession(): URLSessionState {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Extract URL parameters
  const sessionId = searchParams.get('session_id');
  const stageParam = searchParams.get('stage');
  const stagePriority = stageParam ? parseInt(stageParam, 10) : null;
  
  // Track previous session for cleanup
  const prevSessionIdRef = useRef<string | null>(null);
  
  // Find session in store
  const sessionsByTab = useSessionStore((state) => state.sessionsByTab);
  
  const sessionEntry = useMemo(() => {
    if (!sessionId) return null;
    
    // Find the tab that has this session ID
    const entry = Object.entries(sessionsByTab).find(
      ([_, session]) => session.sessionId === sessionId
    );
    
    return entry ? { tabId: entry[0], session: entry[1] } : null;
  }, [sessionId, sessionsByTab]);
  
  const sessionExistsInStore = sessionEntry !== null;
  const sessionMetadata = sessionEntry?.session ?? null;
  
  // Sync active session in store with URL
  useEffect(() => {
    if (!sessionId) return;
    
    const currentActive = useSessionStore.getState().activeSessionId;
    
    // Only update store if URL session is different from store's active
    if (currentActive !== sessionId && sessionExistsInStore) {
      useSessionStore.getState().setActiveSession(sessionId);
    }
  }, [sessionId, sessionExistsInStore]);
  
  // Clean up previous session's transient state when URL changes
  useEffect(() => {
    const prevSessionId = prevSessionIdRef.current;
    
    if (prevSessionId && prevSessionId !== sessionId) {
      // Previous session is no longer active - clean up UI state
      // but DON'T clear messages (they might be needed for history)
      const uiStore = useUIStore.getState();
      const runEventsStore = useRunEventsStore.getState();
      
      // Clear run events for previous session (these are per-run, not historical)
      runEventsStore.clearEvents(prevSessionId);
      
      // If the previous session was streaming, it should already be aborted
      // by SSEConnectionContext, but ensure UI state is clean
      if (uiStore.streamingBySession[prevSessionId]?.isActive) {
        console.warn('[useURLSession] Cleaning up orphaned streaming state for:', prevSessionId);
        uiStore.setStreaming(prevSessionId, null);
        uiStore.setTyping(prevSessionId, false);
      }
    }
    
    prevSessionIdRef.current = sessionId;
  }, [sessionId]);
  
  const navigateToSession = useCallback(
    (targetSessionId: string, options?: { replace?: boolean }) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('session_id', targetSessionId);
      
      if (options?.replace) {
        setSearchParams(newParams, { replace: true });
      } else {
        navigate(`?${newParams.toString()}`);
      }
    },
    [searchParams, setSearchParams, navigate]
  );
  
  const navigateToStage = useCallback(
    (targetStagePriority: number, options?: { replace?: boolean }) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('stage', targetStagePriority.toString());
      
      // Clear session when changing stages - new stage will set its own
      newParams.delete('session_id');
      
      if (options?.replace) {
        setSearchParams(newParams, { replace: true });
      } else {
        navigate(`?${newParams.toString()}`);
      }
    },
    [searchParams, setSearchParams, navigate]
  );
  
  const clearSession = useCallback(() => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('session_id');
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);
  
  const isCurrentSession = useCallback(
    (checkSessionId: string) => {
      return sessionId === checkSessionId;
    },
    [sessionId]
  );
  
  return {
    sessionId,
    stagePriority,
    sessionExistsInStore,
    sessionMetadata,
    navigateToSession,
    navigateToStage,
    clearSession,
    isCurrentSession,
  };
}

/**
 * Guard that ensures operations only execute for the current URL session.
 * Prevents race conditions where operations complete after user has navigated away.
 * 
 * Usage:
 * ```tsx
 * const isCurrentSession = useSessionGuard('session-123');
 * 
 * // In async operation
 * const response = await fetchData();
 * if (!isCurrentSession()) {
 *   // User navigated away, discard results
 *   return;
 * }
 * // Safe to update state
 * ```
 */
export function useSessionGuard(sessionId: string): () => boolean {
  const { isCurrentSession } = useURLSession();
  
  // Return a function that checks if session is still current
  return useCallback(() => {
    return isCurrentSession(sessionId);
  }, [isCurrentSession, sessionId]);
}
