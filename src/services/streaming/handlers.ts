/**
 * Event Handlers - Strategy Pattern
 * Each handler processes a specific type of event from the stream
 */

import {
  EventType,
  RunCompletedEvent,
  RunContentEvent,
  RunErrorEvent,
  StreamCallbacks,
  StreamChunk,
  StreamEvent,
  StreamResponse,
  StreamError,
  StreamErrorCategory,
} from './types';

/**
 * Base interface for event handlers
 */
export interface EventHandler {
  canHandle(eventType: string): boolean;
  handle(event: StreamEvent, context: StreamContext): void;
}

/**
 * Context shared across all event handlers
 */
export interface StreamContext {
  sessionId: string;
  callbacks: StreamCallbacks;
  accumulator: StreamAccumulator;
  runnerType?: 'team' | 'agent'; // Track what type of runner initiated this stream
  primaryRunId?: string; // Track the primary run ID to filter nested runs
}

/**
 * Accumulates streaming data
 */
export class StreamAccumulator {
  private _fullResponse = '';
  private _actions: any[] = [];
  private _attachments: any[] = [];
  private _metadata: Record<string, any> = {};
  private _metrics: any = null;
  private _runnerType: 'team' | 'agent' | undefined;
  private _primaryTeamId: string | undefined;
  private _primaryAgentId: string | undefined;
  private _completed: boolean = false;

  setRunnerType(type: 'team' | 'agent'): void {
    this._runnerType = type;
  }

  getRunnerType(): 'team' | 'agent' | undefined {
    return this._runnerType;
  }

  setPrimaryTeamId(id: string): void {
    this._primaryTeamId = id;
  }

  getPrimaryTeamId(): string | undefined {
    return this._primaryTeamId;
  }

  setPrimaryAgentId(id: string): void {
    this._primaryAgentId = id;
  }

  getPrimaryAgentId(): string | undefined {
    return this._primaryAgentId;
  }

  append(content: string): void {
    this._fullResponse += content;
  }

  setActions(actions: any[]): void {
    this._actions = actions;
  }

  setAttachments(attachments: any[]): void {
    this._attachments = attachments;
  }

  setMetadata(metadata: Record<string, any>): void {
    this._metadata = metadata;
  }

  setMetrics(metrics: any): void {
    this._metrics = metrics;
  }

  getResponse(): StreamResponse {
    return {
      content: this._fullResponse,
      actions: this._actions,
      attachments: this._attachments.length > 0 ? this._attachments : undefined,
      metadata: this._metadata,
      metrics: this._metrics,
    };
  }

  getFullContent(): string {
    return this._fullResponse;
  }

  isCompleted(): boolean {
    return this._completed;
  }

  markCompleted(): void {
    this._completed = true;
  }
}

/**
 * Handles content streaming events (TeamRunContent, AgentRunContent, RunContent)
 * 
 * IMPORTANT: When running a team, we receive AgentRunContent events from nested agents.
 * We should only accumulate TeamRunContent events for teams, not the nested agent content.
 * This prevents duplicate content from appearing in the response.
 */
export class ContentEventHandler implements EventHandler {
  canHandle(eventType: string): boolean {
    return [
      EventType.TEAM_RUN_CONTENT,
      EventType.AGENT_RUN_CONTENT,
      EventType.RUN_CONTENT,
    ].includes(eventType as EventType);
  }

