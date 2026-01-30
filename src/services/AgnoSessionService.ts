import { callSupabaseFunction } from '@/utils/supabaseHelper';

export interface AgnoMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: number; // Unix timestamp
  metadata?: Record<string, any>;
  attachments?: Array<{
    type: string;
    url?: string;
    filename?: string;
    content?: any;
    [key: string]: any;
  }>;
}

export interface AgnoSession {
  user_id: string;
  session_id: string;
  session_name: string;
  session_state: Record<string, any>;
  agent_id?: string;
  team_id?: string;
  total_tokens?: number | null;
  metrics?: Record<string, any> | null;
  metadata: {
    workspace_id?: string;
    project_id?: string;
    project_stage_id?: string;
    user_id: string;
    is_main_thread?: boolean;
    [key: string]: any;
  };
  chat_history: AgnoMessage[];
  created_at?: string;
  updated_at?: string;
  stage_name?: string;
}

export interface AgnoSessionsResponse {
  data: AgnoSession[];
  meta: {
    page: number;
    limit: number;
    total_pages: number;
    total_count: number;
    search_time_ms: number;
  };
}

export interface GetSessionsParams {
  workspace_id: string;
  project_id: string;
  user_id: string;
  component_id?: string;
  page?: number;
  limit?: number;
}

export class AgnoSessionService {
  static async getSessions(
    params: GetSessionsParams,
  ): Promise<AgnoSessionsResponse> {
    const requestBody = {
      workspace_id: params.workspace_id,
      project_id: params.project_id,
      user_id: params.user_id,
      component_id: params.component_id,
      ...(params.page && { page: params.page }),
      ...(params.limit && { limit: params.limit }),
    };

    const response = await callSupabaseFunction<AgnoSessionsResponse>(
      'get-agno-sessions',
      requestBody,
      {
        timeout: 30000,
        retries: 2,
        logRequest: false,
        logResponse: false,
      },
    );

    return response;
  }

  static getSessionById(
    sessions: AgnoSession[],
    sessionId: string,
  ): AgnoSession | undefined {
    return sessions.find((session) => session.session_id === sessionId);
  }

  static transformToLegacyFormat(session: AgnoSession): {
    session_id: string;
    is_main_thread: boolean;
    title: string;
    messages: AgnoMessage[];
    created_at: string | undefined;
    message_count: number;
    stage_id: number | undefined;
  } {
    // Extract stage_id from metadata.project_stage_id (which is the stage priority number)
    const stageId = session.metadata?.stage_id
      ? Number(session.metadata.stage_id)
      : undefined;

    return {
      session_id: session.session_id,
      is_main_thread: session.metadata?.is_main_thread || false,
      title: session.session_name || 'Untitled Session',
      messages: session.chat_history || [],
      created_at: session.created_at,
      message_count: session.chat_history?.length || 0,
      stage_id: stageId,
    };
  }

  static transformMultipleToLegacyFormat(sessions: AgnoSession[]) {
    return sessions.map((session) =>
      AgnoSessionService.transformToLegacyFormat(session),
    );
  }
}
