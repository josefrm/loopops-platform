/**
 * Stream Service
 *
 * Handles Server-Sent Events (SSE) streaming from Agno backend.
 * Implements Strategy Pattern for event handling.
 * Uses @microsoft/fetch-event-source for robust SSE handling with automatic reconnection.
 * Includes retry logic with exponential backoff for error recovery.
 *
 * @example
 * ```typescript
 * await streamBackendApi(
 *   {
 *     sessionId: 'session-123',
 *     message: 'Hello',
 *     endpoint: '/teams/team-1/runs',
 *     filters: { workspace_id: 'ws-1' },
 *     files: [file1, file2],
 *   },
 *   {
 *     onChunk: (chunk) => console.log('Chunk:', chunk.content),
 *     onComplete: (response) => console.log('Done:', response),
 *     onError: (error) => console.error('Error:', error),
 *     onEvent: (event) => console.log('Event:', event.event),
 *   }
 * );
 * ```
 */

import { getBackendApiUrl } from '@/config/api';
import { supabase } from '@/integrations/supabase/client';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import {
  EventHandlerRegistry,
  StreamAccumulator,
  StreamContext,
} from './handlers';
import {
  StreamCallbacks,
  StreamError,
  StreamErrorCategory,
  StreamEvent,
  StreamOptions,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
} from './types';
import { globalRetryManager } from './RetryManager';

/**
 * Custom error classes for fetch-event-source
 */
class RetriableError extends Error {}
class FatalError extends Error {}

/**
 * Main streaming function with built-in retry support
 *
 * Establishes an SSE connection to the backend and processes events
 * using registered handlers via the Strategy Pattern.
 *
 * @param options - Stream configuration options
 * @param callbacks - Event callbacks for handling stream events
 * @param retryConfig - Optional retry configuration
 * @throws {StreamError} When authentication fails or stream errors occur
 */
export async function streamBackendApi(
  options: StreamOptions,
  callbacks: StreamCallbacks = {},
  retryConfig?: Partial<RetryConfig>,
): Promise<void> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

  // Initialize retry state if agent message ID is provided
  if (options.agentMessageId) {
    globalRetryManager.initRetryState({
      sessionId: options.sessionId,
      agentMessageId: options.agentMessageId,
      originalMessage: options.message,
      runnerId: options.runnerId,
      runnerType: options.runnerType,
      stageId: options.stageId,
    });
  }

  try {
    await executeStream(options, callbacks);
    
    // Clear retry state on success
    if (options.agentMessageId) {
      globalRetryManager.clearRetryState(options.sessionId, options.agentMessageId);
    }
  } catch (error) {
    const streamError = error instanceof StreamError 
      ? error 
      : new StreamError(
          error instanceof Error ? error.message : 'Unknown error',
          undefined,
          false
        );

    streamError.sessionId = options.sessionId;

    // Check if we should retry
    if (
      options.agentMessageId &&
      globalRetryManager.shouldRetry(streamError, options.sessionId, options.agentMessageId)
    ) {
      const scheduled = globalRetryManager.scheduleRetry(
        options.sessionId,
        options.agentMessageId,
        streamError,
        async () => {
          // Create new options without the previous abort signal (it may be aborted)
          const retryOptions = {
            ...options,
            abortSignal: undefined, // Will be provided by SSEConnectionContext if needed
          };
          await executeStream(retryOptions, callbacks);
        },
        {
          onRetryStart: (state) => {
            console.log(`[StreamService] Retry ${state.retryCount}/${state.maxRetries} starting for session ${state.sessionId}`);
          },
          onRetrySuccess: (state) => {
            console.log(`[StreamService] Retry successful for session ${state.sessionId}`);
          },
          onMaxRetriesExceeded: (state) => {
            console.error(`[StreamService] Max retries (${state.maxRetries}) exceeded for session ${state.sessionId}`);
            callbacks.onError?.(streamError);
          },
        }
      );

      if (scheduled) {
        // Don't throw - retry is scheduled
        console.log(`[StreamService] Retry scheduled for session ${options.sessionId}`);
        return;
      }
    }

    // No retry - propagate error
    callbacks.onError?.(streamError);
    throw streamError;
  }
}

/**
 * Execute the stream without retry logic (used internally and for retries)
 */