  handle(event: StreamEvent, context: StreamContext): void {
    const contentEvent = event as RunContentEvent;
    const eventType = event.event;
    const runnerType = context.accumulator.getRunnerType();
    
    // Filter nested agent events when running a team
    // Only accumulate content from the primary runner type
    if (runnerType === 'team' && eventType === EventType.AGENT_RUN_CONTENT) {
      // This is a nested agent within a team - emit event but don't accumulate content
      // The team's TeamRunContent/TeamRunCompleted will have the final response
      context.callbacks.onEvent?.(contentEvent);
      return;
    }

    let parsedContent = contentEvent.content;
    if (
      typeof contentEvent.content === 'string' &&
      contentEvent.content.trim().startsWith('{')
    ) {
      try {
        parsedContent = JSON.parse(contentEvent.content);
      } catch (e) {
        console.error('Error parsing content:', e);
        parsedContent = contentEvent.content;
      }
    }

    const content = this.extractContent(parsedContent);

    let actions: any[] = [];
    if (parsedContent && typeof parsedContent === 'object') {
      if ('actions' in parsedContent && Array.isArray(parsedContent.actions)) {
        actions = parsedContent.actions;
      }
    }
    if (actions.length === 0 && Array.isArray(contentEvent.actions)) {
      actions = contentEvent.actions;
    }

    if (content) {
      context.accumulator.append(content);

      const chunk: StreamChunk = {
        content,
        chunk: content,
        type: 'streaming',
        actions,
      };

      context.callbacks.onChunk?.(chunk);
    }

    if (actions.length > 0) {
      context.accumulator.setActions(actions);
    }

    context.callbacks.onEvent?.(contentEvent);
  }

  private extractContent(content: any): string {
    if (typeof content === 'string') {
      return content;
    }

    if (content?.agent_response) {
      return content.agent_response;
    }

    if (content && typeof content === 'object') {
      return JSON.stringify(content);
    }

    return '';
  }
}

/**
 * Handles completion events (TeamRunCompleted, AgentRunCompleted, RunCompleted)
 * 
 * IMPORTANT: When running a team, we receive AgentRunCompleted events from nested agents.
 * We should only process the TeamRunCompleted event for teams, not the nested agent completions.
 * Actions and attachments come from the team's completion event, not individual agents.
 */
export class CompletionEventHandler implements EventHandler {
  canHandle(eventType: string): boolean {
    return [
      EventType.TEAM_RUN_COMPLETED,
      EventType.AGENT_RUN_COMPLETED,
      EventType.RUN_COMPLETED,
    ].includes(eventType as EventType);
  }

  handle(event: StreamEvent, context: StreamContext): void {
    const completedEvent = event as RunCompletedEvent;
    const eventType = event.event;
    const runnerType = context.accumulator.getRunnerType();
    
    console.log('[CompletionHandler] Received completion event:', eventType, 'runnerType:', runnerType);

    const fullResponse = context.accumulator.getFullContent();

    let actions = completedEvent.actions || [];
    let attachments: any[] = [];

    let parsedContent = completedEvent.content;
    if (
      typeof completedEvent.content === 'string' &&
      completedEvent.content.trim().startsWith('{')
    ) {
      try {
        parsedContent = JSON.parse(completedEvent.content);
      } catch (e) {
        console.error('Error parsing content:', e);
        parsedContent = completedEvent.content;
      }
    }

    if (parsedContent && typeof parsedContent === 'object') {
      const contentData = parsedContent as any;
      if (contentData.actions && Array.isArray(contentData.actions)) {
        actions = contentData.actions;
      }
      if (contentData.attachments && Array.isArray(contentData.attachments)) {
        attachments = contentData.attachments;
      }
    }

    if (
      fullResponse &&
      typeof fullResponse === 'string' &&
      fullResponse.trim().startsWith('{')
    ) {
      try {
        const parsedData = JSON.parse(fullResponse);

        if (actions.length === 0 && parsedData.actions) {
          actions = parsedData.actions;
        }
      } catch (e) {
        console.error('Error parsing full response:', fullResponse, e);
      }
    }

    context.accumulator.setActions(actions);
    
    if (attachments.length > 0) {
      context.accumulator.setAttachments(attachments);
    } else if (completedEvent.attachments && Array.isArray(completedEvent.attachments)) {
      context.accumulator.setAttachments(completedEvent.attachments);
    }

    if (completedEvent.metadata) {
      context.accumulator.setMetadata(completedEvent.metadata);
    }

    if (completedEvent.metrics) {
      context.accumulator.setMetrics(completedEvent.metrics);
    }

    // Call onComplete based on runner type and event type:
    // - TEAM_RUN_COMPLETED when runnerType is 'team' (URL contains /teams/)
    // - RUN_COMPLETED when runnerType is 'agent' (URL contains /agents/)
    // This ensures notifications and other completion handlers are triggered
    // even if the stream doesn't send [DONE] or close immediately
    // Only call once to prevent duplicate notifications and state updates
    const shouldTriggerComplete = 
      (runnerType === 'team' && eventType === EventType.TEAM_RUN_COMPLETED) ||
      (runnerType === 'agent' && eventType === EventType.RUN_COMPLETED);
    
    if (shouldTriggerComplete && !context.accumulator.isCompleted()) {
      console.log('[CompletionHandler] Triggering onComplete for', eventType, 'event (runnerType:', runnerType, ')');
      context.accumulator.markCompleted();
      context.callbacks.onComplete?.(context.accumulator.getResponse());
    } else if (!shouldTriggerComplete) {
      console.log('[CompletionHandler] Skipping onComplete - event type', eventType, 'does not match runnerType', runnerType);
    } else if (context.accumulator.isCompleted()) {
      console.log('[CompletionHandler] Skipping onComplete - already completed');
    }
    
    context.callbacks.onEvent?.(completedEvent);
  }
}

