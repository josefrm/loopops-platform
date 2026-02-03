import { supabase } from '@/integrations/supabase/client';
import {
  GetWorkspaceProjectsResponse,
  WorkspaceWithProjects,
} from '@/stores/workspaceProjectStore';

/**
 * Request interface for creating a workspace
 */
export interface CreateWorkspaceV2Request {
  name: string;
  role?: string;
}

/**
 * Workspace data returned from the API
 */
export interface WorkspaceV2 {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  role?: string;
}

/**
 * Workspace membership data returned from the API
 */
export interface WorkspaceProfileMembership {
  id: string;
  workspace_id: string;
  profile_id: string;
  role: string;
  created_at: string;
  updated_at: string;
}

/**
 * Response interface for workspace creation
 */
export interface CreateWorkspaceV2Response {
  workspace: WorkspaceV2;
  membership: WorkspaceProfileMembership;
}

/**
 * Request interface for creating a project
 */
export interface CreateProjectV2Request {
  name: string;
  workspace_id: string;
}

/**
 * Project data returned from the API
 */
export interface ProjectV2 {
  id: string;
  name: string;
  workspace_id: string;
  status: string;
  created_at: string;
}

/**
 * Response interface for project creation
 */
export interface CreateProjectV2Response {
  project: ProjectV2;
  onboarding: {
    stage: number;
    completed: boolean;
  } | null;
}

/**
 * Invitation data returned from the API
 */
export interface WorkspaceInvitation {
  id: string;
  code: string;
  workspace_id: string;
  workspace_name: string;
  project_id: string;
  project_name: string;
  invited_by_user_id: string;
  role: string;
  used: boolean;
  accepted_by_user_id: string | null;
  accepted_by_email: string | null;
  accepted_at: string | null;
  expires_at: string;
  is_expired: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Request interface for creating an invitation
 */
export interface CreateInvitationRequest {
  workspace_id: string;
  project_id: string;
  role?: string;
  expires_in_days?: number;
}

/**
 * Response interface for creating an invitation
 */
export interface CreateInvitationResponse {
  invitation: {
    id: string;
    code: string;
    workspace_id: string;
    project_id: string;
    role: string;
    expires_at: string;
    created_at: string;
  };
  workspace: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    name: string;
  };
}

/**
 * Request interface for accepting an invitation
 */
export interface AcceptInvitationRequest {
  code: string;
}

/**
 * Response interface for accepting an invitation
 */
export interface AcceptInvitationResponse {
  success: boolean;
  workspace: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    name: string;
  };
  membership: {
    id: string;
    project_id: string;
    profile_id: string;
    role: string;
  };
  onboarding_completed: boolean;
  user_type: 'new' | 'existing';
}

/**
 * Response interface for validating an invitation code
 */
export interface ValidateCodeResponse {
  valid: boolean;
  workspace?: {
    id: string;
    name: string;
  };
  project?: {
    id: string;
    name: string;
  };
  invited_by_name?: string;
  role?: string;
  expires_at?: string;
  error?: 'not_found' | 'expired' | 'used';
}

/**
 * Response interface for getting invitations
 */
export interface GetInvitationsResponse {
  invitations: WorkspaceInvitation[];
  total: number;
}

/**
 * Service for managing workspaces in the V2 schema
 */
export class WorkspaceService {
  /**
   * Creates a new workspace and establishes a relationship with the authenticated user's profile
   *
   * @param request - The workspace creation request
   * @returns Promise with workspace and membership data
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const result = await WorkspaceService.createWorkspaceV2({
   *   name: 'My New Workspace',
   *   role: 'admin'
   * });
   * console.log('Workspace ID:', result.workspace.id);
   * ```
   */
  static async createWorkspaceV2(
    request: CreateWorkspaceV2Request,
  ): Promise<CreateWorkspaceV2Response> {
    const { data, error } = await supabase.functions.invoke(
      'create-workspace-v2',
      {
        body: {
          name: request.name,
          role: request.role || 'admin',
        },
      },
    );

    if (error) {
      console.error('Error creating workspace:', error);
      throw new Error(error.message || 'Failed to create workspace');
    }

    if (!data || !data.workspace || !data.membership) {
      throw new Error('Invalid response from workspace creation');
    }

    return data as CreateWorkspaceV2Response;
  }

