/**
 * Streaming Types
 * Based on Agno's TeamRunOutput and AgentRunOutput event system
 */

export enum EventType {
  // Core Events
  TEAM_RUN_STARTED = 'TeamRunStarted',
  TEAM_RUN_CONTENT = 'TeamRunContent',
  TEAM_RUN_CONTENT_COMPLETED = 'TeamRunContentCompleted',
  TEAM_RUN_INTERMEDIATE_CONTENT = 'TeamRunIntermediateContent',
  TEAM_RUN_COMPLETED = 'TeamRunCompleted',
  TEAM_RUN_ERROR = 'TeamRunError',
  TEAM_RUN_CANCELLED = 'TeamRunCancelled',

  // Agent Events
  AGENT_RUN_STARTED = 'AgentRunStarted',
  AGENT_RUN_CONTENT = 'AgentRunContent',
  AGENT_RUN_CONTENT_COMPLETED = 'AgentRunContentCompleted',
  AGENT_RUN_INTERMEDIATE_CONTENT = 'AgentRunIntermediateContent',
  AGENT_RUN_COMPLETED = 'AgentRunCompleted',
  AGENT_RUN_ERROR = 'AgentRunError',
  AGENT_RUN_CANCELLED = 'AgentRunCancelled',

  // Generic Events
  RUN_CONTENT = 'RunContent',
  RUN_COMPLETED = 'RunCompleted',
  RUN_ERROR = 'RunError',

  // Pre/Post Hook Events
  TEAM_PRE_HOOK_STARTED = 'TeamPreHookStarted',
  TEAM_PRE_HOOK_COMPLETED = 'TeamPreHookCompleted',
  TEAM_POST_HOOK_STARTED = 'TeamPostHookStarted',
  TEAM_POST_HOOK_COMPLETED = 'TeamPostHookCompleted',

  // Tool Events
  TEAM_TOOL_CALL_STARTED = 'TeamToolCallStarted',
  TEAM_TOOL_CALL_COMPLETED = 'TeamToolCallCompleted',

  // Reasoning Events
  TEAM_REASONING_STARTED = 'TeamReasoningStarted',
  TEAM_REASONING_STEP = 'TeamReasoningStep',
  TEAM_REASONING_COMPLETED = 'TeamReasoningCompleted',

  // Memory Events
  TEAM_MEMORY_UPDATE_STARTED = 'TeamMemoryUpdateStarted',
  TEAM_MEMORY_UPDATE_COMPLETED = 'TeamMemoryUpdateCompleted',

  // Session Summary Events
  TEAM_SESSION_SUMMARY_STARTED = 'TeamSessionSummaryStarted',
  TEAM_SESSION_SUMMARY_COMPLETED = 'TeamSessionSummaryCompleted',

  // Parser/Output Model Events
  TEAM_PARSER_MODEL_RESPONSE_STARTED = 'TeamParserModelResponseStarted',
  TEAM_PARSER_MODEL_RESPONSE_COMPLETED = 'TeamParserModelResponseCompleted',
  TEAM_OUTPUT_MODEL_RESPONSE_STARTED = 'TeamOutputModelResponseStarted',
  TEAM_OUTPUT_MODEL_RESPONSE_COMPLETED = 'TeamOutputModelResponseCompleted',
}

export interface BaseEvent {
  event: string;
  created_at: number;
  team_id?: string;
  team_name?: string;
  agent_id?: string;
  agent_name?: string;
  run_id?: string;
  session_id?: string;
  workflow_id?: string;
  workflow_run_id?: string;
  step_id?: string;
  step_name?: string;
  step_index?: number;
}

export interface RunStartedEvent extends BaseEvent {
  event: EventType.TEAM_RUN_STARTED | EventType.AGENT_RUN_STARTED;
  model: string;
  model_provider: string;
}

export interface RunContentEvent extends BaseEvent {
  event:
    | EventType.TEAM_RUN_CONTENT
    | EventType.AGENT_RUN_CONTENT
    | EventType.RUN_CONTENT;
  content: any;
  content_type?: string;
  reasoning_content?: string;
  citations?: any;
  model_provider_data?: any;
  response_audio?: any;
  image?: any;
  references?: any[];
  additional_input?: any[];
  reasoning_steps?: any[];
  reasoning_messages?: any[];
  actions?: any[];
}

