import { useRunErrorStore, RunError } from '@/features/chat/stores/runErrorStore';
import { useSSEConnection } from '@/contexts/SSEConnectionContext';
import { useCallback, useEffect, useMemo } from 'react';

/**
 * Hook for managing run error recovery and incomplete sessions.
 * 
 * Provides utilities to:
 * - Detect incomplete/failed runs for a session
 * - Retry failed runs
 * - Resume incomplete sessions
 * - Clear errors
 * 
 * @example
 * ```tsx
 * function ChatInterface({ sessionId }) {
 *   const {
 *     activeError,
 *     canRetry,
 *     isRetrying,
 *     retryRun,
 *     clearError,
 *   } = useRunRecovery(sessionId);
 * 
 *   if (activeError) {
 *     return (
 *       <ErrorBanner
 *         message={activeError.message}
 *         canRetry={canRetry}
 *         isRetrying={isRetrying}
 *         onRetry={retryRun}
 *         onDismiss={clearError}
 *       />
 *     );
 *   }
 * }
 * ```
 */
export function useRunRecovery(sessionId: string | null) {
  const sseConnection = useSSEConnection();
  const errorStore = useRunErrorStore();
  const { activeErrorBySession, incompleteSessions } = errorStore;

  // Get active error for this session
  const activeError = useMemo(() => {
    if (!sessionId) return null;
    return errorStore.getActiveError(sessionId);
  }, [sessionId, activeErrorBySession, errorStore]);

  // Get incomplete session info
  const incompleteSession = useMemo(() => {
    if (!sessionId) return null;
    return errorStore.getIncompleteSession(sessionId);
  }, [sessionId, incompleteSessions, errorStore]);

  // Check if retry is possible
  const canRetry = useMemo(() => {
    if (!activeError) return false;
    return activeError.isRetriable && activeError.retryCount < activeError.maxRetries;
  }, [activeError]);

  // Check if currently retrying
  const isRetrying = useMemo(() => {
    return activeError?.isRetrying || false;
  }, [activeError]);

  // Calculate time until next retry
  const retryCountdown = useMemo(() => {
    if (!activeError?.nextRetryAt) return null;
    const remaining = activeError.nextRetryAt - Date.now();
    return remaining > 0 ? remaining : null;
  }, [activeError?.nextRetryAt]);

  // Retry the failed run
  const retryRun = useCallback(async () => {
    if (!sessionId || !activeError) {
      console.warn('[useRunRecovery] Cannot retry - no session or error');
      return;
    }
    
    await sseConnection.retryRun(sessionId, activeError.agentMessageId);
  }, [sessionId, activeError, sseConnection]);

  // Clear the error
  const clearError = useCallback(() => {
    if (!sessionId) return;
    sseConnection.clearErrorForSession(sessionId);
  }, [sessionId, sseConnection]);

  // Cancel pending retry
  const cancelRetry = useCallback(() => {
    if (!sessionId || !activeError) return;
    sseConnection.cancelRetry(sessionId, activeError.agentMessageId);
  }, [sessionId, activeError, sseConnection]);

  // Resume incomplete session
  const resumeSession = useCallback(async () => {
    if (!sessionId) return;
    await sseConnection.resumeIncompleteSession(sessionId);
  }, [sessionId, sseConnection]);

  return {
    /** Current active error for the session */
    activeError,
    /** Incomplete session data if available */
    incompleteSession,
    /** Whether the error can be retried */
    canRetry,
    /** Whether a retry is currently in progress */
    isRetrying,
    /** Time remaining until next automatic retry (ms) */
    retryCountdown,
    /** Retry the failed run */
    retryRun,
    /** Clear/dismiss the error */
    clearError,
    /** Cancel a pending retry */
    cancelRetry,
    /** Resume an incomplete session */
    resumeSession,
    /** Check if session has any error */
    hasError: activeError !== null,
    /** Check if session is incomplete */
    isIncomplete: incompleteSession !== null,
  };
}

