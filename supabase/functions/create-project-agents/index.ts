import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

interface CreateProjectAgentsRequest {
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

    const { project_id } = await req.json() as CreateProjectAgentsRequest;

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

    // Get all project stages for this project with their template_id
    const { data: projectStages, error: stagesError } = await supabase
      .from('loopops_project_stages')
      .select('id, template_id')
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

    // Check if agents already exist for this project
    const { data: existingAgents, error: existingError } = await supabase
      .from('loopops_project_agents')
      .select('id')
      .in('project_stage_id', projectStages.map(s => s.id));

    if (existingError) {
      console.error('Error checking existing agents:', existingError);
      return new Response(
        JSON.stringify({ error: `Failed to check existing agents: ${existingError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingAgents && existingAgents.length > 0) {
      console.log(`Project agents already exist for project ${project_id}`);
      return new Response(
        JSON.stringify({
          success: true,
          project_id,
          agents: existingAgents,
          message: 'Project agents already exist'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique stage template IDs from project stages
    const stageTemplateIds = [...new Set(projectStages.map(s => s.template_id).filter(Boolean))];

    // Fetch agent templates that match the stage templates via stage_template_id
    const { data: agentTemplates, error: templatesError } = await supabase
      .from('loopops_global_agent_templates')
      .select('id, role_name, system_prompt, default_tools, type, stage_template_id')
      .in('stage_template_id', stageTemplateIds)
      .not('stage_template_id', 'is', null);

    if (templatesError) {
      console.error('Error fetching agent templates:', templatesError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch agent templates: ${templatesError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!agentTemplates || agentTemplates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No agent templates found for the project stages. Please ensure agent templates are linked to stage templates via stage_template_id.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a map of stage_template_id -> agent_template for quick lookup
    const agentTemplateMap = new Map<string, typeof agentTemplates[0]>();
    for (const agent of agentTemplates) {
      if (agent.stage_template_id) {
        // If multiple agents exist for the same stage, we take the first one
        // (or you could add logic to prioritize certain types)
        if (!agentTemplateMap.has(agent.stage_template_id)) {
          agentTemplateMap.set(agent.stage_template_id, agent);
        }
      }
    }

    console.log(`Creating agents for ${projectStages.length} stages`);

    // Create one agent per stage based on stage template matching
    const agentsToInsert: Array<{
      project_stage_id: string;
      template_id: string;
      custom_prompt_override: null;
      custom_tools_override: null;
    }> = [];
    
    // Track which stage IDs we've already added to prevent duplicates
    const addedStageIds = new Set<string>();

    for (const stage of projectStages) {
      if (!stage.template_id) {
        console.warn(`Stage ${stage.id} has no template_id, skipping`);
        continue;
      }
      
      // Skip if we've already added an agent for this stage (safety check)
      if (addedStageIds.has(stage.id)) {
        console.warn(`Agent already added for stage ${stage.id}, skipping duplicate`);
        continue;
      }

      const agentTemplate = agentTemplateMap.get(stage.template_id);
      
      if (!agentTemplate) {
        console.warn(`No agent template found for stage template ${stage.template_id} (stage ${stage.id})`);
        continue;
      }

      agentsToInsert.push({
        project_stage_id: stage.id,
        template_id: agentTemplate.id!,
        custom_prompt_override: null,
        custom_tools_override: null
      });
      
      // Mark this stage as processed
      addedStageIds.add(stage.id);
    }

    if (agentsToInsert.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No matching agent templates found for any project stage. Please ensure agent templates have stage_template_id set and match the stage templates.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: createdAgents, error: createError } = await supabase
      .from('loopops_project_agents')
      .insert(agentsToInsert)
      .select();

    if (createError) {
      console.error('Error creating project agents:', createError);
      return new Response(
        JSON.stringify({ error: `Failed to create project agents: ${createError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully created ${createdAgents.length} project agents`);

    return new Response(
      JSON.stringify({
        success: true,
        project_id,
        agents: createdAgents,
        count: createdAgents.length,
        message: 'Project agents created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-project-agents function:', error);
    
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

