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

    const { agent_name, agent_prompt, workspace_id, model, key, color, tools } =
      await req.json();

    // Validate required fields
    if (!agent_name || !workspace_id) {
      return new Response(
        JSON.stringify({ error: 'agent_name and workspace_id are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Generate agent_id from agent_name (replace spaces with underscores, lowercase)
    const agent_id = agent_name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    // Create the agent
    const { data: agent, error } = await supabaseClient
      .from('agents')
      .insert({
        agent_id,
        agent_name,
        agent_role: null,
        agent_prompt,
        workspace_id,
        model,
        agent_mode: null,
        key,
        color,
        members: null,
        tools,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating agent:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ agent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in create-agent function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
