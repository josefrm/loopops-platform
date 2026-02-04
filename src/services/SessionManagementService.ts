import { isBackendApiConfigured } from '@/config/api';
import { BackendApiError, callBackendApi } from '@/utils/backendApiHelper';

export interface SessionResponse {
  session_id: string;
  is_new_session?: boolean;
  is_main_thread?: boolean;
  title?: string;
  messages?: any[];
  created_at?: string;
  stage_id?: number;
  stage_template_id?: string;
}

export interface SessionWithContext extends SessionResponse {
  context_tickets?: any[];
}

interface BackendSession {
  session_id: string;
  session_name: string;
  user_id?: string | null;
  team_id?: string | null;
  session_summary?: string | null;
  session_state: Record<string, any> | null;
  metrics?: Record<string, any>;
  team_data?: any | null;
  metadata?: any | null;
  chat_history?: any[];
  created_at: string;
  updated_at: string;
  total_tokens?: number | null;
}

export class SessionManagementService {
  static async getOrCreateMainThread(userId: string): Promise<SessionResponse> {
    if (!isBackendApiConfigured()) {
      throw new BackendApiError(
        'Backend API URL is not configured. Please set VITE_BACKEND_API_URL environment variable.',
        '/sessions',
        0,
      );
    }

    try {
      const backendResponse = await callBackendApi<BackendSession>(
        '/api/v1/sessions',
        'POST',
        {
          session_name: 'Main Thread',
          session_state: {
            user_id: userId,
            is_main_thread: true,
          },
          metadata: {
            is_main_thread: true,
            session_type: 'main_thread',
            created_by: userId,
          },
        },
        {
          retries: 1,
          timeout: 15000,
          queryParams: { type: 'team' },
        },
      );

      return {
        session_id: backendResponse.session_id,
        is_new_session: true,
        is_main_thread: true,
        title: 'Main Thread',
        created_at: backendResponse.created_at,
      };
    } catch (error) {
      console.error('Error creating main thread:', error);
      throw error;
    }
  }
  static async getOrCreateTicketSession(
    userId: string,
    ticketId: string,
    selectedTicket?: any,
  ): Promise<SessionResponse> {
    try {
      const backendResponse = await callBackendApi<BackendSession>(
        '/api/v1/sessions',
        'POST',
        {
          session_name: `Ticket ${ticketId}`,
          session_state: {
            user_id: userId,
            ticket_id: ticketId,
            selected_ticket: selectedTicket,
          },
          metadata: {
            is_main_thread: false,
            session_type: 'ticket',
            ticket_id: ticketId,
            ticket_key: selectedTicket?.key,
          },
        },
        {
          retries: 1,
          timeout: 15000,
          queryParams: { type: 'agent' },
        },
      );

      return {
        session_id: backendResponse.session_id,
        is_new_session: true,
        is_main_thread: false,
        title: `Ticket ${ticketId}`,
        created_at: backendResponse.created_at,
      };
    } catch (error) {
      console.error('Error creating ticket session:', error);
      throw error;
    }
  }

  static async getSessionById(sessionId: string): Promise<SessionWithContext> {
    try {
      const backendSession = await callBackendApi<BackendSession>(
        `/api/v1/sessions/${sessionId}`,
        'GET',
        undefined,
        {
          timeout: 10000,
        },
      );

      return {
        session_id: backendSession.session_id,
        is_main_thread: backendSession.metadata?.is_main_thread || false,
        title: backendSession.session_name,
        messages: backendSession.chat_history || [],
        context_tickets: [],
        created_at: backendSession.created_at,
      };
    } catch (error) {
      console.error('Failed to fetch session from backend:', error);
      throw new Error(`Session not found: ${sessionId}`);
    }
  }

  static async deleteSession(sessionId: string): Promise<void> {
    await callBackendApi(`/v1/sessions/${sessionId}`, 'DELETE', undefined, {
      timeout: 10000,
    });
  }

  static async updateSessionName(
    sessionId: string,
    sessionName: string,
  ): Promise<void> {
    try {
      await callBackendApi(
        `/api/v1/sessions/${sessionId}`,
        'PATCH',
        {
          session_name: sessionName,
        },
        {
          timeout: 10000,
        },
      );
    } catch (error) {
      console.error('Failed to update session name:', error);
      throw error;
    }
  }

  static async getUserSessions(
    userId: string,
    limit: number = 50,
    stageTemplateId?: string,
    componentType?: 'agent' | 'team' | 'workflow',
  ): Promise<SessionResponse[]> {
    try {
      const queryParams: Record<string, string | number | boolean> = {
        limit,
        user_id: userId,
      };

      if (stageTemplateId && componentType) {
        queryParams.component_id = stageTemplateId;
        queryParams.type = componentType;
      }

      const response = await callBackendApi<{
        data: BackendSession[];
        meta?: {
          total_count: number;
          page: number;
          total_pages: number;
        };
      }>('/api/v1/sessions', 'GET', undefined, {
        timeout: 15000,
        queryParams,
      });

      const sessions = response?.data || [];

      return sessions.map((session) => ({
        session_id: session.session_id,
        is_main_thread: session.metadata?.is_main_thread || false,
        title: session.session_name || 'New Chat',
        messages: [],
        created_at: session.created_at,
        stage_id: session.metadata?.stage_id,
        stage_template_id: session.metadata?.stage_template_id,
      }));
    } catch (error) {
      console.error('❌ Failed to fetch user sessions:', error);
      throw error;
    }
  }
}
