import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Error categories for classification and retry logic
 */
export enum RunErrorCategory {
  /** Network errors - usually retriable */
  NETWORK = 'network',
  /** Authentication errors - need re-login */
  AUTH = 'auth',
  /** Rate limiting - retriable with backoff */
  RATE_LIMIT = 'rate_limit',
  /** Server errors (5xx) - retriable */
  SERVER = 'server',
  /** Client errors (4xx except 429) - usually not retriable */
  CLIENT = 'client',
  /** Timeout errors - retriable */
  TIMEOUT = 'timeout',
  /** Stream was cancelled by user */
  CANCELLED = 'cancelled',
  /** Unknown error type */
  UNKNOWN = 'unknown',
}

/**
 * Determines if an error category is retriable
 */
export function isRetriableCategory(category: RunErrorCategory): boolean {
  return [
    RunErrorCategory.NETWORK,
    RunErrorCategory.RATE_LIMIT,
    RunErrorCategory.SERVER,
    RunErrorCategory.TIMEOUT,
  ].includes(category);
}

/**
 * Run error metadata
 */
export interface RunError {
  /** Unique error ID */
  id: string;
  /** Session this error belongs to */
  sessionId: string;
  /** Agent message ID that was being processed */
  agentMessageId: string;
  /** The original message that was sent */
  originalMessage: string;
  /** Error category for classification */
  category: RunErrorCategory;
  /** Error message */
  message: string;
  /** HTTP status code if applicable */
  statusCode?: number;
  /** Timestamp when error occurred */
  timestamp: number;
  /** Number of retry attempts made */
  retryCount: number;
  /** Max retries allowed */
  maxRetries: number;
  /** Whether this error is retriable */
  isRetriable: boolean;
  /** Runner ID (agent or team ID) */
  runnerId?: string;
  /** Runner type */
  runnerType?: 'team' | 'agent';
  /** Stage ID */
  stageId?: string;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Next retry timestamp (for exponential backoff) */
  nextRetryAt?: number;
  /** Run ID from backend if available */
  runId?: string;
}

/**
 * Incomplete session metadata for recovery
 */
export interface IncompleteSession {
  sessionId: string;
  agentMessageId: string;
  originalMessage: string;
  runnerId?: string;
  runnerType?: 'team' | 'agent';
  stageId?: string;
  runId?: string;
  /** When the stream was started */
  startedAt: number;
  /** Last known state */
  lastState: 'streaming' | 'error' | 'cancelled';
  /** Last event received */
  lastEventType?: string;
  /** When the last event was received */
  lastEventAt?: number;
}

interface RunErrorState {
  /** Errors indexed by sessionId */
  errorsBySession: Record<string, RunError[]>;
  /** Active/latest error per session */
  activeErrorBySession: Record<string, RunError | null>;
  /** Incomplete sessions that can be recovered */
  incompleteSessions: Record<string, IncompleteSession>;
  /** Global retry settings */
  retrySettings: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
}

interface RunErrorActions {
  /** Add a new error for a session */
  addError: (error: Omit<RunError, 'id' | 'timestamp'>) => RunError;
  
  /** Clear error for a session */
  clearError: (sessionId: string) => void;
  
  /** Clear all errors */
  clearAllErrors: () => void;
  
  /** Get active error for session */
  getActiveError: (sessionId: string) => RunError | null;
  
  /** Get all errors for session */
  getErrorsForSession: (sessionId: string) => RunError[];
  
  /** Mark error as retrying */
  markRetrying: (sessionId: string, errorId: string) => void;
  
  /** Update retry count and next retry time */
  updateRetryAttempt: (sessionId: string, errorId: string, nextRetryAt?: number) => void;
  
  /** Mark error as resolved (retry succeeded) */
  markResolved: (sessionId: string, errorId: string) => void;
  
  /** Track an incomplete session for potential recovery */
  trackIncompleteSession: (session: Omit<IncompleteSession, 'startedAt'>) => void;
  
