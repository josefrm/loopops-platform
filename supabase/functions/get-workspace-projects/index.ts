import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from "../_shared/cors.ts";

interface ProjectInfo {
  project_id: string;
  project_name: string;
  role: string;
}

interface WorkspaceWithProjects {
  workspace_id: string;
  workspace_name: string;
  projects: ProjectInfo[];
}

interface GetWorkspaceProjectsResponse {
  workspaces: WorkspaceWithProjects[];
}

interface ProjectMembershipWithRelations {
  project_id: string;
  role: string;
  loopops_projects: {
    id: string;
    name: string;
    workspace_id: string;
    loopops_workspaces: {
      id: string;
      name: string;
    };
  };
}

const supabaseUrl = Deno.env.get('REMOTE_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('REMOTE_SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabaseAnonKey = Deno.env.get('REMOTE_SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Create service role client for database operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('get-workspace-projects: Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log(`get-workspace-projects: Fetching all workspaces and projects for user ${userId}`);

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all workspaces and projects where user is a member
    // Uses project_members table to determine access
    const { data: projectMemberships, error: fetchError } = await supabaseAdmin
      .from('loopops_project_members')
      .select(`
        project_id,
        role,
        loopops_projects!inner (
          id,
          name,
          workspace_id,
          loopops_workspaces!inner (
            id,
            name
          )
        )
      `)
      .eq('profile_id', userId);

    if (fetchError) {
      console.error('Error fetching workspaces and projects:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch workspaces and projects' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group projects by workspace
    const workspaceMap = new Map<string, WorkspaceWithProjects>();

    (projectMemberships || []).forEach((membership: ProjectMembershipWithRelations) => {
      const project = membership.loopops_projects;
      const workspace = project.loopops_workspaces;

      const workspaceId = workspace.id;
      const workspaceName = workspace.name;

      // Get or create workspace entry
      if (!workspaceMap.has(workspaceId)) {
        workspaceMap.set(workspaceId, {
          workspace_id: workspaceId,
          workspace_name: workspaceName,
          projects: [],
        });
      }

      // Add project to workspace
      const workspaceEntry = workspaceMap.get(workspaceId)!;
      workspaceEntry.projects.push({
        project_id: project.id,
        project_name: project.name,
        role: membership.role,
      });
    });

    // Convert map to array and sort
    const workspaces = Array.from(workspaceMap.values())
      .sort((a, b) => a.workspace_name.localeCompare(b.workspace_name));

    // Sort projects within each workspace
    workspaces.forEach(workspace => {
      workspace.projects.sort((a, b) => a.project_name.localeCompare(b.project_name));
    });

    console.log(`User ${userId} has access to ${workspaces.length} workspace(s) with ${projectMemberships?.length || 0} total project(s)`);

    const response: GetWorkspaceProjectsResponse = {
      workspaces,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in get-workspace-projects:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
