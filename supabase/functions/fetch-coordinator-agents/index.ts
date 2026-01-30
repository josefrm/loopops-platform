
// Define CORS headers directly in the function to avoid import issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  console.log('Function invoked with method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    console.log('Processing coordinator agents request...');
    
    // Create Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.7.1');
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch only coordinator agents from the database
    console.log('Fetching coordinator agents from database...');
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('agent_mode', 'coordinator')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      throw new Error(`Database query failed: ${error.message}`);
    }

    console.log(`Successfully fetched ${agents?.length || 0} coordinator agents from database`);

    // Map database agents to expected format
    const mappedAgents = agents?.map((agent) => ({
      id: agent.agent_id || agent.id,
      agent_name: agent.agent_name,
      agent_role: agent.agent_role,
      members: agent.members || [],
      agent_mode: agent.agent_mode,
      tools: agent.tools || [],
      agent_prompt: agent.agent_prompt,
    })) || [];

    console.log('Successfully mapped coordinator agents data');

    const responseData = { 
      success: true,
      agents: mappedAgents,
      timestamp: new Date().toISOString()
    };

    console.log('Returning response:', JSON.stringify(responseData));

    return new Response(
      JSON.stringify(responseData),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in fetch-coordinator-agents:', error);
    console.error('Error stack:', error.stack);
    
    const errorResponse = { 
      success: false,
      error: 'Failed to fetch agents',
      message: error.message,
      timestamp: new Date().toISOString()
    };

    console.log('Returning error response:', JSON.stringify(errorResponse));
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
