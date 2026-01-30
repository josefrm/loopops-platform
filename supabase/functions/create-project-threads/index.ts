import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

interface CreateProjectThreadsRequest {
  project_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { project_id } = await req.json() as CreateProjectThreadsRequest;

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: project_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if project exists
    const { data: project, error: projectError } = await supabase
      .from('loopops_projects')
      .select('id')
      .eq('id', project_id)
      .maybeSingle();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: `Project not found: ${project_id}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if threads already exist for this project
    const { data: existingThreads, error: existingError } = await supabase
      .from('loopops_threads')
      .select('id')
      .eq('project_id', project_id);

    if (existingError) {
      console.error('Error checking existing threads:', existingError);
      return new Response(
        JSON.stringify({ error: `Failed to check existing threads: ${existingError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingThreads && existingThreads.length > 0) {
      console.log(`Project threads already exist for project ${project_id}`);
      return new Response(
        JSON.stringify({
          success: true,
          project_id,
          threads: existingThreads,
          message: 'Project threads already exist'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all project stages for this project
    const { data: projectStages, error: stagesError } = await supabase
      .from('loopops_project_stages')
      .select('id')
      .eq('project_id', project_id);

    if (stagesError) {
      console.error('Error fetching project stages:', stagesError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch project stages: ${stagesError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!projectStages || projectStages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No project stages found. Please create stages first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating threads for project ${project_id}: ${projectStages.length} stage threads + 1 project thread + 1 Figma thread`);

    // Prepare threads to insert
    const threadsToInsert: Array<{
      project_id: string;
      stage_id: string | null;
      type: 'project_main' | 'stage_main' | 'plugin_stream';
      is_read_only: boolean;
    }> = [];

    // Create one thread per stage (type: stage_main)
    for (const stage of projectStages) {
      threadsToInsert.push({
        project_id: project_id,
        stage_id: stage.id,
        type: 'stage_main',
        is_read_only: true
      });
    }

    // Create one thread for project (type: project_main, stage_id = NULL)
    threadsToInsert.push({
      project_id: project_id,
      stage_id: null,
      type: 'project_main',
      is_read_only: true
    });

    // Create one thread for Figma plugin (type: plugin_stream, stage_id = NULL)
    threadsToInsert.push({
      project_id: project_id,
      stage_id: null,
      type: 'plugin_stream',
      is_read_only: true
    });

    const { data: createdThreads, error: createError } = await supabase
      .from('loopops_threads')
      .insert(threadsToInsert)
      .select();

    if (createError) {
      console.error('Error creating project threads:', createError);
      return new Response(
        JSON.stringify({ error: `Failed to create project threads: ${createError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully created ${createdThreads.length} project threads`);

    return new Response(
      JSON.stringify({
        success: true,
        project_id,
        threads: createdThreads,
        count: createdThreads.length,
        message: 'Project threads created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-project-threads function:', error);
    
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

