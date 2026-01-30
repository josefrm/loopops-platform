import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from "../_shared/cors.ts";

interface CreateInvitationRequest {
  workspace_id: string;
  project_id: string;
  email: string;
  role?: string;
  expires_in_days?: number;
}

interface CreateInvitationResponse {
  invitation: {
    id: string;
    code: string;
    workspace_id: string;
    project_id: string;
    email: string;
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
    // Parse request body
    const requestBody = await req.json() as CreateInvitationRequest;
    const { workspace_id, project_id, email, role = 'member', expires_in_days = 7 } = requestBody;

    // Validate required fields
    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: 'workspace_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'project_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }



    // Extrae el token (quitando "Bearer ")
    const token = authHeader.replace('Bearer ', '');

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('create-workspace-invitation: Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`create-workspace-invitation: User ${user.id} creating invitation for workspace ${workspace_id}`);



    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // Verify project exists, belongs to workspace, and user is owner 
    const { data: projectWorkspace, error: validationError } = await supabaseAdmin
      .from('loopops_projects')
      .select(`
        id,
        name,
        workspace_id,
        loopops_workspaces!inner (
          id,
          name,
          owner_id
        )
      `)
      .eq('id', project_id)
      .eq('workspace_id', workspace_id)
      .single();

    if (validationError || !projectWorkspace) {
      console.error('Validation error:', validationError);

      // Determine specific error message
      if (validationError?.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'Project or workspace not found, or project does not belong to workspace' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to validate project and workspace' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract workspace and project data
    const workspace = projectWorkspace.loopops_workspaces;
    const project = {
      id: projectWorkspace.id,
      name: projectWorkspace.name,
      workspace_id: projectWorkspace.workspace_id
    };

    // Verify user is owner of the workspace
    if (workspace.owner_id !== user.id) {
      console.error(`User ${user.id} is not owner of workspace ${workspace_id}`);
      return new Response(
        JSON.stringify({ error: 'Only workspace owners can create invitations' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check limit of 50 active codes per project
    const { count, error: countError } = await supabaseAdmin
      .from('loopops_workspace_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', project_id)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString());

    if (countError) {
      console.error('Error checking invitation count:', countError);
      return new Response(
        JSON.stringify({ error: 'Failed to check invitation limit' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (count !== null && count >= 50) {
      return new Response(
        JSON.stringify({
          error: 'Maximum of 50 active invitations per project reached',
          current_count: count
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique code using SQL function
    const { data: codeData, error: codeError } = await supabaseAdmin
      .rpc('generate_invitation_code');

    if (codeError || !codeData) {
      console.error('Error generating invitation code:', codeError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate invitation code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const code = codeData as string;

    // Calculate expires_at
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);

    // Insert invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('loopops_workspace_invitations')
      .insert({
        code,
        workspace_id,
        project_id,
        email,
        invited_by_user_id: user.id,
        role,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (invitationError || !invitation) {
      console.error('Error creating invitation:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Invitation created with code: ${code} for project ${project.name}`);

    const response: CreateInvitationResponse = {
      invitation: {
        id: invitation.id,
        code: invitation.code,
        workspace_id: invitation.workspace_id,
        project_id: invitation.project_id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        created_at: invitation.created_at,
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
      project: {
        id: project.id,
        name: project.name,
      },
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in create-workspace-invitation:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
