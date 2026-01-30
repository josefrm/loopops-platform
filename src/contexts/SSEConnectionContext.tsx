import { FEATURE_FLAGS } from '@/config/featureFlags';
import { useMessageStore } from '@/features/chat/stores/messageStore';
import { useRunEventsStore } from '@/features/chat/stores/runEventsStore';
import { useRunErrorStore, classifyError, RunErrorCategory, IncompleteSession, RunError } from '@/features/chat/stores/runErrorStore';
import { useUIStore } from '@/features/chat/stores/uiStore';
import {
  BackendAttachment,
  transformBackendAttachment,
} from '@/features/chat/utils/messageParser.utils';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { MessageAttachment } from '@/models/Message';
import { streamBackendApi, StreamError, globalRetryManager } from '@/services/streaming';
import { showRunCompleteNotification } from '@/utils/notifications';
import { useQueryClient } from '@tanstack/react-query';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';

interface SSEConnection {
  sessionId: string;
  tabId: string;
  agentMessageId: string;
  abortController: AbortController;
  startTime: number; // Track when streaming started
  stageId?: string; // Track which stage this stream belongs to
  lastActivityTime: number; // Track last time we received data from the stream
}

/**
 * Checks if the given session is still the active URL session.
 * Used for conditional UI updates (not for blocking message processing).
 */
function isSessionStillActive(sessionId: string): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  const urlSessionId = urlParams.get('session_id');
  return urlSessionId === sessionId;
}

// Maximum streaming time before auto-cleanup (5 minutes)
const STREAMING_TIMEOUT_MS = 5 * 60 * 1000;

interface SSEConnectionContextValue {
  startStream: (options: {
    sessionId: string;
    tabId: string;
    message: string;
    runnerId?: string;
    runnerType?: 'team' | 'agent';
    workspaceId?: string;
    projectId?: string;
    stageId?: string;
    userId?: string;
    files?: File[];
    fileKeys?: string[];
    bucketName?: string;
    attachments?: any[];
    agentMessageId: string;
  }) => Promise<void>;
  abortStream: (sessionId: string, tabId: string) => void;
  abortAllForSession: (sessionId: string) => void;
  abortAllForStage: (stageId: string) => void;
  forceCleanupStuckStreaming: () => void;
  hasActiveStreamForSession: (sessionId: string) => boolean;
  getActiveConnectionsCount: () => number;
  /** Retry a failed run */
  retryRun: (sessionId: string, agentMessageId: string) => Promise<void>;
  /** Cancel pending retry for a session */
  cancelRetry: (sessionId: string, agentMessageId: string) => void;
  /** Get error for a session */
  getErrorForSession: (sessionId: string) => RunError | null;
  /** Check if session has an active error */
  hasErrorForSession: (sessionId: string) => boolean;
  /** Clear error for a session */
  clearErrorForSession: (sessionId: string) => void;
  /** Resume incomplete session */
  resumeIncompleteSession: (sessionId: string) => Promise<void>;
  /** Get all incomplete sessions */
  getIncompleteSessions: () => IncompleteSession[];
}

const SSEConnectionContext = createContext<SSEConnectionContextValue | null>(
  null,
);

