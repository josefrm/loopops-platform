import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

interface CreateProjectStagesRequest {
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

    const { project_id } = await req.json() as CreateProjectStagesRequest;

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

    // Check if stages already exist for this project
    const { data: existingStages, error: existingError } = await supabase
      .from('loopops_project_stages')
      .select('id')
      .eq('project_id', project_id);

    if (existingError) {
      console.error('Error checking existing stages:', existingError);
      return new Response(
        JSON.stringify({ error: `Failed to check existing stages: ${existingError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingStages && existingStages.length > 0) {
      console.log(`Project stages already exist for project ${project_id}`);
      return new Response(
        JSON.stringify({
          success: true,
          project_id,
          stages: existingStages,
          message: 'Project stages already exist'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all stage templates, ordered by default_order_index
    const { data: templates, error: templatesError } = await supabase
      .from('loopops_global_stage_templates')
      .select('id, name, description, default_order_index')
      .order('default_order_index', { ascending: true, nullsFirst: false });

    if (templatesError) {
      console.error('Error fetching stage templates:', templatesError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch stage templates: ${templatesError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!templates || templates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No stage templates found. Please create templates first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating ${templates.length} project stages for project ${project_id}`);

    // Create project stages from templates
    const stagesToInsert = templates.map(template => ({
      project_id: project_id,
      template_id: template.id,
      status: 'pending' as const,
      custom_settings: {}
    }));

    const { data: createdStages, error: createError } = await supabase
      .from('loopops_project_stages')
      .insert(stagesToInsert)
      .select();

    if (createError) {
      console.error('Error creating project stages:', createError);
      return new Response(
        JSON.stringify({ error: `Failed to create project stages: ${createError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully created ${createdStages.length} project stages`);

    return new Response(
      JSON.stringify({
        success: true,
        project_id,
        stages: createdStages,
        count: createdStages.length,
        message: 'Project stages created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-project-stages function:', error);
    
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

