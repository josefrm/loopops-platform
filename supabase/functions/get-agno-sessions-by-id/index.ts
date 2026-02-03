import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Parse request body with error handling
    let requestBody;
    try {
      const bodyText = await req.text();
      if (!bodyText || bodyText.trim() === '') {
        return new Response(
          JSON.stringify({
            error: 'Request body is empty',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON in request body',
          details: parseError instanceof Error ? parseError.message : String(parseError),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const {
      user_id,
      workspace_id,
      project_id,
      component_id,
      session_id,
      page,
      limit
    } = requestBody;

    // Validate: need either (user_id + workspace_id + project_id) OR session_id
    if (!session_id && (!user_id || !workspace_id || !project_id)) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameters: either session_id OR (user_id, workspace_id, project_id) are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Set defaults for pagination
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 20;

    console.log(
      `Querying chat_history - session_id: ${session_id || 'null'}, user_id: ${user_id || 'null'}, workspace_id: ${workspace_id || 'null'}, project_id: ${project_id || 'null'}, component_id: ${component_id || 'null'}, page: ${pageNum}, limit: ${limitNum}`,
    );

    const { data: messages, error: rpcError } = await supabase.rpc('get_chat_history', {
      p_user_id: user_id || null,
      p_workspace_id: workspace_id || null,
      p_project_id: project_id || null,
      p_component_id: component_id || null,
      p_session_id: session_id || null,
      p_page: pageNum,
      p_limit: limitNum,
    });

    if (rpcError) {
      console.error('Error calling get_chat_history RPC:', JSON.stringify(rpcError, null, 2));
      return new Response(
        JSON.stringify({
          error: 'Failed to query chat history',
          details: rpcError.message || JSON.stringify(rpcError),
          code: rpcError.code,
          hint: rpcError.hint || 'The get_chat_history PostgreSQL function must be created. Run: supabase db push',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const results = messages || [];

    // Extract total_count from first result
    const totalCount = results.length > 0 && results[0].total_count
      ? parseInt(results[0].total_count, 10)
      : 0;

    // Map results to clean format
    const chatHistory = results.map((msg: any) => ({
      id: msg.message_id,
      session_id: msg.session_id,
      session_name: msg.session_name,
      stage_name: msg.stage_name,
      role: msg.role,
      content: msg.content,
      created_at: msg.created_at,
      files: msg.files,
      metrics: msg.metrics,
      provider_data: msg.provider_data,
      is_plugin: msg.is_plugin,
      chip_name: msg.chip_name,
      from_history: false,
      stop_after_tool_call: false,
    }));

    console.log('chat_history results:', chatHistory.length);

    return new Response(
      JSON.stringify({
        data: chatHistory,
        meta: {
          total_count: totalCount,
          page: pageNum,
          limit: limitNum,
          total_pages: Math.ceil(totalCount / limitNum),
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});