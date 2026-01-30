import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from "../_shared/cors.ts";

interface CreateProjectRequest {
  name: string;
  workspace_id: string;
  user_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body first
    const requestBody = await req.json() as CreateProjectRequest;
    const { name, workspace_id, user_id } = requestBody;
    
    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    
    // Try to get user from JWT, fallback to user_id from body
    let userId: string | null = user_id || null;
    
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

      if (!authError && user) {
        userId = user.id;
        console.log('create-project-v2: Authenticated user from JWT:', user.id);
      } else {
        console.error('create-project-v2: JWT validation failed, using user_id from body');
      }
    }
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'user_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!name || name.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Project name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!workspace_id || workspace_id.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Workspace ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating project "${name}" for workspace ${workspace_id} by user ${userId}`);

    // Create service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user owns this workspace
    // Note: Use dot notation for cross-schema tables (matches setup-project-loopops)
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('loopops_workspaces')
      .select('id, name, owner_id')
      .eq('id', workspace_id)
      .eq('owner_id', userId)
      .maybeSingle();

    if (workspaceError || !workspace) {
      console.error('User does not own this workspace:', workspaceError);
      return new Response(
        JSON.stringify({ error: 'You do not have access to this workspace' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the project in loopops schema
    // Note: Use dot notation for cross-schema tables (matches setup-project-loopops)
    const { data: project, error: projectError } = await supabaseAdmin
      .from('loopops_projects')
      .insert({
        name: name.trim(),
        workspace_id: workspace_id,
        status: 'planning'
      })
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      return new Response(
        JSON.stringify({ error: `Failed to create project: ${projectError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Project created with ID: ${project.id}`);

    // Setup LoopOps project (create stages, agents, threads, buckets, etc.)
    console.log('Setting up LoopOps project...');
    try {
      const { data: loopopsSetup, error: loopopsError } = await supabaseAdmin.functions.invoke('setup-project-loopops', {
        body: {
          workspace_id: workspace_id,
          project_id: project.id,
          user_id: userId,
          project_name: name.trim()
        }
      });

      if (loopopsError) {
        console.error('Error setting up LoopOps project:', loopopsError);
        
        // Extract error message from response body if available
        let errorMessage = 'Unknown error';
        if (loopopsError.context && loopopsError.context instanceof Response) {
          try {
            const errorBody = await loopopsError.context.json();
            errorMessage = errorBody.error || errorBody.message || JSON.stringify(errorBody);
          } catch (parseError) {
            try {
              errorMessage = await loopopsError.context.text() || loopopsError.message || 'Unknown error';
            } catch (textError) {
              errorMessage = loopopsError.message || JSON.stringify(loopopsError);
            }
          }
        } else if (loopopsError.message) {
          errorMessage = loopopsError.message;
        } else {
          errorMessage = JSON.stringify(loopopsError);
        }
        
        return new Response(
          JSON.stringify({ 
            error: `Failed to setup LoopOps project: ${errorMessage}` 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('LoopOps project setup completed:', loopopsSetup);
    } catch (loopopsSetupError) {
      console.error('Exception during LoopOps setup:', loopopsSetupError);
      return new Response(
        JSON.stringify({ 
          error: `Failed to setup LoopOps project: ${loopopsSetupError instanceof Error ? loopopsSetupError.message : 'Unknown error occurred'}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update onboarding to stage 3 and mark as completed
    const { data: onboarding, error: onboardingError } = await supabaseAdmin
      .from('v2_onboarding')
      .update({ 
        stage: 3,
        completed: true,
      })
      .eq('profile_id', userId)
      .select()
      .single();

    if (onboardingError) {
      console.error('Error updating onboarding:', onboardingError);
      // Don't fail the request if onboarding update fails
      console.warn('Project created but onboarding update failed');
    } else {
      console.log(`Onboarding completed for user ${userId}`);
    }

    return new Response(
      JSON.stringify({
        project: {
          id: project.id,
          name: project.name,
          workspace_id: project.workspace_id,
          status: project.status,
          created_at: project.created_at,
        },
        onboarding: onboarding ? {
          stage: onboarding.stage,
          completed: onboarding.completed,
        } : null,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in create-project-v2 function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