  /**
   * Gets all workspaces accessible to the authenticated user
   * Uses edge function to properly handle permissions
   * Includes workspaces where user is owner OR member of at least one project
   *
   * @returns Promise with array of workspaces
   * @throws Error if the request fails
   */
  static async getUserWorkspacesV2(): Promise<WorkspaceV2[]> {
    const { data, error } = await supabase.functions.invoke(
      'get-user-workspaces',
      {
        body: {},
      }
    );

    if (error) {
      console.error('Error fetching workspaces:', error);
      throw new Error(error.message || 'Failed to fetch workspaces');
    }

    if (!data || !data.workspaces) {
      console.log('No workspaces found for user');
      return [];
    }

    // Transform to match WorkspaceV2 interface
    return data.workspaces.map((w: any) => ({
      id: w.id,
      name: w.name,
      created_at: w.created_at,
      updated_at: w.created_at,
      role: w.role,
    }));
  }

  /**
   * Gets a specific workspace by ID from loopops schema
   *
   * @param workspaceId - The workspace ID
   * @returns Promise with workspace data or null if not found
   * @throws Error if the request fails
   */
  static async getWorkspaceV2(
    workspaceId: string,
  ): Promise<WorkspaceV2 | null> {
    const { data, error } = await supabase
      .from('loopops_workspaces')
      .select('*')
      .eq('id', workspaceId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching workspace:', error);
      throw new Error(error.message || 'Failed to fetch workspace');
    }

    if (!data) return null;

    // Transform to match WorkspaceV2 interface
    return {
      id: data.id,
      name: data.name,
      created_at: data.created_at,
      updated_at: data.created_at, // loopops doesn't have updated_at
      role: 'owner', // User is always owner in loopops schema
    };
  }

  /**
   * Gets all members of a workspace from V2 schema
   *
   * @param workspaceId - The workspace ID
   * @returns Promise with array of memberships
   * @throws Error if the request fails
   */
  static async getWorkspaceMembersV2(
    workspaceId: string,
  ): Promise<WorkspaceProfileMembership[]> {
    const { data, error } = await supabase
      .from('v2_workspace_profile')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (error) {
      console.error('Error fetching workspace members:', error);
      throw new Error(error.message || 'Failed to fetch workspace members');
    }

    return data || [];
  }

