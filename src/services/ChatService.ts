import { FileAttachment } from '@/hooks/useDragAndDrop';
import { callBackendApi } from '@/utils/backendApiHelper';

export interface SessionRequest {
  user_id: string;
  get_empty_session?: boolean;
  force_new_session?: boolean;
}

export interface SessionResponse {
  session_id: string;
}

export interface TicketSessionRequest {
  ticket_id: string;
  user_id: string;
  selected_ticket?: any;
}

export interface TicketSessionResponse {
  session_id: string;
  messages: any[];
  is_new_session?: boolean;
}

export interface ChatRequest {
  session_id: string;
  prompt: string;
  context?: any[];
  team_id?: string;
  workspace_id?: string;
  stage_id?: string;
  project_id?: string;
}

export interface ChatMessageRequest extends ChatRequest {
  attachments?: FileAttachment[];
  files?: File[];
  agent_id?: string;
  tabId?: string;
}

export interface GetSessionMessagesRequest {
  session_id: string;
  user_id: string;
}

export interface SessionMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  agent_name?: string;
  team_name?: string;
  agent_id?: string;
  actions?: any[];
  files?: Array<{
    id: string;
    content: string;
    filename: string;
    format?: string;
    mime_type?: string;
  }>;
  images?: Array<{
    id: string;
    format: string;
    mime_type: string;
    content: string;
  }>;
}

export interface GetSessionMessagesResponse {
  messages: SessionMessage[];
}

export interface GetSessionByIdResponse {
  session_id: string;
  agent_session_id?: string;
  session_name: string;
  session_summary?: string | null;
  session_state?: string | null;
  agent_id?: string | null;
  user_id?: string | null;
  total_tokens?: number | null;
  agent_data?: any;
  metrics?: any;
  metadata?: any;
  session_type?: 'agent' | 'team';
  chat_history: Array<{
    role: string;
    content: any;
    created_at?: number | string;
  }>;
  created_at: string;
  updated_at: string;
  runs?: Array<{
    run_id: string;
    status: string;
    created_at: number;
    updated_at: number;
    messages: Array<{
      role: string;
      content: any;
      created_at: number;
    }>;
  }>;
}

export interface ProcessMessageRequest {
  session_id: string;
  ticket_id: string;
  role: string;
  content: string;
  user_id: string;
}

export interface ProcessMessageResponse {
  success: boolean;
  message_id?: string;
  [key: string]: any;
}

/**
 * Service for managing chat sessions and related operations
 */