export interface RunContentCompletedEvent extends BaseEvent {
  event:
    | EventType.TEAM_RUN_CONTENT_COMPLETED
    | EventType.AGENT_RUN_CONTENT_COMPLETED;
}

export interface IntermediateRunContentEvent extends BaseEvent {
  event:
    | EventType.TEAM_RUN_INTERMEDIATE_CONTENT
    | EventType.AGENT_RUN_INTERMEDIATE_CONTENT;
  content: any;
  content_type?: string;
}

export interface RunCompletedEvent extends BaseEvent {
  event:
    | EventType.TEAM_RUN_COMPLETED
    | EventType.AGENT_RUN_COMPLETED
    | EventType.RUN_COMPLETED;
  content?: any;
  content_type?: string;
  reasoning_content?: string;
  citations?: any;
  model_provider_data?: any;
  images?: any[];
  videos?: any[];
  audio?: any[];
  response_audio?: any;
  references?: any[];
  additional_input?: any[];
  reasoning_steps?: any[];
  reasoning_messages?: any[];
  member_responses?: any[];
  metadata?: Record<string, any>;
  metrics?: any;
  actions?: any[];
  attachments?: any[];
}

export interface RunErrorEvent extends BaseEvent {
  event:
    | EventType.TEAM_RUN_ERROR
    | EventType.AGENT_RUN_ERROR
    | EventType.RUN_ERROR;
  content?: string;
  error?: string;
}

export interface RunCancelledEvent extends BaseEvent {
  event: EventType.TEAM_RUN_CANCELLED | EventType.AGENT_RUN_CANCELLED;
  reason?: string;
}

export interface ToolCallStartedEvent extends BaseEvent {
  event: EventType.TEAM_TOOL_CALL_STARTED;
  tool?: any;
}

export interface ToolCallCompletedEvent extends BaseEvent {
  event: EventType.TEAM_TOOL_CALL_COMPLETED;
  tool?: any;
  content?: any;
  images?: any[];
  videos?: any[];
  audio?: any[];
}

export interface ReasoningStepEvent extends BaseEvent {
  event: EventType.TEAM_REASONING_STEP;
  content?: any;
  content_type?: string;
  reasoning_content?: string;
}

export interface SessionSummaryCompletedEvent extends BaseEvent {
  event: EventType.TEAM_SESSION_SUMMARY_COMPLETED;
  session_summary?: any;
}

export type StreamEvent =
  | RunStartedEvent
  | RunContentEvent
  | RunContentCompletedEvent
  | IntermediateRunContentEvent
  | RunCompletedEvent
  | RunErrorEvent
  | RunCancelledEvent
  | ToolCallStartedEvent
  | ToolCallCompletedEvent
  | ReasoningStepEvent
  | SessionSummaryCompletedEvent
  | BaseEvent;

export interface StreamChunk {
  content: string;
  chunk: string;
  type: 'streaming';
  actions?: any[];
}

export interface StreamResponse {
  content: any;
  actions?: any[];
  attachments?: any[];
  metadata?: Record<string, any>;
  metrics?: any;
}

export interface StreamCallbacks {
  onChunk?: (chunk: StreamChunk) => void;
  onComplete?: (response: StreamResponse) => void;
  onError?: (error: Error) => void;
  onEvent?: (event: StreamEvent) => void;
}

export interface StreamOptions {
  userId: string;
  sessionId: string;
  message: string;
  runnerId?: string;
  runnerType?: 'team' | 'agent';
  filters?: Record<string, any>;
  // File upload options
  files?: File[];
  fileKeys?: string[];
  bucketName?: string;
  abortSignal?: AbortSignal;
  /** Agent message ID for tracking */
  agentMessageId?: string;
  /** Stage ID for context */
  stageId?: string;
}