  /**
   * Adds a user to a workspace (requires admin permission)
   *
   * @param workspaceId - The workspace ID
   * @param profileId - The profile ID to add
   * @param role - The role to assign (default: 'member')
   * @returns Promise with membership data
   * @throws Error if the request fails
   */
  static async addMemberToWorkspaceV2(
    workspaceId: string,
    profileId: string,
    role: string = 'member',
  ): Promise<WorkspaceProfileMembership> {
    const { data, error } = await supabase
      .from('v2_workspace_profile')
      .insert({
        workspace_id: workspaceId,
        profile_id: profileId,
        role,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding member to workspace:', error);
      throw new Error(error.message || 'Failed to add member to workspace');
    }

    return data;
  }

  /**
   * Removes a user from a workspace (requires admin permission)
   *
   * @param workspaceId - The workspace ID
   * @param profileId - The profile ID to remove
   * @throws Error if the request fails
   */
  static async removeMemberFromWorkspaceV2(
    workspaceId: string,
    profileId: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('v2_workspace_profile')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('profile_id', profileId);

    if (error) {
      console.error('Error removing member from workspace:', error);
      throw new Error(
        error.message || 'Failed to remove member from workspace',
      );
    }
  }

  /**
   * Updates a workspace member's role (requires admin permission)
   *
   * @param workspaceId - The workspace ID
   * @param profileId - The profile ID to update
   * @param role - The new role
   * @returns Promise with updated membership data
   * @throws Error if the request fails
   */
  static async updateMemberRoleV2(
    workspaceId: string,
    profileId: string,
    role: string,
  ): Promise<WorkspaceProfileMembership> {
    const { data, error } = await supabase
      .from('v2_workspace_profile')
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('profile_id', profileId)
      .select()
      .single();

    if (error) {
      console.error('Error updating member role:', error);
      throw new Error(error.message || 'Failed to update member role');
    }

    return data;
  }

  /**
   * Updates a workspace's name
   *
   * @param workspaceId - The workspace ID
   * @param name - The new workspace name
   * @returns Promise with updated workspace data
   * @throws Error if the request fails
   */
  static async updateWorkspaceV2(
    workspaceId: string,
    name: string,
  ): Promise<WorkspaceV2> {
    const { data, error } = await supabase
      .from('loopops_workspaces')
      .update({ name })
      .eq('id', workspaceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating workspace:', error);
      throw new Error(error.message || 'Failed to update workspace');
    }

    // Transform to match WorkspaceV2 interface
    return {
      id: data.id,
      name: data.name,
      created_at: data.created_at,
      updated_at: data.created_at, // loopops doesn't have updated_at
      role: 'owner',
    };
  }

  /**
   * Deletes a workspace (requires owner permission)
   * This will cascade delete all related projects and data
   *
   * @param workspaceId - The workspace ID
   * @throws Error if the request fails
   */
  static async deleteWorkspaceV2(workspaceId: string): Promise<void> {
    const { error } = await supabase
      .from('loopops_workspaces')
      .delete()
      .eq('id', workspaceId);

    if (error) {
      console.error('Error deleting workspace:', error);
      throw new Error(error.message || 'Failed to delete workspace');
    }
  }

  /**
   * Creates a new project in a workspace
   *
   * @param request - The project creation request
   * @returns Promise with project and onboarding data
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const result = await WorkspaceService.createProjectV2({
   *   name: 'My New Project',
   *   workspace_id: 'workspace-uuid'
   * });
   * console.log('Project ID:', result.project.id);
   * ```
   */
  static async createProjectV2(
    request: CreateProjectV2Request,
  ): Promise<CreateProjectV2Response> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw new Error('You must be logged in to create a project');
    }

    const { data, error } = await supabase.functions.invoke(
      'create-project-v2',
      {
        body: {
          name: request.name,
          workspace_id: request.workspace_id,
          user_id: session.session.user.id,
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      },
    );

    if (error) {
      console.error('Error creating project:', error);
      throw new Error(error.message || 'Failed to create project');
    }

    if (!data || !data.project) {
      throw new Error('Invalid response from project creation');
    }

    return data as CreateProjectV2Response;
  }

  /**
   * Gets all projects for a specific workspace that the user has access to
   * Uses edge function to properly handle permissions
   * Shows only:
   * - Projects in workspaces where user is owner, OR
   * - Projects where user is a member (via invitation)
   *
   * @param workspaceId - The workspace ID
   * @returns Promise with array of accessible projects
   * @throws Error if the request fails
   */
  static async getProjectsByWorkspaceV2(workspaceId: string): Promise<any[]> {
    const { data, error } = await supabase.functions.invoke(
      'get-workspace-projects',
      {
        body: { workspace_id: workspaceId },
      }
    );

    if (error) {
      console.error('Error fetching projects:', error);
      throw new Error(error.message || 'Failed to fetch projects');
    }

    if (!data || !data.projects) {
      return [];
    }

    return data.projects;
  }

  /**
   * Creates an invitation code for a specific project
   *
   * @param workspaceId - The workspace ID
   * @param projectId - The project ID (user will only see this project)
   * @param role - The role to assign (default: 'member')
   * @param expiresInDays - Number of days until expiration (default: 7)
   * @returns Promise with invitation data
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const invitation = await WorkspaceService.createWorkspaceInvitation(
   *   'workspace-uuid',
   *   'project-uuid',
   *   'member',
   *   7
   * );
   * console.log('Invitation code:', invitation.invitation.code);
   * console.log('For project:', invitation.project.name);
   * ```
   */
  static async createWorkspaceInvitation(
    workspaceId: string,
    projectId: string,
    role: string = 'member',
    expiresInDays: number = 7,
  ): Promise<CreateInvitationResponse> {
    const { data, error } = await supabase.functions.invoke(
      'create-workspace-invitation',
      {
        body: {
          workspace_id: workspaceId,
          project_id: projectId,
          role,
          expires_in_days: expiresInDays,
        },
      },
    );

    if (error) {
      console.error('Error creating invitation:', error);
      throw new Error(error.message || 'Failed to create invitation');
    }

    if (!data || !data.invitation) {
      throw new Error('Invalid response from invitation creation');
    }

    return data as CreateInvitationResponse;
  }