/**
 * Handles error events (TeamRunError, AgentRunError, RunError)
 * 
 * Classifies errors and creates StreamError instances for proper
 * error handling and retry logic.
 */
export class ErrorEventHandler implements EventHandler {
  canHandle(eventType: string): boolean {
    return [
      EventType.TEAM_RUN_ERROR,
      EventType.AGENT_RUN_ERROR,
      EventType.RUN_ERROR,
      'error',
    ].includes(eventType as EventType);
  }

  handle(event: StreamEvent, context: StreamContext): void {
    const errorEvent = event as RunErrorEvent;
    const errorMessage =
      errorEvent.content || errorEvent.error || 'Stream error';

    // Create a StreamError with proper classification
    const streamError = new StreamError(
      errorMessage,
      undefined, // No HTTP status from SSE event
      this.isRetriableError(errorMessage),
      this.classifyErrorMessage(errorMessage)
    );

    // Add context
    streamError.sessionId = context.sessionId;
    if (errorEvent.run_id) {
      streamError.runId = errorEvent.run_id;
    }

    console.error('[ErrorEventHandler] Error event received:', {
      event: errorEvent.event,
      message: errorMessage,
      category: streamError.category,
      isRetriable: streamError.isRetriable,
      runId: errorEvent.run_id,
    });

    context.callbacks.onError?.(streamError);
    context.callbacks.onEvent?.(errorEvent);

    throw streamError;
  }

  /**
   * Classify error message into a category
   */
  private classifyErrorMessage(message: string): StreamErrorCategory {
    const lowerMessage = message.toLowerCase();

    // Timeout errors
    if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
      return StreamErrorCategory.TIMEOUT;
    }

    // Rate limiting (429)
    if (
      lowerMessage.includes('rate limit') ||
      lowerMessage.includes('too many requests') ||
      lowerMessage.includes('quota exceeded') ||
      lowerMessage.includes('429')
    ) {
      return StreamErrorCategory.RATE_LIMIT;
    }

    // Auth errors (401, 403)
    if (
      lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('forbidden') ||
      lowerMessage.includes('authentication') ||
      lowerMessage.includes('permission denied') ||
      lowerMessage.includes('401') ||
      lowerMessage.includes('403')
    ) {
      return StreamErrorCategory.AUTH;
    }

    // Client errors (4XX - bad request, not found, validation, etc.)
    if (
      lowerMessage.includes('bad request') ||
      lowerMessage.includes('not found') ||
      lowerMessage.includes('validation') ||
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('400') ||
      lowerMessage.includes('404') ||
      lowerMessage.includes('422') ||
      lowerMessage.includes('409') ||
      lowerMessage.includes('conflict')
    ) {
      return StreamErrorCategory.CLIENT;
    }

