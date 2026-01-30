import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Get coordinator agents (teams) for the workspace
    const { data: coordinatorAgents, error: coordinatorError } = await supabaseClient
      .from('agents')
      .select('*')
      .eq('agent_mode', 'coordinator')
      .or(`workspace_id.eq.${workspace_id},workspace_id.is.null`)
      .order('created_at', { ascending: false });

    if (coordinatorError) {
      console.error('Error fetching coordinator agents:', coordinatorError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch coordinator agents' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For each coordinator agent, get its member agents
    const formattedTeams = await Promise.all(
      coordinatorAgents.map(async (coordinator) => {
        let teamAgents = [];
        
        if (coordinator.members && coordinator.members.length > 0) {
          // Get agents where id is in the coordinator's members array
          const { data: memberAgents, error: memberError } = await supabaseClient
            .from('agents')
            .select('*')
            .in('id', coordinator.members)
            .or(`workspace_id.eq.${workspace_id},workspace_id.is.null`);

          if (memberError) {
            console.error('Error fetching member agents:', memberError);
          } else {
            teamAgents = memberAgents || [];
          }
        }

        return {
          id: coordinator.id,
          name: coordinator.agent_name,
          key: coordinator.key,
          role: coordinator.agent_role,
          model: coordinator.model,
          instructions: coordinator.agent_prompt,
          created_at: coordinator.created_at,
          agents: teamAgents.map(agent => ({
            id: agent.id,
            name: agent.agent_name,
            key: agent.key,
            color: agent.color,
            role: agent.agent_role,
            model: agent.model,
            prompt: agent.agent_prompt,
            created_at: agent.created_at
          }))
        };
      })
    );

    return new Response(
      JSON.stringify({ teams: formattedTeams }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get_workspace_teams_v2 function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});