  /**
   * Accepts an invitation code to a specific project
   * User will gain access to the workspace and the specific project only
   *
   * @param code - The invitation code
   * @returns Promise with acceptance data including workspace and project info
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const result = await WorkspaceService.acceptWorkspaceInvitation('K7M2P9WQ');
   * console.log('Workspace:', result.workspace.name);
   * console.log('Project:', result.project.name);
   * console.log('User type:', result.user_type);
   * ```
   */
  static async acceptWorkspaceInvitation(
    code: string,
  ): Promise<AcceptInvitationResponse> {
    const { data, error } = await supabase.functions.invoke(
      'accept-workspace-invitation',
      {
        body: { code },
      },
    );

    if (error) {
      console.error('Error accepting invitation:', error);
      throw new Error(error.message || 'Failed to accept invitation');
    }

    if (!data || !data.success) {
      throw new Error('Invalid response from invitation acceptance');
    }

    return data as AcceptInvitationResponse;
  }

  /**
   * Validates an invitation code without accepting it
   * Shows which workspace and project the invitation is for
   *
   * @param code - The invitation code
   * @returns Promise with validation result including workspace and project info
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const validation = await WorkspaceService.validateInvitationCode('K7M2P9WQ');
   * if (validation.valid) {
   *   console.log('Valid invitation for workspace:', validation.workspace?.name);
   *   console.log('Project:', validation.project?.name);
   * } else {
   *   console.log('Invalid:', validation.error);
   * }
   * ```
   */
  static async validateInvitationCode(
    code: string,
  ): Promise<ValidateCodeResponse> {
    const { data, error } = await supabase.functions.invoke(
      'validate-invitation-code',
      {
        body: { code },
      },
    );

    if (error) {
      console.error('Error validating invitation code:', error);
      throw new Error(error.message || 'Failed to validate invitation code');
    }

    if (!data) {
      throw new Error('Invalid response from invitation validation');
    }

    return data as ValidateCodeResponse;
  }

  /**
   * Gets all invitations created by the current user
   *
   * @param workspaceId - Optional workspace ID to filter invitations
   * @returns Promise with invitations list
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const invitations = await WorkspaceService.getWorkspaceInvitations('workspace-uuid');
   * console.log('Active invitations:', invitations.invitations.length);
   * ```
   */
  static async getWorkspaceInvitations(
    workspaceId?: string,
  ): Promise<GetInvitationsResponse> {
    const { data, error } = await supabase.functions.invoke(
      'get-workspace-invitations',
      {
        body: {
          workspace_id: workspaceId,
          include_expired: false,
          include_used: false,
        },
      },
    );

    if (error) {
      console.error('Error fetching invitations:', error);
      throw new Error(error.message || 'Failed to fetch invitations');
    }

    if (!data || !data.invitations) {
      throw new Error('Invalid response from invitation fetch');
    }

    return data as GetInvitationsResponse;
  }

  /**
   * Gets all workspaces with their projects for the authenticated user
   * Uses the get-workspace-projects edge function
   *
   * @returns Promise with workspaces and their projects including user roles
   * @throws Error if the request fails
   */
  static async getWorkspaceProjects(): Promise<GetWorkspaceProjectsResponse> {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw new Error('You must be logged in to fetch workspace projects');
    }

    const { data, error } = await supabase.functions.invoke(
      'get-workspace-projects',
      {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      },
    );

    if (error) {
      console.error('Error fetching workspace projects:', error);
      throw new Error(error.message || 'Failed to fetch workspace projects');
    }

    if (!data || !data.workspaces) {
      throw new Error('Invalid response from get-workspace-projects');
    }

    return data as GetWorkspaceProjectsResponse;
  }
}