async function executeStream(
  options: StreamOptions,
  callbacks: StreamCallbacks = {},
): Promise<void> {
  const {
    sessionId,
    message,
    runnerId,
    runnerType,
    filters = {},
    files = [],
    fileKeys = [],
    bucketName,
    abortSignal,
  } = options;

  // Validate runner parameters
  if (!runnerId || !runnerType) {
    const error = new StreamError(
      'Both runnerId and runnerType must be provided',
      400,
      false,
    );
    callbacks.onError?.(error);
    throw error;
  }

  // Determine endpoint based on runnerType
  const endpoint =
    runnerType === 'team'
      ? `/api/v1/teams/${runnerId}/runs`
      : `/api/v1/agents/${runnerId}/runs`;

  const BACKEND_API_URL = getBackendApiUrl();
  const url = `${BACKEND_API_URL}${endpoint}`;

  // Authenticate
  const session = await authenticateSession();
  if (!session) {
    const error = new StreamError('No active session', 401, false);
    callbacks.onError?.(error);
    throw error;
  }

  // Prepare request
  const formData = buildFormData({
    sessionId,
    message,
    filters,
    files,
    fileKeys,
    bucketName,
    userId: options.userId,
  });

  // Initialize event processing
  const registry = new EventHandlerRegistry();
  const accumulator = new StreamAccumulator();

  // Set runner type so handlers can filter nested events appropriately
  if (runnerType) {
    accumulator.setRunnerType(runnerType);
  }

  const context: StreamContext = {
    sessionId,
    callbacks,
    accumulator,
    runnerType, // Pass runner type to context for handler filtering
  };

  try {
    await fetchEventSource(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
      signal: abortSignal,
      // Keep connection open when tab is hidden (prevents Chrome from pausing the stream)
      openWhenHidden: true,

      async onopen(response) {
        if (response.ok) {
          return; // Connection successful
        }

        // Handle HTTP errors
        if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          const errorText = await response.text();
          throw new FatalError(`HTTP ${response.status}: ${errorText}`);
        } else {
          // Retriable errors (5xx, 429)
          throw new RetriableError(`HTTP ${response.status}`);
        }
      },

      onmessage(event) {
        // Handle [DONE] signal
        if (event.data === '[DONE]') {
          // Only call onComplete if not already completed (prevents duplicate calls)
          if (!accumulator.isCompleted()) {
            accumulator.markCompleted();
            callbacks.onComplete?.(accumulator.getResponse());
          }
          return;
        }

        try {
          const streamEvent = JSON.parse(event.data) as StreamEvent;
          registry.handle(streamEvent, context);
        } catch (parseError) {
          console.error('Error parsing stream event:', parseError);
          // Ignore parse errors for individual events
        }
      },

      onerror(error) {
        // Let fetch-event-source handle retries for retriable errors
        if (error instanceof RetriableError) {
          throw error; // Will trigger retry
        }

        // Fatal errors stop the connection
        throw error;
      },

      onclose() {
        // Stream closed normally
        // Only call onComplete if not already completed (prevents duplicate calls)
        if (!accumulator.isCompleted()) {
          accumulator.markCompleted();
          callbacks.onComplete?.(accumulator.getResponse());
        }
      },
    });
  } catch (error) {
    handleStreamError(error, callbacks, options);
  }
}

/**
 * Authenticates the current user session
 */
async function authenticateSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Builds FormData for the stream request
 */
function buildFormData(params: {
  sessionId: string;
  message: string;
  filters: Record<string, any>;
  files: File[];
  fileKeys?: string[];
  bucketName?: string;
  userId: string;
}): FormData {
  const { sessionId, message, filters, files, fileKeys, bucketName, userId } =
    params;

  const formData = new FormData();
  formData.append('message', message);
  formData.append('session_id', sessionId);
  formData.append('stream', 'true');
  formData.append('monitor', 'true');
  formData.append('user_id', userId);

  if (Object.keys(filters).length > 0) {
    formData.append('knowledge_filters', JSON.stringify(filters));
  }

  // Support both legacy file upload (direct attached files) and new bucket-based approach
  files.forEach((file) => {
    formData.append('files', file);
  });

  if (bucketName) {
    formData.append('bucket_name', bucketName);
  }

  if (fileKeys && fileKeys.length > 0) {
    formData.append('files_keys', JSON.stringify(fileKeys));
  }

  return formData;
}

/**
 * Handles stream errors
 */
function handleStreamError(
  error: unknown, 
  callbacks: StreamCallbacks,
  options?: StreamOptions
): never {
  let streamError: StreamError;

  if (error instanceof StreamError) {
    streamError = error;
  } else {
    const message = error instanceof Error ? error.message : 'Unknown streaming error';
    const statusCode = (error as any)?.statusCode;
    streamError = new StreamError(message, statusCode, false);
  }

  // Add context to error
  if (options?.sessionId) {
    streamError.sessionId = options.sessionId;
  }

  callbacks.onError?.(streamError);
  throw streamError;
}

/**
 * Creates a stream error with proper classification
 */
export function createStreamError(
  message: string,
  statusCode?: number,
  isRetriable?: boolean,
  category?: StreamErrorCategory
): StreamError {
  return new StreamError(message, statusCode, isRetriable, category);
}