export class ChatService {
  static async getSessionById(
    sessionId: string,
    sessionType?: 'agent' | 'team',
  ): Promise<SessionMessage[]> {
    if (
      !sessionId ||
      typeof sessionId !== 'string' ||
      sessionId.trim() === ''
    ) {
      throw new Error('Invalid session ID provided');
    }

    let response: GetSessionByIdResponse | null = null;

    try {
      const queryParams: Record<string, string> = sessionType
        ? { type: sessionType }
        : { type: 'team' };

      response = await callBackendApi<GetSessionByIdResponse>(
        `/v1/sessions/${sessionId}`,
        'GET',
        undefined,
        {
          retries: 0,
          queryParams,
        },
      );
    } catch (backendError: any) {
      const status =
        backendError.statusCode ||
        backendError.status ||
        backendError.response?.status;
      const errorMessage = backendError.message || '';
      const isServerError = status === 500 || status === 404;
      const isNetworkError =
        errorMessage.includes('NetworkError') || errorMessage.includes('fetch');
      const is500Message =
        errorMessage.includes('500') ||
        errorMessage.includes('Internal Server Error');

      const shouldFallback = isServerError || isNetworkError || is500Message;

      if (shouldFallback) {
        try {
          const fallbackMessages = await this.getSessionMessages({
            session_id: sessionId,
            user_id: '',
          });
          return fallbackMessages;
        } catch (fallbackError) {
          console.error('Error fetching fallback messages:', fallbackError);
        }
      }

      if (backendError.statusCode === 404) {
        throw new Error('Session not found. It may have been deleted.');
      } else if (backendError.statusCode === 403) {
        throw new Error('Access denied. This session belongs to another user.');
      } else if (backendError.statusCode === 500) {
        throw new Error(
          'Session data is corrupted. Please start a new conversation.',
        );
      } else if (backendError.statusCode === 401) {
        throw new Error('Authentication required. Please log in again.');
      }

      throw backendError;
    }

    try {
      if (!response || typeof response !== 'object') {
        return [];
      }

      const messages: SessionMessage[] = [];

      if (response.chat_history && Array.isArray(response.chat_history)) {
        response.chat_history.forEach((msg: any, msgIndex: number) => {
          if (msg.role === 'user' || msg.role === 'assistant') {
            let content = msg.content;
            let agent_name: string | undefined;
            let team_name: string | undefined;
            let agent_id: string | undefined;
            let actions: any[] | undefined;

            if (typeof content === 'string' && content.trim()) {
              try {
                const parsed = JSON.parse(content.trim());
                if (parsed && typeof parsed === 'object') {
                  agent_name = parsed.agent_name;
                  team_name = parsed.team_name;
                  agent_id = parsed.agent_id;
                  actions = parsed.actions;

                  if (actions && Array.isArray(actions)) {
                    actions = actions.map((action: any, idx: number) => ({
                      ...action,
                      id: action.id || `action-${msgIndex}-${idx}`,
                    }));
                  }

                  if (parsed.agent_response !== undefined) {
                    content = parsed.agent_response || '';
                  } else if (parsed.response !== undefined) {
                    content = parsed.response || '';
                  } else if (parsed.content !== undefined) {
                    content = parsed.content || '';
                  } else if (
                    actions &&
                    actions.length > 0 &&
                    !parsed.agent_response
                  ) {
                    content = '';
                  }
                }
              } catch (e) {
                console.error('Error parsing message content:', e);
              }
            } else if (typeof content === 'object' && content !== null) {
              agent_name = content.agent_name;
              team_name = content.team_name;
              agent_id = content.agent_id;
              actions = content.actions;

              if (actions && Array.isArray(actions)) {
                actions = actions.map((action: any, idx: number) => ({
                  ...action,
                  id: action.id || `action-${msgIndex}-${idx}`,
                }));
              }

              if (content.agent_response !== undefined) {
                content = content.agent_response || '';
              } else if (content.response !== undefined) {
                content = content.response || '';
              } else if (content.content !== undefined) {
                content = content.content || '';
              } else {
                content = JSON.stringify(content);
              }
            }

            // Handle both timestamp formats (unix and ISO string)
            let created_at_iso: string;
            if (msg.created_at) {
              if (typeof msg.created_at === 'number') {
                created_at_iso = new Date(msg.created_at * 1000).toISOString();
              } else {
                created_at_iso = new Date(msg.created_at).toISOString();
              }
            } else {
              created_at_iso = new Date().toISOString();
            }

            // Process files/attachments
            let files: any[] | undefined;
            if (msg.files && Array.isArray(msg.files) && msg.files.length > 0) {
              files = msg.files.map((file: any) => ({
                id: file.id,
                content: file.content,
                filename: file.filename,
                format: file.format,
                mime_type: file.mime_type,
              }));
            }

            // Process images
            let images: any[] | undefined;
            if (
              msg.images &&
              Array.isArray(msg.images) &&
              msg.images.length > 0
            ) {
              images = msg.images.map((img: any) => ({
                id: img.id,
                content: img.content,
                format: img.format,
                mime_type: img.mime_type,
              }));
            }

            const processedMessage = {
              id: `${sessionId}_${msg.created_at || Date.now()}_${msgIndex}`,
              role: msg.role,
              content: String(content || ''),
              created_at: created_at_iso,
              agent_name,
              team_name,
              agent_id,
              actions,
              files,
              images,
            };

            messages.push(processedMessage);
          }
        });
      }

      if (
        messages.length === 0 &&
        response.runs &&
        Array.isArray(response.runs)
      ) {
        response.runs.forEach((run: any) => {
          if (run.messages && Array.isArray(run.messages)) {
            run.messages.forEach((msg: any, msgIndex: number) => {
              if (msg.role === 'user' || msg.role === 'assistant') {
                let content = msg.content;
                let agent_name: string | undefined;
                let team_name: string | undefined;
                let agent_id: string | undefined;
                let actions: any[] | undefined;

                // Parse content if it's a JSON string
                if (typeof content === 'string' && content.trim()) {
                  try {
                    const parsed = JSON.parse(content.trim());
                    if (parsed && typeof parsed === 'object') {
                      agent_name = parsed.agent_name;
                      team_name = parsed.team_name;
                      agent_id = parsed.agent_id;
                      actions = parsed.actions;

                      if (actions && Array.isArray(actions)) {
                        actions = actions.map((action: any, idx: number) => ({
                          ...action,
                          id: action.id || `action-${msgIndex}-${idx}`,
                        }));
                      }

                      if (parsed.agent_response !== undefined) {
                        content = parsed.agent_response || '';
                      } else if (parsed.response !== undefined) {
                        content = parsed.response || '';
                      } else if (parsed.content !== undefined) {
                        content = parsed.content || '';
                      } else if (
                        actions &&
                        actions.length > 0 &&
                        !parsed.agent_response
                      ) {
                        content = '';
                      }
                    }
                  } catch (e) {
                    console.error('Error parsing message content:', e);
                  }
                } else if (typeof content === 'object' && content !== null) {
                  agent_name = content.agent_name;
                  team_name = content.team_name;
                  agent_id = content.agent_id;
                  actions = content.actions;

                  if (actions && Array.isArray(actions)) {
                    actions = actions.map((action: any, idx: number) => ({
                      ...action,
                      id: action.id || `action-${msgIndex}-${idx}`,
                    }));
                  }

                  if (content.agent_response !== undefined) {
                    content = content.agent_response || '';
                  } else if (content.response !== undefined) {
                    content = content.response || '';
                  } else if (content.content !== undefined) {
                    content = content.content || '';
                  } else {
                    content = JSON.stringify(content);
                  }
                }

                // Process files/attachments from runs
                let files: any[] | undefined;
                if (
                  msg.files &&
                  Array.isArray(msg.files) &&
                  msg.files.length > 0
                ) {
                  files = msg.files.map((file: any) => ({
                    id: file.id,
                    content: file.content,
                    filename: file.filename,
                    format: file.format,
                    mime_type: file.mime_type,
                  }));
                }

                // Process images from runs
                let images: any[] | undefined;
                if (
                  msg.images &&
                  Array.isArray(msg.images) &&
                  msg.images.length > 0
                ) {
                  images = msg.images.map((img: any) => ({
                    id: img.id,
                    content: img.content,
                    format: img.format,
                    mime_type: img.mime_type,
                  }));
                }

                const processedMessage = {
                  id: `${run.run_id}_${msg.created_at}_${msgIndex}`,
                  role: msg.role,
                  content: String(content || ''),
                  created_at: new Date(msg.created_at * 1000).toISOString(),
                  agent_name,
                  team_name,
                  agent_id,
                  actions,
                  files,
                  images,
                };

                messages.push(processedMessage);
              }
            });
          }
        });
      }

      // Sort messages by creation time
      return messages.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    } catch (error: any) {
      console.error('🔴 CATCH BLOCK REACHED! Error:', {
        message: error.message,
        statusCode: error.statusCode,
        name: error.name,
        fullError: error,
      });

      // FALLBACK: Try the old /sessions/{id}/runs endpoint if new endpoint fails
      if (error.statusCode === 500 || error.statusCode === 404) {
        console.log(
          '🔄 Attempting fallback to /sessions/{id}/runs endpoint...',
        );
        try {
          const fallbackMessages = await this.getSessionMessages({
            session_id: sessionId,
            user_id: '',
          });
          console.log(
            '✅ Fallback successful! Messages:',
            fallbackMessages?.length,
          );
          return fallbackMessages;
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
          // Continue with original error handling
        }
      }

      console.error('🔴 No fallback executed, re-throwing error...');

      // Provide user-friendly error messages
      if (error.statusCode === 404) {
        throw new Error('Session not found. It may have been deleted.');
      } else if (error.statusCode === 403) {
        throw new Error('Access denied. This session belongs to another user.');
      } else if (error.statusCode === 500) {
        throw new Error(
          'Session data is corrupted. Please start a new conversation.',
        );
      } else if (error.statusCode === 401) {
        throw new Error('Authentication required. Please log in again.');
      }

      throw error;
    }
  }