  /** Update incomplete session state */
  updateIncompleteSession: (sessionId: string, updates: Partial<IncompleteSession>) => void;
  
  /** Remove incomplete session (recovered or abandoned) */
  removeIncompleteSession: (sessionId: string) => void;
  
  /** Get all incomplete sessions */
  getIncompleteSessions: () => IncompleteSession[];
  
  /** Get incomplete session by ID */
  getIncompleteSession: (sessionId: string) => IncompleteSession | undefined;
  
  /** Check if session has incomplete run */
  hasIncompleteRun: (sessionId: string) => boolean;
  
  /** Update retry settings */
  updateRetrySettings: (settings: Partial<RunErrorState['retrySettings']>) => void;
  
  /** Calculate next retry delay using exponential backoff */
  calculateRetryDelay: (retryCount: number) => number;
}

type RunErrorStore = RunErrorState & RunErrorActions;

/**
 * Classifies an error into a category based on message and status code
 */
export function classifyError(
  message: string,
  statusCode?: number,
): { category: RunErrorCategory; isRetriable: boolean } {
  // Check for cancelled/aborted
  if (message.toLowerCase().includes('aborted') || message.toLowerCase().includes('cancelled')) {
    return { category: RunErrorCategory.CANCELLED, isRetriable: false };
  }
  
  // Check by status code
  if (statusCode) {
    if (statusCode === 401 || statusCode === 403) {
      return { category: RunErrorCategory.AUTH, isRetriable: false };
    }
    if (statusCode === 429) {
      return { category: RunErrorCategory.RATE_LIMIT, isRetriable: true };
    }
    if (statusCode >= 500) {
      return { category: RunErrorCategory.SERVER, isRetriable: true };
    }
    if (statusCode >= 400 && statusCode < 500) {
      return { category: RunErrorCategory.CLIENT, isRetriable: false };
    }
  }
  
  // Check by message content
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return { category: RunErrorCategory.TIMEOUT, isRetriable: true };
  }
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('connection')
  ) {
    return { category: RunErrorCategory.NETWORK, isRetriable: true };
  }
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('authentication')) {
    return { category: RunErrorCategory.AUTH, isRetriable: false };
  }
  
  return { category: RunErrorCategory.UNKNOWN, isRetriable: false };
}

