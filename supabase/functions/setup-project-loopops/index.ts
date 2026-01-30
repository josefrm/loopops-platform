import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

interface SetupProjectLoopopsRequest {
  workspace_id: string; // v2 workspace_id
  project_id: string; // v2 project_id
  user_id: string;
  project_name: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { workspace_id, project_id, user_id, project_name } = await req.json() as SetupProjectLoopopsRequest;

    if (!workspace_id || !project_id || !user_id || !project_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: workspace_id, project_id, user_id, project_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Setting up LoopOps project for v2 project ${project_id}`);

    // Step 1: Get loopops workspace info
    const { data: v2Workspace, error: v2WorkspaceError } = await supabaseAdmin
      .from('loopops_workspaces')
      .select('id, name')
      .eq('id', workspace_id)
      .maybeSingle();

    if (v2WorkspaceError || !v2Workspace) {
      console.error('Error fetching loopops workspace:', v2WorkspaceError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch loopops workspace: ${v2WorkspaceError?.message || 'Not found'}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Create or get loopops workspace
    let loopopsWorkspaceId: string;
    const { data: existingLoopopsWorkspace, error: checkWorkspaceError } = await supabaseAdmin
      .from('loopops_workspaces')
      .select('id')
      .eq('id', workspace_id) // Use same ID for consistency
      .maybeSingle();

    if (checkWorkspaceError && checkWorkspaceError.code !== 'PGRST116') {
      console.error('Error checking loopops workspace:', checkWorkspaceError);
      return new Response(
        JSON.stringify({ error: `Failed to check loopops workspace: ${checkWorkspaceError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingLoopopsWorkspace) {
      loopopsWorkspaceId = existingLoopopsWorkspace.id;
      console.log(`Using existing loopops workspace: ${loopopsWorkspaceId}`);
    } else {
      // Create new loopops workspace with same ID as v2
      const { data: newWorkspace, error: createWorkspaceError } = await supabaseAdmin
        .from('loopops_workspaces')
        .insert({
          id: workspace_id, // Use same ID as v2
          name: v2Workspace.name || 'Workspace',
          owner_id: user_id
        })
        .select()
        .single();

      if (createWorkspaceError) {
        console.error('Error creating loopops workspace:', createWorkspaceError);
        return new Response(
          JSON.stringify({ error: `Failed to create loopops workspace: ${createWorkspaceError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      loopopsWorkspaceId = newWorkspace.id;
      console.log(`Created loopops workspace: ${loopopsWorkspaceId}`);
    }

    // Step 3: Create loopops project (use same ID as v2 for consistency)
    let loopopsProjectId: string;
    const { data: existingLoopopsProject, error: checkProjectError } = await supabaseAdmin
      .from('loopops_projects')
      .select('id')
      .eq('id', project_id)
      .maybeSingle();

    if (checkProjectError && checkProjectError.code !== 'PGRST116') {
      console.error('Error checking loopops project:', checkProjectError);
      return new Response(
        JSON.stringify({ error: `Failed to check loopops project: ${checkProjectError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingLoopopsProject) {
      loopopsProjectId = existingLoopopsProject.id;
      console.log(`Using existing loopops project: ${loopopsProjectId}`);
    } else {
      const { data: newProject, error: createProjectError } = await supabaseAdmin
        .from('loopops_projects')
        .insert({
          id: project_id, // Use same ID as v2
          workspace_id: loopopsWorkspaceId,
          name: project_name,
          status: 'planning'
        })
        .select()
        .single();

      if (createProjectError) {
        console.error('Error creating loopops project:', createProjectError);
        return new Response(
          JSON.stringify({ error: `Failed to create loopops project: ${createProjectError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      loopopsProjectId = newProject.id;
      console.log(`Created loopops project: ${loopopsProjectId}`);
    }

    // Helper function to call edge functions using supabaseAdmin.functions.invoke
    const callEdgeFunction = async (functionName: string, body: any) => {
      console.log(`Calling edge function: ${functionName}`, JSON.stringify(body));
      const { data, error } = await supabaseAdmin.functions.invoke(functionName, {
        body
      });

      if (error) {
        // Log full error object for debugging
        console.error(`Function ${functionName} failed with error:`, JSON.stringify(error, null, 2));

        // Extract error message - try to read from response body first
        let errorMessage = 'Unknown error';
        
        // Check if error has a context with a Response object (FunctionsHttpError)
        if (error.context && error.context instanceof Response) {
          try {
            const errorBody = await error.context.json();
            if (errorBody.error) {
              errorMessage = typeof errorBody.error === 'string' ? errorBody.error : JSON.stringify(errorBody.error);
            } else if (errorBody.message) {
              errorMessage = errorBody.message;
            } else {
              errorMessage = JSON.stringify(errorBody);
            }
          } catch (parseError) {
            // If we can't parse the response, try to get text
            try {
              const errorText = await error.context.text();
              errorMessage = errorText || error.message || 'Unknown error';
            } catch (textError) {
              // Fall back to error.message
              errorMessage = error.message || 'Unknown error';
            }
          }
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.error) {
          errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
        } else {
          errorMessage = JSON.stringify(error);
        }

        throw new Error(`Function ${functionName} failed: ${errorMessage}`);
      }

      console.log(`Function ${functionName} succeeded:`, JSON.stringify(data));
      return data;
    };

    // Step 4: Create Mindspace bucket
    console.log('Step 4: Creating Mindspace bucket...');
    let mindspaceData;
    try {
      mindspaceData = await callEdgeFunction('create-mindspace-bucket', {
        workspace_id: loopopsWorkspaceId,
        project_id: loopopsProjectId,
        user_id: user_id
      });
    } catch (error) {
      console.error('Error creating mindspace bucket:', error);
      return new Response(
        JSON.stringify({ error: `Failed to create mindspace bucket: ${error instanceof Error ? error.message : 'Unknown error'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Create project stages
    console.log('Step 5: Creating project stages...');
    let stagesData;
    try {
      stagesData = await callEdgeFunction('create-project-stages', {
        project_id: loopopsProjectId
      });
    } catch (error) {
      console.error('Error creating project stages:', error);
      return new Response(
        JSON.stringify({ error: `Failed to create project stages: ${error instanceof Error ? error.message : 'Unknown error'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 6: Create project agents
    console.log('Step 6: Creating project agents...');
    let agentsData;
    try {
      agentsData = await callEdgeFunction('create-project-agents', {
        project_id: loopopsProjectId
      });
    } catch (error) {
      console.error('Error creating project agents:', error);
      return new Response(
        JSON.stringify({ error: `Failed to create project agents: ${error instanceof Error ? error.message : 'Unknown error'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 7: Create project threads
    console.log('Step 7: Creating project threads...');
    let threadsData;
    try {
      threadsData = await callEdgeFunction('create-project-threads', {
        project_id: loopopsProjectId
      });
    } catch (error) {
      console.error('Error creating project threads:', error);
      return new Response(
        JSON.stringify({ error: `Failed to create project threads: ${error instanceof Error ? error.message : 'Unknown error'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 8: Create stage buckets
    console.log('Step 8: Creating stage buckets...');
    let stageBucketsData;
    try {
      stageBucketsData = await callEdgeFunction('create-stage-buckets', {
        project_id: loopopsProjectId
      });
    } catch (error) {
      console.error('Error creating stage buckets:', error);
      return new Response(
        JSON.stringify({ error: `Failed to create stage buckets: ${error instanceof Error ? error.message : 'Unknown error'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 9: Create project bucket
    console.log('Step 9: Creating project bucket...');
    let projectBucketData;
    try {
      projectBucketData = await callEdgeFunction('create-project-bucket', {
        project_id: loopopsProjectId
      });
    } catch (error) {
      console.error('Error creating project bucket:', error);
      return new Response(
        JSON.stringify({ error: `Failed to create project bucket: ${error instanceof Error ? error.message : 'Unknown error'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 10: Mark onboarding as completed
    console.log('Step 10: Marking onboarding as completed...');
    try {
      const { error: onboardingError } = await supabaseAdmin
        .from('v2_onboarding')
        .update({
          stage: 3,
          completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('profile_id', user_id);

      if (onboardingError) {
        console.error('Error marking onboarding as completed:', onboardingError);
        // Don't fail the whole operation if this fails
      } else {
        console.log('Successfully marked onboarding as completed');
      }
    } catch (error) {
      console.error('Error updating onboarding status:', error);
      // Don't fail the whole operation if this fails
    }

    console.log(`Successfully set up LoopOps project ${loopopsProjectId}`);

    return new Response(
      JSON.stringify({
        success: true,
        loopops_workspace_id: loopopsWorkspaceId,
        loopops_project_id: loopopsProjectId,
        v2_workspace_id: workspace_id,
        v2_project_id: project_id,
        message: 'LoopOps project setup completed successfully',
        steps: {
          mindspace_bucket: mindspaceData,
          stages: stagesData,
          agents: agentsData,
          threads: threadsData,
          stage_buckets: stageBucketsData,
          project_bucket: projectBucketData
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in setup-project-loopops function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