  /**
   * Get messages for a specific session (deprecated - use getSessionById)
   */
  static async getSessionMessages(
    request: GetSessionMessagesRequest,
  ): Promise<SessionMessage[]> {
    const runs = await callBackendApi<any[]>(
      `/v1/sessions/${request.session_id}/runs`,
      'GET',
      undefined,
      {
        queryParams: {},
      },
    );

    const messages: SessionMessage[] = [];

    runs.forEach((run: any) => {
      if (run.messages && Array.isArray(run.messages)) {
        run.messages.forEach((msg: any, msgIndex: number) => {
          if (msg.role === 'user' || msg.role === 'assistant') {
            let content = msg.content;
            let agent_name: string | undefined;
            let team_name: string | undefined;
            let agent_id: string | undefined;
            let actions: any[] | undefined;

            if (typeof content === 'string' && content.trim()) {
              const parsed = JSON.parse(content.trim());
              if (parsed && typeof parsed === 'object') {
                agent_name = parsed.agent_name;
                team_name = parsed.team_name;
                agent_id = parsed.agent_id;
                actions = parsed.actions;

                if (actions && Array.isArray(actions)) {
                  actions = actions.map((action: any, idx: number) => ({
                    ...action,
                    id: action.id || `action-${msgIndex}-${idx}`,
                  }));
                }

                if (parsed.agent_response !== undefined) {
                  content = parsed.agent_response || '';
                } else if (parsed.response !== undefined) {
                  content = parsed.response || '';
                } else if (parsed.content !== undefined) {
                  content = parsed.content || '';
                } else if (
                  actions &&
                  actions.length > 0 &&
                  !parsed.agent_response
                ) {
                  content = '';
                }
              }
            } else if (typeof content === 'object' && content !== null) {
              agent_name = content.agent_name;
              team_name = content.team_name;
              agent_id = content.agent_id;
              actions = content.actions;

              if (actions && Array.isArray(actions)) {
                actions = actions.map((action: any, idx: number) => ({
                  ...action,
                  id: action.id || `action-${msgIndex}-${idx}`,
                }));
              }

              if (content.agent_response !== undefined) {
                content = content.agent_response || '';
              } else if (content.response !== undefined) {
                content = content.response || '';
              } else if (content.content !== undefined) {
                content = content.content || '';
              } else {
                content = JSON.stringify(content);
              }
            }

            const processedMessage = {
              id: `${run.run_id}_${msg.created_at}_${msgIndex}`,
              role: msg.role,
              content: String(content || ''),
              created_at: new Date(msg.created_at * 1000).toISOString(),
              agent_name,
              team_name,
              agent_id,
              actions,
            };

            messages.push(processedMessage);
          }
        });
      }
    });

    return messages.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  /**
   * Process and store a message (deprecated - backend handles this automatically)
   */
  static async processMessage(): Promise<ProcessMessageResponse> {
    return {
      success: true,
      message: 'Messages are now stored automatically by the backend',
    };
  }
}