/**
 * Retry configuration for stream operations
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay in milliseconds for exponential backoff */
  baseDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Whether to retry on this specific error */
  shouldRetry?: (error: StreamError) => boolean;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

/**
 * Error category for classification
 */
export enum StreamErrorCategory {
  /** Network connectivity issues */
  NETWORK = 'network',
  /** Authentication/authorization failures */
  AUTH = 'auth',
  /** Rate limiting (429) */
  RATE_LIMIT = 'rate_limit',
  /** Server errors (5xx) */
  SERVER = 'server',
  /** Client errors (4xx except 429) */
  CLIENT = 'client',
  /** Request timeout */
  TIMEOUT = 'timeout',
  /** Stream was cancelled/aborted */
  CANCELLED = 'cancelled',
  /** Parse/format errors */
  PARSE = 'parse',
  /** Unknown error type */
  UNKNOWN = 'unknown',
}

export class StreamError extends Error {
  /** Error category for classification */
  public category: StreamErrorCategory;
  /** Number of retry attempts made */
  public retryCount: number = 0;
  /** Session ID if available */
  public sessionId?: string;
  /** Run ID if available */
  public runId?: string;

  constructor(
    message: string,
    public statusCode?: number,
    public isRetriable: boolean = false,
    category?: StreamErrorCategory,
  ) {
    super(message);
    this.name = 'StreamError';
    this.category = category || this.classifyError(message, statusCode);
  }

  /**
   * Classify error based on message and status code
   */
  private classifyError(
    message: string,
    statusCode?: number,
  ): StreamErrorCategory {
    // Check for cancelled/aborted
    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes('aborted') ||
      lowerMessage.includes('cancelled')
    ) {
      return StreamErrorCategory.CANCELLED;
    }

    // Check by status code
    if (statusCode) {
      if (statusCode === 401 || statusCode === 403) {
        return StreamErrorCategory.AUTH;
      }
      if (statusCode === 429) {
        return StreamErrorCategory.RATE_LIMIT;
      }
      if (statusCode >= 500) {
        return StreamErrorCategory.SERVER;
      }
      if (statusCode >= 400 && statusCode < 500) {
        return StreamErrorCategory.CLIENT;
      }
    }

    // Check by message content
    if (
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('timed out')
    ) {
      return StreamErrorCategory.TIMEOUT;
    }
    if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('connection')
    ) {
      return StreamErrorCategory.NETWORK;
    }
    if (lowerMessage.includes('parse') || lowerMessage.includes('json')) {
      return StreamErrorCategory.PARSE;
    }
    if (
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('authentication')
    ) {
      return StreamErrorCategory.AUTH;
    }

    return StreamErrorCategory.UNKNOWN;
  }

  /**
   * Check if this error should trigger a retry
   */
  shouldRetry(maxRetries: number = 3): boolean {
    if (this.retryCount >= maxRetries) {
      return false;
    }

    // Retriable categories
    const retriableCategories = [
      StreamErrorCategory.NETWORK,
      StreamErrorCategory.RATE_LIMIT,
      StreamErrorCategory.SERVER,
      StreamErrorCategory.TIMEOUT,
    ];

    return this.isRetriable || retriableCategories.includes(this.category);
  }

  /**
   * Calculate delay for next retry using exponential backoff
   */
  getRetryDelay(
    baseDelayMs: number = 1000,
    maxDelayMs: number = 30000,
  ): number {
    // Special case for rate limiting - use longer delay
    if (this.category === StreamErrorCategory.RATE_LIMIT) {
      return Math.min(
        baseDelayMs * Math.pow(2, this.retryCount + 2),
        maxDelayMs,
      );
    }

    const exponentialDelay = baseDelayMs * Math.pow(2, this.retryCount);
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.min(exponentialDelay + jitter, maxDelayMs);
  }

  /**
   * Create a new error with incremented retry count
   */
  withRetry(): StreamError {
    const newError = new StreamError(
      this.message,
      this.statusCode,
      this.isRetriable,
      this.category,
    );
    newError.retryCount = this.retryCount + 1;
    newError.sessionId = this.sessionId;
    newError.runId = this.runId;
    return newError;
  }
}