export const useRunErrorStore = create<RunErrorStore>()(
  persist(
    (set, get) => ({
      // Initial state
      errorsBySession: {},
      activeErrorBySession: {},
      incompleteSessions: {},
      retrySettings: {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 30000,
      },

      // Add error
      addError: (errorData) => {
        const id = `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const error: RunError = {
          ...errorData,
          id,
          timestamp: Date.now(),
        };

        set((state) => {
          const sessionErrors = state.errorsBySession[errorData.sessionId] || [];
          return {
            errorsBySession: {
              ...state.errorsBySession,
              [errorData.sessionId]: [...sessionErrors, error],
            },
            activeErrorBySession: {
              ...state.activeErrorBySession,
              [errorData.sessionId]: error,
            },
          };
        });

        return error;
      },

      // Clear error
      clearError: (sessionId) =>
        set((state) => ({
          activeErrorBySession: {
            ...state.activeErrorBySession,
            [sessionId]: null,
          },
        })),

      // Clear all errors
      clearAllErrors: () =>
        set({
          errorsBySession: {},
          activeErrorBySession: {},
        }),

      // Get active error
      getActiveError: (sessionId) => {
        return get().activeErrorBySession[sessionId] || null;
      },

      // Get errors for session
      getErrorsForSession: (sessionId) => {
        return get().errorsBySession[sessionId] || [];
      },

      // Mark retrying
      markRetrying: (sessionId, errorId) =>
        set((state) => {
          const sessionErrors = state.errorsBySession[sessionId] || [];
          const updatedErrors = sessionErrors.map((e) =>
            e.id === errorId ? { ...e, isRetrying: true } : e
          );
          const activeError = state.activeErrorBySession[sessionId];
          
          return {
            errorsBySession: {
              ...state.errorsBySession,
              [sessionId]: updatedErrors,
            },
            activeErrorBySession: {
              ...state.activeErrorBySession,
              [sessionId]:
                activeError?.id === errorId
                  ? { ...activeError, isRetrying: true }
                  : activeError,
            },
          };
        }),

      // Update retry attempt
      updateRetryAttempt: (sessionId, errorId, nextRetryAt) =>
        set((state) => {
          const sessionErrors = state.errorsBySession[sessionId] || [];
          const updatedErrors = sessionErrors.map((e) =>
            e.id === errorId
              ? {
                  ...e,
                  retryCount: e.retryCount + 1,
                  nextRetryAt,
                  isRetrying: false,
                }
              : e
          );
          const activeError = state.activeErrorBySession[sessionId];
          
          return {
            errorsBySession: {
              ...state.errorsBySession,
              [sessionId]: updatedErrors,
            },
            activeErrorBySession: {
              ...state.activeErrorBySession,
              [sessionId]:
                activeError?.id === errorId
                  ? {
                      ...activeError,
                      retryCount: activeError.retryCount + 1,
                      nextRetryAt,
                      isRetrying: false,
                    }
                  : activeError,
            },
          };
        }),

      // Mark resolved
      markResolved: (sessionId, errorId) =>
        set((state) => {
          const sessionErrors = state.errorsBySession[sessionId] || [];
          const updatedErrors = sessionErrors.filter((e) => e.id !== errorId);
          const activeError = state.activeErrorBySession[sessionId];
          
          return {
            errorsBySession: {
              ...state.errorsBySession,
              [sessionId]: updatedErrors,
            },
            activeErrorBySession: {
              ...state.activeErrorBySession,
              [sessionId]: activeError?.id === errorId ? null : activeError,
            },
          };
        }),

      // Track incomplete session
      trackIncompleteSession: (session) =>
        set((state) => ({
          incompleteSessions: {
            ...state.incompleteSessions,
            [session.sessionId]: {
              ...session,
              startedAt: Date.now(),
            },
          },
        })),

      // Update incomplete session
      updateIncompleteSession: (sessionId, updates) =>
        set((state) => {
          const existing = state.incompleteSessions[sessionId];
          if (!existing) return state;
          
          return {
            incompleteSessions: {
              ...state.incompleteSessions,
              [sessionId]: { ...existing, ...updates },
            },
          };
        }),

      // Remove incomplete session
      removeIncompleteSession: (sessionId) =>
        set((state) => {
          const { [sessionId]: removed, ...rest } = state.incompleteSessions;
          return { incompleteSessions: rest };
        }),

      // Get all incomplete sessions
      getIncompleteSessions: () => {
        return Object.values(get().incompleteSessions);
      },

      // Get incomplete session
      getIncompleteSession: (sessionId) => {
        return get().incompleteSessions[sessionId];
      },

      // Has incomplete run
      hasIncompleteRun: (sessionId) => {
        return !!get().incompleteSessions[sessionId];
      },

      // Update retry settings
      updateRetrySettings: (settings) =>
        set((state) => ({
          retrySettings: { ...state.retrySettings, ...settings },
        })),

      // Calculate retry delay with exponential backoff
      calculateRetryDelay: (retryCount) => {
        const { baseDelayMs, maxDelayMs } = get().retrySettings;
        // Exponential backoff: baseDelay * 2^retryCount with jitter
        const exponentialDelay = baseDelayMs * Math.pow(2, retryCount);
        const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
        return Math.min(exponentialDelay + jitter, maxDelayMs);
      },
    }),
    {
      name: 'run-error-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Only persist incomplete sessions and retry settings
        incompleteSessions: state.incompleteSessions,
        retrySettings: state.retrySettings,
      }),
    }
  )
);
