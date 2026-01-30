/**
 * Navigation Guard Hook
 * 
 * Provides a robust mechanism to prevent navigation conflicts
 * during active streaming operations and rapid session switches.
 * 
 * This is the central authority for determining if navigation is safe.
 */

import { useCallback, useRef, useEffect } from 'react';
import { useUIStore } from '@/features/chat/stores/uiStore';
import { useSSEConnection } from '@/contexts/SSEConnectionContext';

interface NavigationGuardOptions {
  /**
   * Debounce time in milliseconds for navigation actions
   * @default 300
   */
  debounceMs?: number;
  
  /**
   * Whether to force abort active streams before navigation
   * @default false
   */
  forceAbort?: boolean;
}

interface NavigationGuardResult {
  /**
   * Whether any streaming is currently active
   */
  hasActiveStream: boolean;
  
  /**
   * Get the session ID that is currently streaming (if any)
   */
  activeStreamingSessionId: string | null;
  
  /**
   * Whether navigation is currently safe (no active streams, not debouncing)
   */
  canNavigate: boolean;
  
  /**
   * Execute a navigation action with guards
   * Returns true if navigation was allowed, false if blocked
   */
  guardedNavigate: (
    targetSessionId: string,
    action: () => void | Promise<void>,
    options?: { forceAbort?: boolean }
  ) => Promise<boolean>;
  
  /**
   * Abort any active stream for a session
   */
  abortStreamForSession: (sessionId: string, tabId: string) => void;
  
  /**
   * Force cleanup all stuck streaming states
   */
  forceCleanup: () => void;
}

export function useNavigationGuard(
  options: NavigationGuardOptions = {}
): NavigationGuardResult {
  const { debounceMs = 300, forceAbort = false } = options;
  
  const lastNavigationRef = useRef<number>(0);
  const pendingNavigationRef = useRef<string | null>(null);
  const { abortStream, forceCleanupStuckStreaming } = useSSEConnection();
  
  // Get active streaming session
  const streamingStates = useUIStore((state) => state.streamingBySession);
  
  const activeStreamingSessionId = Object.entries(streamingStates).find(
    ([_, state]) => state !== null && state?.isActive
  )?.[0] ?? null;
  
  const hasActiveStream = activeStreamingSessionId !== null;
  
  // Check if we're within debounce window
  const isWithinDebounce = useCallback(() => {
    const now = Date.now();
    return now - lastNavigationRef.current < debounceMs;
  }, [debounceMs]);
  
  const canNavigate = !hasActiveStream && !isWithinDebounce();
  
  const abortStreamForSession = useCallback(
    (sessionId: string, tabId: string) => {
      abortStream(sessionId, tabId);
    },
    [abortStream]
  );
  
  const forceCleanup = useCallback(() => {
    forceCleanupStuckStreaming();
  }, [forceCleanupStuckStreaming]);
  
  const guardedNavigate = useCallback(
    async (
      targetSessionId: string,
      action: () => void | Promise<void>,
      navOptions?: { forceAbort?: boolean }
    ): Promise<boolean> => {
      const shouldForceAbort = navOptions?.forceAbort ?? forceAbort;
      
      // Prevent duplicate navigation to the same target
      if (pendingNavigationRef.current === targetSessionId) {
        console.debug('[NavigationGuard] Duplicate navigation blocked:', targetSessionId);
        return false;
      }
      
      // Check debounce
      if (isWithinDebounce()) {
        console.debug('[NavigationGuard] Navigation debounced');
        return false;
      }
      
      // Check for active stream
      if (hasActiveStream && !shouldForceAbort) {
        console.debug('[NavigationGuard] Navigation blocked - active stream:', activeStreamingSessionId);
        return false;
      }
      
      // If we should force abort, do it
      if (hasActiveStream && shouldForceAbort && activeStreamingSessionId) {
        console.debug('[NavigationGuard] Force aborting stream:', activeStreamingSessionId);
        // Find the tab ID for this session - we'll use session ID as fallback
        abortStreamForSession(activeStreamingSessionId, activeStreamingSessionId);
      }
      
      // Mark navigation in progress
      lastNavigationRef.current = Date.now();
      pendingNavigationRef.current = targetSessionId;
      
      try {
        await action();
        return true;
      } finally {
        // Clear pending navigation after a short delay
        setTimeout(() => {
          if (pendingNavigationRef.current === targetSessionId) {
            pendingNavigationRef.current = null;
          }
        }, 100);
      }
    },
    [
      hasActiveStream,
      activeStreamingSessionId,
      forceAbort,
      isWithinDebounce,
      abortStreamForSession,
    ]
  );
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pendingNavigationRef.current = null;
    };
  }, []);
  
  return {
    hasActiveStream,
    activeStreamingSessionId,
    canNavigate,
    guardedNavigate,
    abortStreamForSession,
    forceCleanup,
  };
}