/**
 * Hook for checking and recovering all incomplete sessions on app load.
 * 
 * Should be used at the app level to detect sessions that were
 * interrupted (e.g., browser crash, tab close during run).
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { incompleteSessions, recoverSession, dismissAll } = useIncompleteSessionRecovery();
 * 
 *   if (incompleteSessions.length > 0) {
 *     return (
 *       <RecoveryDialog
 *         sessions={incompleteSessions}
 *         onRecover={recoverSession}
 *         onDismissAll={dismissAll}
 *       />
 *     );
 *   }
 * }
 * ```
 */
export function useIncompleteSessionRecovery() {
  const sseConnection = useSSEConnection();
  const errorStore = useRunErrorStore();
  const { incompleteSessions: incompleteSessionsState } = errorStore;

  // Get all incomplete sessions
  const incompleteSessions = useMemo(() => {
    return errorStore.getIncompleteSessions();
  }, [incompleteSessionsState, errorStore]);

  // Filter sessions that are actually recoverable (not too old, etc.)
  const recoverableSessions = useMemo(() => {
    const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    
    return incompleteSessions.filter((session) => {
      // Skip if too old
      if (now - session.startedAt > MAX_AGE_MS) {
        return false;
      }
      // Skip if in error state with no more retries
      if (session.lastState === 'error') {
        const error = errorStore.getActiveError(session.sessionId);
        if (error && !error.isRetriable) {
          return false;
        }
      }
      return true;
    });
  }, [incompleteSessions, errorStore]);

  // Recover a specific session
  const recoverSession = useCallback(async (sessionId: string) => {
    await sseConnection.resumeIncompleteSession(sessionId);
  }, [sseConnection]);

  // Dismiss a specific session (mark as abandoned)
  const dismissSession = useCallback((sessionId: string) => {
    errorStore.removeIncompleteSession(sessionId);
    errorStore.clearError(sessionId);
  }, [errorStore]);

  // Dismiss all incomplete sessions
  const dismissAll = useCallback(() => {
    incompleteSessions.forEach((session) => {
      errorStore.removeIncompleteSession(session.sessionId);
      errorStore.clearError(session.sessionId);
    });
  }, [incompleteSessions, errorStore]);

  // Cleanup old sessions on mount
  useEffect(() => {
    const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
    const now = Date.now();
    const sessions = errorStore.getIncompleteSessions();
    
    sessions.forEach((session) => {
      if (now - session.startedAt > MAX_AGE_MS) {
        console.log('[useIncompleteSessionRecovery] Cleaning up old incomplete session:', session.sessionId);
        errorStore.removeIncompleteSession(session.sessionId);
      }
    });
  }, [errorStore]); // Only on mount, errorStore is stable

  return {
    /** All incomplete sessions */
    incompleteSessions,
    /** Incomplete sessions that can be recovered */
    recoverableSessions,
    /** Whether there are any recoverable sessions */
    hasRecoverableSessions: recoverableSessions.length > 0,
    /** Recover a specific session */
    recoverSession,
    /** Dismiss/abandon a session */
    dismissSession,
    /** Dismiss all incomplete sessions */
    dismissAll,
  };
}

/**
 * Hook for getting all errors across all sessions.
 * Useful for showing a global error indicator.
 */
export function useGlobalRunErrors() {
  const errorStore = useRunErrorStore();

  // Get all active errors
  const allErrors = useMemo(() => {
    const errors: RunError[] = [];
    Object.values(errorStore.activeErrorBySession).forEach((error) => {
      if (error) errors.push(error);
    });
    return errors;
  }, [errorStore.activeErrorBySession]);

  // Count retriable vs non-retriable
  const retriableCount = useMemo(() => {
    return allErrors.filter((e) => e.isRetriable).length;
  }, [allErrors]);

  const nonRetriableCount = useMemo(() => {
    return allErrors.filter((e) => !e.isRetriable).length;
  }, [allErrors]);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    errorStore.clearAllErrors();
  }, [errorStore]);

  return {
    /** All active errors across sessions */
    allErrors,
    /** Count of errors */
    errorCount: allErrors.length,
    /** Count of retriable errors */
    retriableCount,
    /** Count of non-retriable errors */
    nonRetriableCount,
    /** Whether there are any errors */
    hasErrors: allErrors.length > 0,
    /** Clear all errors */
    clearAllErrors,
  };
}
