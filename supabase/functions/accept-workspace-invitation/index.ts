import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from "../_shared/cors.ts";
import { callEdgeFunction } from "../_shared/callEdgeFunction.ts";

interface AcceptInvitationRequest {
  code: string;
  user_id?: string;
  name?: string; // For CASE A: User name for onboarding
}

interface AcceptInvitationResponse {
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
    const requestBody = await req.json() as AcceptInvitationRequest;
    const { code, user_id: userIdFromBody, name: nameFromBody } = requestBody;

    // Validate code
    if (!code || code.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Invitation code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Authorization header
    const authHeader = req.headers.get('Authorization');

    // Try to get user from JWT, fallback to user_id from body
    let userId: string | null = userIdFromBody || null;

    if (authHeader) {


      // Extrae el token (quitando "Bearer ")
      const token = authHeader.replace('Bearer ', '');

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

      if (!authError && user) {
        userId = user.id;
        console.log('accept-workspace-invitation: Authenticated user from JWT:', user.id);
      } else {
        console.error('accept-workspace-invitation: JWT validation failed, using user_id from body');
      }
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`accept-workspace-invitation: User ${userId} accepting code ${code}`);



    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate invitation code exists
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('loopops_workspace_invitations')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .single();

    if (invitationError || !invitation) {
      console.error('Invitation code not found:', invitationError);
      return new Response(
        JSON.stringify({ error: 'Invalid invitation code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent users from accepting their own invitations
    if (invitation.invited_by_user_id === userId) {
      console.error(`User ${userId} trying to accept their own invitation`);
      return new Response(
        JSON.stringify({ error: 'Cannot accept your own invitation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code is expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < now) {
      console.error(`Invitation code ${code} expired at ${invitation.expires_at}`);
      return new Response(
        JSON.stringify({ error: 'Invitation code has expired' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if code is already used
    if (invitation.used) {
      console.error(`Invitation code ${code} already used`);
      return new Response(
        JSON.stringify({ error: 'Invitation code has already been used' }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get workspace information
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('loopops_workspaces')
      .select('id, name')
      .eq('id', invitation.workspace_id)
      .single();

    if (workspaceError || !workspace) {
      console.error('Workspace not found:', workspaceError);
      return new Response(
        JSON.stringify({ error: 'Workspace not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user profile exists
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('v2_profile')
      .select('id, email')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch user profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      console.error('User profile not found');
      return new Response(
        JSON.stringify({ error: 'User profile not found. Please complete registration first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate that the invitation email matches the current user's email
    if (invitation.email && profile.email) {
      const invitationEmail = invitation.email.toLowerCase().trim();
      const userEmail = profile.email.toLowerCase().trim();

      if (invitationEmail !== userEmail) {
        console.error(`Email mismatch: invitation is for ${invitationEmail}, but user is ${userEmail}`);
        return new Response(
          JSON.stringify({
            error: 'This invitation was sent to a different email address',
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Email validation passed: ${userEmail} matches invitation email`);
    } else if (invitation.email && !profile.email) {
      console.warn('Invitation has email but user profile does not have email set');
    }

    // Check if user has completed onboarding
    const { data: onboarding, error: onboardingError } = await supabaseAdmin
      .from('v2_onboarding')
      .select('stage, completed')
      .eq('profile_id', userId)
      .maybeSingle();

    if (onboardingError) {
      console.error('Error fetching onboarding status:', onboardingError);
      return new Response(
        JSON.stringify({ error: 'Failed to check onboarding status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine if user needs onboarding
    // CASE A: User needs onboarding if no onboarding record exists OR not completed OR stage < 3
    const needsOnboarding = !onboarding || !onboarding.completed || (onboarding.stage !== null && onboarding.stage < 3);
    const userType = needsOnboarding ? 'new' : 'existing';

    console.log(`User ${userId} is ${userType} user (needs onboarding: ${needsOnboarding})`);

    let onboardingCompleted = false;
    let membership: any;

    if (needsOnboarding) {
      // ========================================================================
      // CASE A: User Needs Onboarding - Execute full onboarding setup
      // ========================================================================
      console.log('CASE A: User needs onboarding - executing full onboarding setup');

      // Validate that name was provided in request
      if (!nameFromBody || nameFromBody.trim() === '') {
        return new Response(
          JSON.stringify({
            error: 'NAME_REQUIRED',
            message: 'User name is required for onboarding. Please provide "name" in the request body.'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Starting onboarding for user ${userId} with name: ${nameFromBody}`);

      // STEP 1: Update profile with user name
      console.log('Step 1: Calling update-profile-v2...');
      try {
        await callEdgeFunction(supabaseAdmin, 'update-profile-v2', {
          name: nameFromBody,
          role: 'Other',
          profilePicture: null,
          user_id: userId,
        });
        console.log('Step 1 completed: Profile updated');
      } catch (error) {
        console.error('update-profile-v2 failed:', error);
        return new Response(
          JSON.stringify({
            error: 'Failed to update profile',
            details: error instanceof Error ? error.message : String(error)
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // STEP 2: Create workspace with generic name
      console.log('Step 2: Calling create-workspace-v2...');
      let createdWorkspaceId: string;
      try {
        const workspaceData = await callEdgeFunction(supabaseAdmin, 'create-workspace-v2', {
          name: 'Workspace',
          role: 'admin',
          user_id: userId,
        });
        createdWorkspaceId = workspaceData.workspace?.id || workspaceData.id;
        console.log(`Step 2 completed: Workspace created with ID: ${createdWorkspaceId}`);
      } catch (error) {
        console.error('create-workspace-v2 failed:', error);
        return new Response(
          JSON.stringify({
            error: 'Failed to create workspace',
            details: error instanceof Error ? error.message : String(error)
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // STEP 3: Create project
      console.log('Step 3: Calling create-project-v2...');
      const { data: invitedProject } = await supabaseAdmin
        .from('loopops_projects')
        .select('id, name')
        .eq('id', invitation.project_id)
        .single();

      const projectName = 'Project';

      let createdProjectId: string;
      try {
        const projectData = await callEdgeFunction(supabaseAdmin, 'create-project-v2', {
          name: projectName,
          workspace_id: createdWorkspaceId,
          user_id: userId,
        });
        createdProjectId = projectData.project?.id || projectData.id;
        console.log(`Step 3 completed: Project created with ID: ${createdProjectId}`);
      } catch (error) {
        console.error('create-project-v2 failed:', error);
        return new Response(
          JSON.stringify({
            error: 'Failed to create project',
            details: error instanceof Error ? error.message : String(error)
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // STEP 4: Setup project loopops (completes remaining onboarding steps)
      console.log('Step 4: Calling setup-project-loopops...');
      try {
        await callEdgeFunction(supabaseAdmin, 'setup-project-loopops', {
          workspace_id: createdWorkspaceId,
          project_id: createdProjectId,
          user_id: userId,
          project_name: projectName,
        });
        console.log('Step 4 completed: Project setup completed successfully');
      } catch (error) {
        console.error('setup-project-loopops failed:', error);
        return new Response(
          JSON.stringify({
            error: 'Failed to setup project',
            details: error instanceof Error ? error.message : String(error)
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // STEP 5: Add user to the INVITED project members (the one from the invitation code)
      console.log('Step 5: Adding user to invited project members...');
      const { data: newMembership, error: membershipError } = await supabaseAdmin
        .from('loopops_project_members')
        .insert({
          project_id: invitation.project_id,
          profile_id: userId,
          role: invitation.role,
          access_type: 'invitation',
        })
        .select()
        .single();

      if (membershipError) {
        console.error('Error creating project membership:', membershipError);
        return new Response(
          JSON.stringify({ error: 'Failed to add user to invited project' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Step 5 completed: User added to invited project');
      membership = newMembership;
      onboardingCompleted = true; // Onboarding is now complete

    } else {
      // ========================================================================
      // CASE B: Existing User - Only add to project
      // ========================================================================
      console.log('CASE B: Existing user - onboarding already completed, adding to project');

      // User has already completed onboarding
      onboardingCompleted = true;

      // Check if user is already a member of this project
      const projectId = invitation.project_id;
      const { data: existingMemberships, error: membershipCheckError } = await supabaseAdmin
        .from('loopops_project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('profile_id', userId);

      // Handle real errors (not "no rows found")
      if (membershipCheckError) {
        console.error('Error checking project membership:', membershipCheckError);
        return new Response(
          JSON.stringify({ error: 'Failed to check project membership' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user is already a member (array has items)
      if (existingMemberships && existingMemberships.length > 0) {
        console.error(`User ${userId} is already a member of project ${projectId}`);
        return new Response(
          JSON.stringify({ error: 'You are already a member of this project' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Add user to project_members (granular access to this specific project)
      const { data: newMembership, error: membershipError } = await supabaseAdmin
        .from('loopops_project_members')
        .insert({
          project_id: projectId,
          profile_id: userId,
          role: invitation.role,
          access_type: 'invitation',
        })
        .select()
        .single();

      if (membershipError) {
        console.error('Error creating project membership:', membershipError);
        return new Response(
          JSON.stringify({ error: 'Failed to add user to project' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      membership = newMembership;
    }

    // Mark invitation code as used
    const { error: markUsedError } = await supabaseAdmin
      .from('loopops_workspace_invitations')
      .update({
        used: true,
        accepted_by_user_id: userId,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id);

    if (markUsedError) {
      console.error('Error marking invitation as used:', markUsedError);
      // Don't fail the request if this fails, membership was already created
    }

    console.log(`Invitation ${code} accepted successfully by user ${userId}`);

    // Get project info for response
    const { data: projectInfo } = await supabaseAdmin
      .from('loopops_projects')
      .select('id, name')
      .eq('id', invitation.project_id)
      .single();

    const response: AcceptInvitationResponse = {
      success: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
      },
      project: {
        id: projectInfo?.id || invitation.project_id,
        name: projectInfo?.name || 'Project',
      },
      membership: {
        id: membership.id,
        project_id: membership.project_id,
        profile_id: membership.profile_id,
        role: membership.role,
      },
      onboarding_completed: onboardingCompleted,
      user_type: userType,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Unexpected error in accept-workspace-invitation:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

