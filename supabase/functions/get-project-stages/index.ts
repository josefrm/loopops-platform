import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface GetProjectStagesRequest {
  project_id: string;
}

interface ProjectStage {
  id: string;
  name: string;
  priority: number;
  status: string;
  template_id: string;
  project_id: string;
}

interface GetProjectStagesResponse {
  stages: ProjectStage[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { project_id } = (await req.json()) as GetProjectStagesRequest;

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: project_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
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
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Fetch project stages for this project
    const { data: projectStages, error: stagesError } = await supabase
      .from('loopops_project_stages')
      .select('id, project_id, template_id, status')
      .eq('project_id', project_id);

    if (stagesError) {
      console.error('Error fetching project stages:', stagesError);
      return new Response(
        JSON.stringify({
          error: `Failed to fetch project stages: ${stagesError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!projectStages || projectStages.length === 0) {
      return new Response(
        JSON.stringify({
          stages: [],
          message: 'No project stages found for this project',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Get unique template IDs
    const templateIds = [
      ...new Set(projectStages.map((stage) => stage.template_id)),
    ];

    // Fetch stage templates for those template IDs
    const { data: templates, error: templatesError } = await supabase
      .from('loopops_global_stage_templates')
      .select('id, name, description, default_order_index')
      .in('id', templateIds);

    if (templatesError) {
      console.error('Error fetching stage templates:', templatesError);
      return new Response(
        JSON.stringify({
          error: `Failed to fetch stage templates: ${templatesError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Create a map of template_id to template for quick lookup
    const templateMap = new Map(
      (templates || []).map((template) => [template.id, template]),
    );

    // Map project stages with template data
    const stages: ProjectStage[] = projectStages
      .map((stage) => {
        const template = templateMap.get(stage.template_id);

        if (!template) {
          console.warn(
            `Template not found for stage ${stage.id} with template_id ${stage.template_id}`,
          );
          return null;
        }

        return {
          id: stage.id,
          name: template.name,
          priority: template.default_order_index ?? 999, // Use 999 as fallback for null values
          status: stage.status,
          template_id: stage.template_id,
          project_id: stage.project_id,
        };
      })
      .filter((stage): stage is ProjectStage => stage !== null) // Filter out null stages
      .sort((a, b) => a.priority - b.priority); // Sort by priority (default_order_index)

    console.log(
      `Successfully fetched ${stages.length} project stages for project ${project_id}`,
    );

    const response: GetProjectStagesResponse = {
      stages,
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control':
          'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error) {
    console.error('Error in get-project-stages function:', error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