    // Network/connection errors
    if (
      lowerMessage.includes('network') ||
      lowerMessage.includes('connection') ||
      lowerMessage.includes('fetch') ||
      lowerMessage.includes('econnrefused') ||
      lowerMessage.includes('enotfound')
    ) {
      return StreamErrorCategory.NETWORK;
    }

    // Server errors (5XX)
    if (
      lowerMessage.includes('internal server error') ||
      lowerMessage.includes('server error') ||
      lowerMessage.includes('500') ||
      lowerMessage.includes('502') ||
      lowerMessage.includes('503') ||
      lowerMessage.includes('504')
    ) {
      return StreamErrorCategory.SERVER;
    }

    return StreamErrorCategory.UNKNOWN;
  }

  /**
   * Determine if error is retriable based on message
   */
  private isRetriableError(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // These are typically retriable (network, server, timeout issues)
    const retriablePatterns = [
      'timeout',
      'timed out',
      'rate limit',
      'too many requests',
      'network',
      'connection',
      'internal server error',
      'server error',
      'temporarily unavailable',
      '429', // Rate limit - retriable after backoff
      '500',
      '502',
      '503',
      '504',
    ];

    // These are NOT retriable (client errors, auth issues)
    const nonRetriablePatterns = [
      'unauthorized',
      'forbidden',
      'permission denied',
      'invalid',
      'not found',
      'bad request',
      'validation',
      'conflict',
      '400',
      '401',
      '403',
      '404',
      '409',
      '422',
    ];

    // Check non-retriable first (more specific)
    if (nonRetriablePatterns.some((p) => lowerMessage.includes(p))) {
      return false;
    }

    // Check retriable
    return retriablePatterns.some((p) => lowerMessage.includes(p));
  }
}

/**
 * Handles cancelled events (TeamRunCancelled, AgentRunCancelled)
 * 
 * These events are sent by Agno when a run is cancelled by the system
 * or by an external request. They should be treated as non-retriable errors.
 */
export class CancelledEventHandler implements EventHandler {
  canHandle(eventType: string): boolean {
    return [
      EventType.TEAM_RUN_CANCELLED,
      EventType.AGENT_RUN_CANCELLED,
    ].includes(eventType as EventType);
  }

  handle(event: StreamEvent, context: StreamContext): void {
    const cancelledEvent = event as any; // RunCancelledEvent
    const reason = cancelledEvent.reason || 'Run was cancelled';

    console.warn('[CancelledEventHandler] Run cancelled:', {
      event: cancelledEvent.event,
      reason,
      runId: cancelledEvent.run_id,
    });

    // Create a StreamError for cancelled runs - NOT retriable
    const streamError = new StreamError(
      reason,
      undefined,
      false, // Cancelled is NOT retriable
      StreamErrorCategory.CANCELLED
    );

    streamError.sessionId = context.sessionId;
    if (cancelledEvent.run_id) {
      streamError.runId = cancelledEvent.run_id;
    }

    context.callbacks.onError?.(streamError);
    context.callbacks.onEvent?.(cancelledEvent);

    // Don't throw - just end the stream gracefully
    // The onError callback will handle UI updates
  }
}

/**
 * Handles generic/unknown events
 */
export class GenericEventHandler implements EventHandler {
  canHandle(): boolean {
    return true; // Catch-all handler
  }

  handle(event: StreamEvent, context: StreamContext): void {
    context.callbacks.onEvent?.(event);
  }
}

/**
 * Event Handler Registry - manages all event handlers
 */
export class EventHandlerRegistry {
  private handlers: EventHandler[] = [];

  constructor() {
    this.registerDefaultHandlers();
  }

  private registerDefaultHandlers(): void {
    this.register(new ContentEventHandler());
    this.register(new CompletionEventHandler());
    this.register(new ErrorEventHandler());
    this.register(new CancelledEventHandler());
    this.register(new GenericEventHandler()); // Must be last (catch-all)
  }

  register(handler: EventHandler): void {
    this.handlers.push(handler);
  }

  handle(event: StreamEvent, context: StreamContext): void {
    const handler = this.handlers.find((h) => h.canHandle(event.event));

    if (handler) {
      handler.handle(event, context);
    }
  }
}
