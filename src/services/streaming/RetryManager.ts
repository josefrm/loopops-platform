/**
 * Retry Manager
 * 
 * Handles retry logic with exponential backoff for stream operations.
 * Integrates with runErrorStore for error tracking.
 */

import { useRunErrorStore, classifyError, RunErrorCategory } from '@/features/chat/stores/runErrorStore';
import { RetryConfig, DEFAULT_RETRY_CONFIG, StreamError, StreamErrorCategory } from './types';

/**
 * Retry state for a stream operation
 */
export interface RetryState {
  sessionId: string;
  agentMessageId: string;
  originalMessage: string;
  runnerId?: string;
  runnerType?: 'team' | 'agent';
  stageId?: string;
  retryCount: number;
  maxRetries: number;
  lastError?: StreamError;
  nextRetryAt?: number;
  isRetrying: boolean;
}

/**
 * Callback for retry events
 */
export interface RetryCallbacks {
  /** Called before a retry attempt */
  onRetryStart?: (state: RetryState) => void;
  /** Called after a successful retry */
  onRetrySuccess?: (state: RetryState) => void;
  /** Called when max retries exceeded */
  onMaxRetriesExceeded?: (state: RetryState) => void;
  /** Called on each retry delay tick (for UI feedback) */
  onRetryDelayTick?: (remainingMs: number, state: RetryState) => void;
}

/**
 * RetryManager class for handling retry operations
 */
export class RetryManager {
  private retryStates: Map<string, RetryState> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Get the key for a retry state
   */
  private getKey(sessionId: string, agentMessageId: string): string {
    return `${sessionId}_${agentMessageId}`;
  }

  /**
   * Initialize retry state for a stream operation
   */
  initRetryState(params: {
    sessionId: string;
    agentMessageId: string;
    originalMessage: string;
    runnerId?: string;
    runnerType?: 'team' | 'agent';
    stageId?: string;
  }): RetryState {
    const key = this.getKey(params.sessionId, params.agentMessageId);
    const state: RetryState = {
      ...params,
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      isRetrying: false,
    };
    this.retryStates.set(key, state);
    return state;
  }

  /**
   * Get current retry state
   */
  getRetryState(sessionId: string, agentMessageId: string): RetryState | undefined {
    return this.retryStates.get(this.getKey(sessionId, agentMessageId));
  }

  /**
   * Check if should retry an error
   */
  shouldRetry(error: StreamError, sessionId: string, agentMessageId: string): boolean {
    const key = this.getKey(sessionId, agentMessageId);
    const state = this.retryStates.get(key);
    
    if (!state) {
      return false;
    }

    if (state.retryCount >= state.maxRetries) {
      return false;
    }

    // Check if error category is retriable
    const retriableCategories: StreamErrorCategory[] = [
      StreamErrorCategory.NETWORK,
      StreamErrorCategory.RATE_LIMIT,
      StreamErrorCategory.SERVER,
      StreamErrorCategory.TIMEOUT,
    ];

    if (this.config.shouldRetry) {
      return this.config.shouldRetry(error);
    }

    return error.isRetriable || retriableCategories.includes(error.category);
  }

  /**
   * Calculate retry delay using exponential backoff
   */
  calculateDelay(retryCount: number, error?: StreamError): number {
    const { baseDelayMs, maxDelayMs } = this.config;

    // Special case for rate limiting - use longer initial delay
    if (error?.category === StreamErrorCategory.RATE_LIMIT) {
      const rateDelayBase = baseDelayMs * 4; // 4x base delay for rate limits
      const exponentialDelay = rateDelayBase * Math.pow(2, retryCount);
      return Math.min(exponentialDelay, maxDelayMs);
    }

    // Standard exponential backoff with jitter
    const exponentialDelay = baseDelayMs * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
    return Math.min(exponentialDelay + jitter, maxDelayMs);
  }

