import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

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
      },
    );

    const {
      agent_id,
      agent_name,
      agent_role,
      agent_prompt,
      model,
      members,
      tools,
    } = await req.json();

    if (!agent_id) {
      return new Response(JSON.stringify({ error: 'agent_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build update object
    const updateData: any = {};
    if (agent_name !== undefined) updateData.agent_name = agent_name;
    if (agent_role !== undefined) updateData.agent_role = agent_role;
    if (agent_prompt !== undefined) updateData.agent_prompt = agent_prompt;
    if (model !== undefined) updateData.model = model;
    if (members !== undefined) updateData.members = members;
    if (tools !== undefined) updateData.tools = tools;

    // Update the agent
    const { data: agent, error } = await supabaseClient
      .from('agents')
      .update(updateData)
      .eq('id', agent_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating agent:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ agent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in update-agent function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
