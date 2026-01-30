import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-attempt, x-max-retries',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Check if request has content before parsing JSON
    let requestBody;
    try {
      const contentLength = req.headers.get('content-length');
      if (contentLength === '0' || contentLength === null) {
        requestBody = {};
      } else {
        requestBody = await req.json();
      }
    } catch (jsonError) {
      console.error('Error parsing JSON:', jsonError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { workspace_id } = requestBody;

    if (!workspace_id) {
      return new Response(
        JSON.stringify({ error: 'workspace_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get teams for the workspace with their associated agents
    const { data: teams, error: teamsError } = await supabaseClient
      .from('teams')
      .select(`
        id,
        name,
        key,
        role,
        model,
        instructions,
        created_at,
        team_agents!inner (
          id,
          custom_agent_id,
          agent_id,
          custom_agents (
            id,
            name,
            key,
            color,
            model,
            prompt,
            created_at
          ),
          agents (
            id,
            agent_name,
            agent_role,
            model,
            agent_prompt,
            key,
            color,
            created_at
          )
        )
      `)
      .eq('workspace_id', workspace_id)
      .eq('team_agents.workspace_id', workspace_id);

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch teams' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform the data to match the required format
    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      key: team.key,
      role: team.role,
      model: team.model,
      instructions: team.instructions,
      created_at: team.created_at,
      agents: team.team_agents.map(ta => {
        if (ta.custom_agents) {
          // Custom agent
          return {
            id: ta.custom_agents.id,
            name: ta.custom_agents.name,
            key: ta.custom_agents.key,
            color: ta.custom_agents.color,
            role: null,
            model: ta.custom_agents.model,
            prompt: ta.custom_agents.prompt,
            created_at: ta.custom_agents.created_at
          };
        } else if (ta.agents) {
          // Original agent
          return {
            id: ta.agents.id,
            name: ta.agents.agent_name,
            key: ta.agents.key,
            color: ta.agents.color,
            role: ta.agents.agent_role,
            model: ta.agents.model,
            prompt: ta.agents.agent_prompt,
            created_at: ta.agents.created_at
          };
        }
        return null;
      }).filter(agent => agent !== null)
    }));

    return new Response(
      JSON.stringify({ teams: formattedTeams }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get_workspace_teams function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});