export const SSEConnectionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const connectionsRef = useRef<Map<string, SSEConnection>>(new Map());
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Helper to check if a session has active connections
  const hasActiveStreamForSession = useCallback(
    (sessionId: string): boolean => {
      return Array.from(connectionsRef.current.values()).some(
        (conn) => conn.sessionId === sessionId,
      );
    },
    [],
  );

  // Helper to get active connections count
  const getActiveConnectionsCount = useCallback((): number => {
    return connectionsRef.current.size;
  }, []);

  // Abort all connections for a specific session
  const abortAllForSession = useCallback((sessionId: string) => {
    const uiStore = useUIStore.getState();
    const runEventsStore = useRunEventsStore.getState();

    connectionsRef.current.forEach((connection, key) => {
      if (connection.sessionId === sessionId) {
        console.debug(
          '[SSEConnection] Aborting stream for session:',
          sessionId,
        );
        connection.abortController.abort();
        runEventsStore.endRun(connection.agentMessageId);
        connectionsRef.current.delete(key);
      }
    });

    uiStore.setStreaming(sessionId, null);
    uiStore.setTyping(sessionId, false);
  }, []);

  // Abort all connections for a specific stage
  const abortAllForStage = useCallback((stageId: string) => {
    const uiStore = useUIStore.getState();
    const runEventsStore = useRunEventsStore.getState();

    connectionsRef.current.forEach((connection, key) => {
      if (connection.stageId === stageId) {
        console.debug(
          '[SSEConnection] Aborting stream for stage:',
          stageId,
          'session:',
          connection.sessionId,
        );
        connection.abortController.abort();
        runEventsStore.endRun(connection.agentMessageId);
        uiStore.setStreaming(connection.sessionId, null);
        uiStore.setTyping(connection.sessionId, false);
        connectionsRef.current.delete(key);
      }
    });
  }, []);

  const startStream = async (options: {
    sessionId: string;
    tabId: string;
    message: string;
    runnerId?: string;
    runnerType?: 'team' | 'agent';
    workspaceId?: string;
    projectId?: string;
    stageId?: string;
    userId?: string;
    files?: File[];
    fileKeys?: string[];
    bucketName?: string;
    agentMessageId: string;
  }) => {
    const {
      sessionId,
      tabId,
      message,
      files = [],
      fileKeys,
      bucketName,
      agentMessageId,
      runnerId,
      runnerType,
      workspaceId,
      projectId,
      stageId,
      userId,
    } = options;

    // Validate session is still active before starting stream
    if (!isSessionStillActive(sessionId)) {
      console.warn(
        '[SSEConnection] Attempted to start stream for inactive session:',
        sessionId,
      );
      return;
    }

    const uiStore = useUIStore.getState();
    const runEventsStore = useRunEventsStore.getState();

    const connectionKey = `${sessionId}_${tabId}`;

    // Abort any existing connection for this session/tab combination
    if (connectionsRef.current.has(connectionKey)) {
      const existing = connectionsRef.current.get(connectionKey);
      console.debug(
        '[SSEConnection] Aborting existing connection for:',
        connectionKey,
      );
      existing?.abortController.abort();
      connectionsRef.current.delete(connectionKey);
    }

    // Also abort any other streams for this session (different tabs)
    // to prevent duplicate streams for the same session
    abortAllForSession(sessionId);

    const abortController = new AbortController();

    const now = Date.now();
    connectionsRef.current.set(connectionKey, {
      sessionId,
      tabId,
      agentMessageId,
      abortController,
      startTime: now,
      lastActivityTime: now, // Initialize last activity time
      stageId, // Track which stage this stream belongs to
    });

    try {
      uiStore.setStreaming(sessionId, agentMessageId);
      uiStore.setTyping(sessionId, true);
      runEventsStore.startRun(agentMessageId);

      // Track this as an incomplete session for potential recovery
      const runErrorStore = useRunErrorStore.getState();
      runErrorStore.trackIncompleteSession({
        sessionId,
        agentMessageId,
        originalMessage: message,
        runnerId,
        runnerType,
        stageId,
        lastState: 'streaming',
      });

      await streamBackendApi(
        {
          sessionId,
          message,
          runnerId,
          runnerType,
          filters: {
            workspace_id: workspaceId,
            project_id: projectId,
            user_id: user?.id || '',
          },
          files: files,
          fileKeys: fileKeys,
          bucketName: bucketName,
          abortSignal: abortController.signal,
          userId: user?.id || '',
          agentMessageId, // Pass for retry manager
          stageId, // Pass for retry manager
        },
        {
          onChunk: (chunk) => {
            // Update last activity time when we receive chunks
            const connection = connectionsRef.current.get(connectionKey);
            if (connection) {
              connection.lastActivityTime = Date.now();
            }

            // Update incomplete session state
            const errorStore = useRunErrorStore.getState();
            errorStore.updateIncompleteSession(sessionId, {
              lastEventAt: Date.now(),
            });

            if (!FEATURE_FLAGS.ENABLE_CHUNK_STREAMING) {
              return;
            }

            // Always process chunks - messages accumulate in store
            // even when user navigates away from this session

            // Get fresh reference to message store
            const currentMessageStore = useMessageStore.getState();
            const allMessages = currentMessageStore.getMessages(sessionId);
            const currentMessage = allMessages.find(
              (m) => m.id === agentMessageId,
            );

            if (currentMessage && chunk.content) {
              currentMessageStore.appendToMessage(
                sessionId,
                agentMessageId,
                chunk.content,
              );
            } else if (!currentMessage && chunk.content) {
              // Message was already created at stream start, just append
              currentMessageStore.appendToMessage(
                sessionId,
                agentMessageId,
                chunk.content,
              );
            }
          },
          onComplete: (response) => {
            // Validate session is still active before final state update
            const sessionStillActive = isSessionStillActive(sessionId);

            // Get fresh references to stores
            const currentMessageStore = useMessageStore.getState();
            const allMessages = currentMessageStore.getMessages(sessionId);
            const currentMessage = allMessages.find(
              (m) => m.id === agentMessageId,
            );

            let attachments: MessageAttachment[] | undefined;
            if (response.attachments && Array.isArray(response.attachments)) {
              attachments = response.attachments.map((att: BackendAttachment) =>
                transformBackendAttachment(att),
              );
            }

            // Always update message (even for inactive session - it's historical data)
            // but only update UI state if session is still active
            if (currentMessage) {
              currentMessageStore.updateMessage(sessionId, agentMessageId, {
                content: response.content,
                actions: response.actions,
                attachments: attachments,
                metadata: response.metadata,
              });
            }

            // Get fresh UI store reference
            const currentUIStore = useUIStore.getState();
            const currentRunEventsStore = useRunEventsStore.getState();
            const currentErrorStore = useRunErrorStore.getState();

            currentRunEventsStore.endRun(agentMessageId);
            connectionsRef.current.delete(connectionKey);
            currentUIStore.setStreaming(sessionId, null);
            currentUIStore.setTyping(sessionId, false);

            // Remove from incomplete sessions - run completed successfully
            currentErrorStore.removeIncompleteSession(sessionId);
            // Clear any previous errors for this session
            currentErrorStore.clearError(sessionId);

            // Show desktop notification when run completes (only if tab is hidden)
            showRunCompleteNotification(
              sessionId,
              'Your agent run has finished processing.',
              () => {
                // Navigate to the session when notification is clicked
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('session_id', sessionId);
                window.location.href = currentUrl.toString();
              },
            );

            // Only invalidate queries if session is still active
            if (sessionStillActive) {
              queryClient.invalidateQueries({
                queryKey: ['session', sessionId],
              });

              if (workspaceId || projectId || userId || runnerId) {
                queryClient.invalidateQueries({
                  queryKey: [
                    'agno-sessions',
                    workspaceId,
                    projectId,
                    userId,
                    runnerId,
                  ],
                });
              }

              if (runnerId || runnerType || userId) {
                queryClient.invalidateQueries({
                  queryKey: ['stage-sessions', runnerId, runnerType, userId],
                });
              }
            }
          },
          onError: (error) => {
            console.error('Streaming error:', error);
            // Get fresh store references
            const currentUIStore = useUIStore.getState();
            const currentRunEventsStore = useRunEventsStore.getState();
            const currentErrorStore = useRunErrorStore.getState();

            currentRunEventsStore.endRun(agentMessageId);
            connectionsRef.current.delete(connectionKey);
            currentUIStore.setStreaming(sessionId, null);
            currentUIStore.setTyping(sessionId, false);

            // Track error for potential retry
            const streamError = error instanceof StreamError ? error : null;
            const { category, isRetriable } = classifyError(
              error.message,
              streamError?.statusCode
            );

            // Update incomplete session state to 'error'
            currentErrorStore.updateIncompleteSession(sessionId, {
              lastState: 'error',
              lastEventAt: Date.now(),
            });

            // Add error to store (retry is handled by RetryManager in StreamService)
            currentErrorStore.addError({
              sessionId,
              agentMessageId,
              originalMessage: message,
              category,
              message: error.message,
              statusCode: streamError?.statusCode,
              retryCount: streamError?.retryCount || 0,
              maxRetries: 3,
              isRetriable,
              runnerId,
              runnerType,
              stageId,
            });
          },
          onEvent: (event) => {
            // Update last activity time when we receive events
            const connection = connectionsRef.current.get(connectionKey);
            if (connection) {
              connection.lastActivityTime = Date.now();
            }

            // Update incomplete session with event info
            const errorStore = useRunErrorStore.getState();
            errorStore.updateIncompleteSession(sessionId, {
              lastEventType: event.event,
              lastEventAt: Date.now(),
              runId: event.run_id,
            });

            // Always process events - they accumulate in runEventsStore
            // even when user navigates away from this session
            // When user returns, RunStatusTimeline will show the accumulated events

            const eventType = event.event;

            let timestamp = Date.now();
            if (event.created_at) {
              timestamp =
                event.created_at < 10000000000
                  ? event.created_at * 1000
                  : event.created_at;
            }

            runEventsStore.addEvent(agentMessageId, {
              type: eventType,
              timestamp,
              data: event,
            });
          },
        },
      );
    } catch (error) {
      runEventsStore.endRun(agentMessageId);
      connectionsRef.current.delete(connectionKey);
      uiStore.setStreaming(sessionId, null);
      uiStore.setTyping(sessionId, false);
      throw error;
    }
  };

  const abortStream = (sessionId: string, tabId: string) => {
    const connectionKey = `${sessionId}_${tabId}`;
    const connection = connectionsRef.current.get(connectionKey);

    if (connection) {
      connection.abortController.abort();
      connectionsRef.current.delete(connectionKey);

      const uiStore = useUIStore.getState();
      uiStore.setStreaming(sessionId, null);
      uiStore.setTyping(sessionId, false);
    }
  };

  const forceCleanupStuckStreaming = () => {
    const uiStore = useUIStore.getState();
    const runEventsStore = useRunEventsStore.getState();
    const now = Date.now();

    // Only cleanup streams that have been running longer than the timeout
    // This allows active streams to continue running in background
    connectionsRef.current.forEach((connection, key) => {
      const elapsed = now - connection.startTime;

      if (elapsed > STREAMING_TIMEOUT_MS) {
        console.warn(
          `[SSE] Cleaning up stuck streaming for session ${connection.sessionId} (elapsed: ${Math.round(elapsed / 1000)}s)`,
        );
        connection.abortController.abort();
        uiStore.setStreaming(connection.sessionId, null);
        uiStore.setTyping(connection.sessionId, false);
        runEventsStore.endRun(connection.agentMessageId);
        connectionsRef.current.delete(key);
      }
    });

    // Only cleanup UI states that don't have active connections and are stuck
    const streamingStates = uiStore.streamingBySession;
    Object.keys(streamingStates).forEach((sessionId) => {
      const hasActiveConnection = Array.from(
        connectionsRef.current.values(),
      ).some((conn) => conn.sessionId === sessionId);

      // Only clear if no active connection (orphaned state)
      if (streamingStates[sessionId] !== null && !hasActiveConnection) {
        uiStore.setStreaming(sessionId, null);
        uiStore.setTyping(sessionId, false);
      }
    });
  };

  useEffect(() => {
    const connections = connectionsRef.current;
    return () => {
      connections.forEach((connection) => {
        connection.abortController.abort();
      });
      connections.clear();
    };
  }, []);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const uiStore = useUIStore.getState();
      const runEventsStore = useRunEventsStore.getState();

      connectionsRef.current.forEach((connection, key) => {
        const elapsed = now - connection.startTime;

        if (elapsed > STREAMING_TIMEOUT_MS) {
          console.warn(
            `[SSE] Cleaning up stuck streaming for session ${connection.sessionId} (elapsed: ${Math.round(elapsed / 1000)}s)`,
          );

          connection.abortController.abort();
          connectionsRef.current.delete(key);
          uiStore.setStreaming(connection.sessionId, null);
          uiStore.setTyping(connection.sessionId, false);
          runEventsStore.endRun(connection.agentMessageId);
        }
      });
    }, 30000); // Check every 30 seconds

    return () => clearInterval(checkInterval);
  }, []);

  // Cleanup orphaned streaming states on mount
  useEffect(() => {
    const uiStore = useUIStore.getState();
    const streamingStates = uiStore.streamingBySession;

    // Check for streaming states that have no active connection
    Object.keys(streamingStates).forEach((sessionId) => {
      const state = streamingStates[sessionId];
      if (state !== null) {
        // Check if there's an active connection for this session
        const hasActiveConnection = Array.from(
          connectionsRef.current.values(),
        ).some((conn) => conn.sessionId === sessionId);

        if (!hasActiveConnection) {
          console.warn(
            `[SSE] Cleaning up orphaned streaming state for session ${sessionId}`,
          );
          uiStore.setStreaming(sessionId, null);
          uiStore.setTyping(sessionId, false);
        }
      }
    });
  }, []);

  // Handle page visibility changes to detect and recover from broken connections
  // When tab becomes visible again after being hidden, check if streams are still alive
  usePageVisibility(
    // When tab becomes visible again
    () => {
      const now = Date.now();
      const INACTIVITY_THRESHOLD = 60000; // 60 seconds - if no activity for this long, consider it stuck

      connectionsRef.current.forEach((connection) => {
        const timeSinceLastActivity = now - connection.lastActivityTime;
        const totalElapsed = now - connection.startTime;

        // Only check streams that have been running for a while and show no recent activity
        // This helps detect streams that were broken when the tab was hidden
        if (
          totalElapsed > 10000 &&
          timeSinceLastActivity > INACTIVITY_THRESHOLD
        ) {
          console.warn(
            `[SSEConnection] Tab visible again - detected potentially stuck stream for session ${connection.sessionId} ` +
              `(no activity for ${Math.round(timeSinceLastActivity / 1000)}s, total elapsed: ${Math.round(totalElapsed / 1000)}s)`,
          );

          // Note: We don't automatically abort here because:
          // 1. The stream might still be processing on the backend
          // 2. fetchEventSource with openWhenHidden should handle reconnection
          // 3. The existing timeout mechanism will clean up truly stuck streams
          // This is just for logging and monitoring purposes
        } else if (totalElapsed > 10000) {
          console.debug(
            `[SSEConnection] Tab visible again - stream for session ${connection.sessionId} appears healthy ` +
              `(last activity ${Math.round(timeSinceLastActivity / 1000)}s ago)`,
          );
        }
      });
    },
    // When tab becomes hidden
    () => {
      console.debug(
        `[SSEConnection] Tab hidden - ${connectionsRef.current.size} active stream(s) will continue in background`,
      );
    },
  );

  // Error handling methods
  const getErrorForSession = useCallback((sessionId: string) => {
    return useRunErrorStore.getState().getActiveError(sessionId);
  }, []);

  const hasErrorForSession = useCallback((sessionId: string) => {
    return useRunErrorStore.getState().getActiveError(sessionId) !== null;
  }, []);

  const clearErrorForSession = useCallback((sessionId: string) => {
    useRunErrorStore.getState().clearError(sessionId);
  }, []);

  const getIncompleteSessions = useCallback(() => {
    return useRunErrorStore.getState().getIncompleteSessions();
  }, []);

  // Retry a failed run
  const retryRun = useCallback(async (sessionId: string, agentMessageId: string) => {
    const errorStore = useRunErrorStore.getState();
    const activeError = errorStore.getActiveError(sessionId);
    const incompleteSession = errorStore.getIncompleteSession(sessionId);

    if (!activeError && !incompleteSession) {
      console.warn('[SSEConnection] No error or incomplete session found for retry:', sessionId);
      return;
    }

    // Get the original message and runner info
    const originalMessage = activeError?.originalMessage || incompleteSession?.originalMessage;
    const runnerId = activeError?.runnerId || incompleteSession?.runnerId;
    const runnerType = activeError?.runnerType || incompleteSession?.runnerType;
    const stageId = activeError?.stageId || incompleteSession?.stageId;

    if (!originalMessage) {
      console.error('[SSEConnection] Cannot retry - no original message found');
      return;
    }

    // Clear the current error
    errorStore.clearError(sessionId);

    // Mark as retrying
    if (activeError) {
      errorStore.markRetrying(sessionId, activeError.id);
    }

    console.log(`[SSEConnection] Manually retrying run for session ${sessionId}`);

    // Get a fresh tab ID from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabId = urlParams.get('tab_id') || `retry-${Date.now()}`;

    try {
      await startStream({
        sessionId,
        tabId,
        message: originalMessage,
        runnerId,
        runnerType,
        stageId,
        userId: user?.id,
        agentMessageId,
        files: [], // Files can't be recovered on retry
      });
    } catch (error) {
      console.error('[SSEConnection] Retry failed:', error);
    }
  }, [startStream, user?.id]);

  // Cancel pending retry
  const cancelRetry = useCallback((sessionId: string, agentMessageId: string) => {
    globalRetryManager.cancelRetry(sessionId, agentMessageId);
    useRunErrorStore.getState().clearError(sessionId);
  }, []);

  // Resume an incomplete session
  const resumeIncompleteSession = useCallback(async (sessionId: string) => {
    const errorStore = useRunErrorStore.getState();
    const incompleteSession = errorStore.getIncompleteSession(sessionId);

    if (!incompleteSession) {
      console.warn('[SSEConnection] No incomplete session found:', sessionId);
      return;
    }

    console.log(`[SSEConnection] Resuming incomplete session ${sessionId}`);

    // Use retryRun to handle the actual retry logic
    await retryRun(sessionId, incompleteSession.agentMessageId);
  }, [retryRun]);

  return (
    <SSEConnectionContext.Provider
      value={{
        startStream,
        abortStream,
        abortAllForSession,
        abortAllForStage,
        forceCleanupStuckStreaming,
        hasActiveStreamForSession,
        getActiveConnectionsCount,
        retryRun,
        cancelRetry,
        getErrorForSession,
        hasErrorForSession,
        clearErrorForSession,
        resumeIncompleteSession,
        getIncompleteSessions,
      }}
    >
      {children}
    </SSEConnectionContext.Provider>
  );
};

export const useSSEConnection = (): SSEConnectionContextValue => {
  const context = useContext(SSEConnectionContext);
  if (!context) {
    throw new Error(
      'useSSEConnection must be used within SSEConnectionProvider',
    );
  }
  return context;
};
