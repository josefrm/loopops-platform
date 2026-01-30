import { supabase } from '@/integrations/supabase/client';
import { callSupabaseFunction } from '@/utils/supabaseHelper';

export interface JiraCredentials {
  companyUrl: string;
  username: string;
  apiKey?: string;
}

export interface WorkspaceCredentialsRequest {
  workspace_id: string;
}

export interface WorkspaceCredentialsResponse {
  credentials: {
    companyUrl?: string;
    username?: string;
  };
}

export interface StoreJiraCredentialsRequest {
  workspace_id: string;
  jira_base_url: string;
  jira_email: string;
  jira_api_token: string;
}

export interface UpdateJiraCredentialsRequest {
  workspace_id: string;
  jira_base_url: string;
  jira_email: string;
  jira_api_token?: string; // Optional for updates
}

export interface GetJiraTicketDetailsRequest {
  workspace_id: string;
  ticket_id: string;
}

export interface GetJiraProjectsRequest {
  workspace_id: string;
}

export interface GetJiraTicketsRequest {
  workspace_id: string;
  project_key: string;
  search?: string;
  maxResults?: number;
  startAt?: number;
}

export interface GetJiraMetadataRequest {
  workspace_id: string;
  project_key: string;
}

/**
 * Service for managing JIRA integrations and credentials
 */
export class JiraService {
  /**
   * Get workspace JIRA credentials
   */
  static async getWorkspaceCredentials(
    request: WorkspaceCredentialsRequest,
  ): Promise<WorkspaceCredentialsResponse> {
    const response = await callSupabaseFunction<WorkspaceCredentialsResponse>(
      'get_workspace_credentials',
      {
        workspace_id: request.workspace_id,
      },
    );

    return response;
  }

  /**
   * Store new JIRA credentials for a workspace
   */
  static async storeJiraCredentials(
    request: StoreJiraCredentialsRequest,
  ): Promise<any> {
    const response = await callSupabaseFunction('store-jira-credentials', {
      workspace_id: request.workspace_id,
      jira_base_url: request.jira_base_url,
      jira_email: request.jira_email,
      jira_api_token: request.jira_api_token,
    });

    return response;
  }

  /**
   * Update existing JIRA credentials for a workspace
   */
  static async updateJiraCredentials(
    request: UpdateJiraCredentialsRequest,
  ): Promise<any> {
    const requestBody: any = {
      workspace_id: request.workspace_id,
      jira_base_url: request.jira_base_url,
      jira_email: request.jira_email,
    };

    // Only include API token if provided
    if (request.jira_api_token) {
      requestBody.jira_api_token = request.jira_api_token;
    }

    const response = await callSupabaseFunction(
      'update-jira-credentials',
      requestBody,
    );

    return response;
  }

  /**
   * Disconnect JIRA by deactivating workspace credentials
   */
  static async disconnectJira(workspaceId: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_credentials')
      .update({ is_active: false })
      .eq('workspace_id', workspaceId)
      .eq('service', 'Jira');

    if (error) {
      throw new Error(`Failed to disconnect JIRA: ${error.message}`);
    }
  }

  /**
   * Get detailed JIRA ticket information
   */
  static async getJiraTicketDetails(
    request: GetJiraTicketDetailsRequest,
  ): Promise<any> {
    const response = await callSupabaseFunction('get-jira-ticket-details', {
      workspace_id: request.workspace_id,
      ticket_id: request.ticket_id,
    });

    return response;
  }

  /**
   * Get JIRA projects for a workspace
   */
  static async getJiraProjects(request: GetJiraProjectsRequest): Promise<any> {
    const response = await callSupabaseFunction(
      'get-jira-projects-by-workspace',
      {
        workspace_id: request.workspace_id,
      },
    );

    return response;
  }

  /**
   * Get JIRA tickets for a project
   */
  static async getJiraTickets(request: GetJiraTicketsRequest): Promise<any> {
    const response = await callSupabaseFunction('get-jira-tickets', {
      workspace_id: request.workspace_id,
      project_key: request.project_key,
      search: request.search,
      maxResults: request.maxResults || 50,
      startAt: request.startAt || 0,
    });

    return response;
  }

  /**
   * Get JIRA metadata for a project (statuses, priorities, assignees, etc.)
   */
  static async getJiraMetadata(request: GetJiraMetadataRequest): Promise<any> {
    const response = await callSupabaseFunction('get-jira-metadata', {
      workspace_id: request.workspace_id,
      project_key: request.project_key,
    });

    return response;
  }
}
