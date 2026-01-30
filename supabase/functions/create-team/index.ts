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

    const { agent_name, agent_prompt, workspace_id, model, members = [] } = await req.json();

    // Validate required fields
    if (!agent_name || !workspace_id) {
      return new Response(
        JSON.stringify({ error: 'agent_name and workspace_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate agent_id from agent_name (replace spaces with underscores, lowercase)
    const agent_id = agent_name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    // Validate that all member agents exist and belong to the same workspace
    if (members && members.length > 0) {
      const { data: memberAgents, error: memberError } = await supabaseClient
        .from('agents')
        .select('id, workspace_id')
        .in('id', members);

      if (memberError) {
        console.error('Error validating member agents:', memberError);
        return new Response(
          JSON.stringify({ error: 'Error validating member agents' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if all member agents exist and belong to the same workspace or have no workspace
      const invalidMembers = members.filter(memberId => 
        !memberAgents.some(agent => 
          agent.id === memberId && 
          (agent.workspace_id === workspace_id || agent.workspace_id === null)
        )
      );

      if (invalidMembers.length > 0) {
        return new Response(
          JSON.stringify({ error: `Invalid member agents: ${invalidMembers.join(', ')}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create the team (stored as an agent with agent_mode = 'coordinator')
    const { data: team, error } = await supabaseClient
      .from('agents')
      .insert({
        agent_id,
        agent_name,
        agent_role: 'coordinator',
        agent_prompt,
        workspace_id,
        model,
        agent_mode: 'coordinator',
        members
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating team:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ team }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-team function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});