  /**
   * Schedule a retry operation
   */
  scheduleRetry(
    sessionId: string,
    agentMessageId: string,
    error: StreamError,
    retryFn: () => Promise<void>,
    callbacks?: RetryCallbacks
  ): boolean {
    const key = this.getKey(sessionId, agentMessageId);
    const state = this.retryStates.get(key);

    if (!state) {
      console.warn('[RetryManager] No retry state found for', key);
      return false;
    }

    if (!this.shouldRetry(error, sessionId, agentMessageId)) {
      callbacks?.onMaxRetriesExceeded?.(state);
      this.trackErrorInStore(state, error, false);
      return false;
    }

    // Clear any existing timeout
    const existingTimeout = this.retryTimeouts.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Calculate delay and update state
    const delay = this.calculateDelay(state.retryCount, error);
    const nextRetryAt = Date.now() + delay;

    state.retryCount += 1;
    state.lastError = error;
    state.nextRetryAt = nextRetryAt;
    state.isRetrying = true;
    this.retryStates.set(key, state);

    // Track in error store
    this.trackErrorInStore(state, error, true);

    console.log(
      `[RetryManager] Scheduling retry ${state.retryCount}/${state.maxRetries} for session ${sessionId} in ${Math.round(delay / 1000)}s`
    );

    // Schedule the retry
    const timeout = setTimeout(async () => {
      this.retryTimeouts.delete(key);
      
      callbacks?.onRetryStart?.(state);
      
      try {
        await retryFn();
        state.isRetrying = false;
        callbacks?.onRetrySuccess?.(state);
        this.clearRetryState(sessionId, agentMessageId);
      } catch (retryError) {
        state.isRetrying = false;
        // The error handler will schedule the next retry if needed
        console.error('[RetryManager] Retry failed:', retryError);
      }
    }, delay);

    this.retryTimeouts.set(key, timeout);

    // Optional: Notify countdown
    if (callbacks?.onRetryDelayTick) {
      this.startCountdown(key, delay, callbacks.onRetryDelayTick, state);
    }

    return true;
  }

  /**
   * Start a countdown for UI feedback
   */
  private startCountdown(
    key: string,
    totalDelay: number,
    onTick: (remainingMs: number, state: RetryState) => void,
    state: RetryState
  ): void {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = totalDelay - elapsed;

      if (remaining <= 0 || !this.retryStates.has(key)) {
        clearInterval(interval);
        return;
      }

      onTick(remaining, state);
    }, 1000);
  }

  /**
   * Track error in the runErrorStore
   */
  private trackErrorInStore(state: RetryState, error: StreamError, isRetrying: boolean): void {
    const { category, isRetriable } = classifyError(error.message, error.statusCode);
    const errorStore = useRunErrorStore.getState();

    errorStore.addError({
      sessionId: state.sessionId,
      agentMessageId: state.agentMessageId,
      originalMessage: state.originalMessage,
      category: category as unknown as RunErrorCategory,
      message: error.message,
      statusCode: error.statusCode,
      retryCount: state.retryCount,
      maxRetries: state.maxRetries,
      isRetriable: isRetriable && state.retryCount < state.maxRetries,
      runnerId: state.runnerId,
      runnerType: state.runnerType,
      stageId: state.stageId,
      isRetrying,
      nextRetryAt: state.nextRetryAt,
    });
  }

  /**
   * Cancel pending retry
   */
  cancelRetry(sessionId: string, agentMessageId: string): void {
    const key = this.getKey(sessionId, agentMessageId);
    
    const timeout = this.retryTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(key);
    }

    const state = this.retryStates.get(key);
    if (state) {
      state.isRetrying = false;
      this.retryStates.set(key, state);
    }
  }

  /**
   * Clear retry state
   */
  clearRetryState(sessionId: string, agentMessageId: string): void {
    const key = this.getKey(sessionId, agentMessageId);
    this.cancelRetry(sessionId, agentMessageId);
    this.retryStates.delete(key);
  }

  /**
   * Cancel all pending retries for a session
   */
  cancelAllForSession(sessionId: string): void {
    for (const [key, _state] of this.retryStates.entries()) {
      if (key.startsWith(sessionId)) {
        const timeout = this.retryTimeouts.get(key);
        if (timeout) {
          clearTimeout(timeout);
          this.retryTimeouts.delete(key);
        }
        this.retryStates.delete(key);
      }
    }
  }

  /**
   * Get all active retry states
   */
  getActiveRetries(): RetryState[] {
    return Array.from(this.retryStates.values()).filter((s) => s.isRetrying);
  }

  /**
   * Clear all retry states
   */
  clearAll(): void {
    for (const timeout of this.retryTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.retryTimeouts.clear();
    this.retryStates.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Global retry manager instance
export const globalRetryManager = new RetryManager();
