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

    const { user_id, workspace_id, project_id, component_id, page, limit } = requestBody;

    // Validate required parameters (component_id is now optional)
    if (!user_id || !workspace_id || !project_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required parameters: user_id, workspace_id, and project_id are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Set defaults for pagination
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : 1;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10)) : 10;

    console.log(
      `Querying agno_sessions for user_id: ${user_id}, workspace_id: ${workspace_id}, project_id: ${project_id}, component_id: ${component_id || 'null (all sessions)'}, page: ${pageNum}, limit: ${limitNum}`,
    );

    // Query ai.agno_sessions table
    // Since the table is in the 'ai' schema, we need to explicitly reference it
    // We'll use a PostgreSQL function via RPC that queries ai.agno_sessions directly
    const { data: rpcSessions, error: rpcError } = await supabase.rpc('get_agno_sessions', {
      p_user_id: user_id,
      p_workspace_id: workspace_id,
      p_project_id: project_id,
      p_component_id: component_id || null,
      p_page: pageNum,
      p_limit: limitNum,
    });

    if (rpcError) {
      console.error('Error calling get_agno_sessions RPC:', JSON.stringify(rpcError, null, 2));
      return new Response(
        JSON.stringify({
          error: 'Failed to query ai.agno_sessions',
          details: rpcError.message || JSON.stringify(rpcError),
          code: rpcError.code,
          hint: rpcError.hint || 'The get_agno_sessions PostgreSQL function must be created. Run the migration: supabase db push --linked',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // The function returns { session_data: JSONB, stage_name: TEXT, total_count: BIGINT }
    // Parse the session_data and merge with stage_name
    const rpcResults = rpcSessions || [];
    
    // Extract total_count from first result (all rows have the same total_count)
    const totalCount = rpcResults.length > 0 && rpcResults[0].total_count 
      ? parseInt(rpcResults[0].total_count, 10) 
      : 0;
    
    const sessions = rpcResults.map((result: any) => {
      // Handle JSONB - it might be a string that needs parsing, or already an object
      let session: any = {};
      if (result.session_data) {
        if (typeof result.session_data === 'string') {
          try {
            session = JSON.parse(result.session_data);
          } catch (e) {
            console.error('Error parsing session_data JSONB:', e);
            session = {};
          }
        } else {
          session = result.session_data;
        }
      }
      // Add stage_name to the session object
      if (result.stage_name !== null && result.stage_name !== undefined) {
        session.stage_name = result.stage_name;
      }
      return session;
    });
    
    console.log(`Retrieved ${sessions.length} sessions from ai.agno_sessions via RPC function (total: ${totalCount})`);

    // Extract session name and chat_history from the run field
    // Transform sessions to match the expected response structure
    const startTime = Date.now();
    const transformedSessions = (sessions || []).map((session: any) => {
      let sessionName = 'Untitled Session';
      let chatHistory: any[] = [];
      
      try {
        // Extract chat_history from session.runs array
        // Each run has a messages array that contains the chat history
        const runs = session.runs || [];
        
        console.log(`Session ${session.id} - runs array length:`, runs.length);
        
        // Build chat_history from all runs
        // Iterate through all runs to collect messages from long conversations that may be split across multiple runs
        if (runs.length > 0) {
          // Track seen message IDs to remove duplicates
          const seenMessageIds = new Set<string>();
          
          runs.forEach((run: any, runIndex: number) => {
            // Check if run has messages array directly
            if (run.messages && Array.isArray(run.messages)) {
              // Use messages directly from the run
              run.messages.forEach((msg: any, msgIndex: number) => {
                if (msg && (msg.content || msg.agent_response || msg.text)) {
                  const messageRole = msg.role || 'user';
                  // Only include messages with role 'user' or 'assistant'
                  if (messageRole === 'user' || messageRole === 'assistant') {
                    const messageId = msg.id || `msg-${runIndex}-${msgIndex}`;
                    
                    // Skip if we've already seen this message ID
                    if (seenMessageIds.has(messageId)) {
                      return;
                    }
                    seenMessageIds.add(messageId);
                    
                    const chatMessage: any = {
                      id: messageId,
                      content: msg.content || msg.agent_response || msg.text || '',
                      role: messageRole,
                      ...(msg.from_history !== undefined && { from_history: msg.from_history }),
                      ...(msg.stop_after_tool_call !== undefined && { stop_after_tool_call: msg.stop_after_tool_call }),
                      ...(msg.meta_data && { meta_data: msg.meta_data }),
                      ...(msg.name && { name: msg.name }),
                      ...(msg.images && Array.isArray(msg.images) && { images: msg.images }),
                      ...(msg.attachments && { attachments: msg.attachments }),
                      ...(msg.files && { files: msg.files }),
                      ...(msg.provider_data && { provider_data: msg.provider_data }),
                      ...(msg.metrics && { metrics: msg.metrics }),
                      ...(msg.created_at && { created_at: typeof msg.created_at === 'number' ? msg.created_at : (typeof msg.created_at === 'string' ? parseInt(msg.created_at) : undefined) }),
                    };
                    chatHistory.push(chatMessage);
                  }
                }
              });
            } else {
              // Fallback: construct messages from input and content if messages array doesn't exist
              // Add user message from run.input.input_content
              if (run.input && run.input.input_content) {
                const userMessageId = `msg-user-${runIndex}`;
                
                // Skip if we've already seen this message ID
                if (!seenMessageIds.has(userMessageId)) {
                  seenMessageIds.add(userMessageId);
                  
                  const userMessage: any = {
                    id: userMessageId,
                    content: run.input.input_content,
                    role: 'user',
                    from_history: false,
                    stop_after_tool_call: false,
                  };
                  
                  // Add created_at if available in run
                  if (run.created_at) {
                    userMessage.created_at = typeof run.created_at === 'number' 
                      ? run.created_at 
                      : (typeof run.created_at === 'string' ? parseInt(run.created_at) : undefined);
                  }
                  
                  chatHistory.push(userMessage);
                }
              }
              
              // Extract references from tool call results in events first
              // Tool calls might contain knowledge base search results that become references
              const toolCallReferences: any[] = [];
              if (run.events && Array.isArray(run.events)) {
                run.events.forEach((event: any) => {
                  // Check for tool call completed events that have results
                  if (event.event && (
                    event.event.includes('ToolCallCompleted') || 
                    event.event.includes('ToolCall')
                  )) {
                    if (event.tool && event.tool.result) {
                      try {
                        // Tool result might be a JSON string or object
                        let toolResult: any = event.tool.result;
                        if (typeof toolResult === 'string') {
                          try {
                            toolResult = JSON.parse(toolResult);
                          } catch (e) {
                            // If not JSON, treat as plain text
                            toolResult = { content: toolResult };
                          }
                        }
                        
                        // If result is an array of knowledge base chunks
                        if (Array.isArray(toolResult)) {
                          toolCallReferences.push(...toolResult);
                        } else if (toolResult && typeof toolResult === 'object') {
                          // If it's a single result object
                          toolCallReferences.push(toolResult);
                        }
                      } catch (error) {
                        console.error('Error parsing tool result:', error);
                      }
                    }
                  }
                });
              }
              
              // Add assistant message from run.content
              if (run.content) {
                // The content can be an object with agent_response, or it might contain messages
                let assistantContent: any = null;
                let metaData: any = null;
                let images: any[] = [];
                let actions: any[] = [];
                let providerData: any = null;
                let metrics: any = null;
                
                if (typeof run.content === 'string') {
                  assistantContent = run.content;
                } else if (typeof run.content === 'object' && run.content !== null) {
                  // Check if content has agent_response
                  assistantContent = run.content.agent_response || run.content.response || run.content.content || '';
                  
                  // Extract other fields from content
                  if (run.content.meta_data) metaData = run.content.meta_data;
                  if (run.content.images && Array.isArray(run.content.images)) images = run.content.images;
                  if (run.content.actions && Array.isArray(run.content.actions)) actions = run.content.actions;
                  if (run.content.provider_data) providerData = run.content.provider_data;
                  if (run.content.metrics) metrics = run.content.metrics;
                }
                
                // Construct assistant message with content including references if they exist
                let finalContent = assistantContent || '';
                
                // If we have tool call references, they might already be in the content string
                // or we need to add them. Check if content already contains references tag
                if (toolCallReferences.length > 0 && assistantContent && !assistantContent.includes('<references>')) {
                  // References might need to be embedded or kept separate
                  // For now, we'll include them separately in the message structure
                }
                
                if (finalContent) {
                  const assistantMessageId = `msg-assistant-${runIndex}`;
                  
                  // Skip if we've already seen this message ID
                  if (!seenMessageIds.has(assistantMessageId)) {
                    seenMessageIds.add(assistantMessageId);
                    
                    const assistantMessage: any = {
                      id: assistantMessageId,
                      content: finalContent,
                      role: 'assistant',
                      from_history: false,
                      stop_after_tool_call: false,
                    };
                    
                    // Add optional fields if they exist
                    if (metaData) assistantMessage.meta_data = metaData;
                    if (images.length > 0) assistantMessage.images = images;
                    if (actions.length > 0) assistantMessage.actions = actions;
                    if (providerData) assistantMessage.provider_data = providerData;
                    if (metrics) assistantMessage.metrics = metrics;
                    
                    // Add created_at
                    if (run.created_at) {
                      assistantMessage.created_at = typeof run.created_at === 'number' 
                        ? run.created_at 
                        : (typeof run.created_at === 'string' ? parseInt(run.created_at) : undefined);
                    }
                    
                    chatHistory.push(assistantMessage);
                  }
                }
              }
            }
          });
        }
        
        // Filter to only include messages with role 'user' or 'assistant' (should already be filtered, but double-check)
        chatHistory = chatHistory.filter((msg: any) => msg.role === 'user' || msg.role === 'assistant');
        
        console.log(`Session ${session.id} - extracted chatHistory length:`, chatHistory.length);
        
        // Get the first message to extract session name
        // Use the first user message from chat_history, or fall back to first run's input
        let firstMessage: string | null = null;
        
        if (chatHistory.length > 0) {
          // Find first user message in chat_history
          const firstUserMsg = chatHistory.find((msg: any) => msg.role === 'user');
          if (firstUserMsg && firstUserMsg.content) {
            firstMessage = typeof firstUserMsg.content === 'string' ? firstUserMsg.content : null;
          } else if (chatHistory[0] && chatHistory[0].content) {
            // Fallback to first message regardless of role
            firstMessage = typeof chatHistory[0].content === 'string' ? chatHistory[0].content : null;
          }
        } else if (runs.length > 0 && runs[0].input && runs[0].input.input_content) {
          // Fallback to first run's input if no chat_history yet
          firstMessage = runs[0].input.input_content;
        }
        
        if (firstMessage) {
          // Extract first two words
          const words = firstMessage.trim().split(/\s+/).filter((w: string) => w.length > 0);
          if (words.length >= 2) {
            sessionName = words.slice(0, 2).join(' ');
          } else if (words.length === 1) {
            sessionName = words[0];
          }
        }
      } catch (error) {
        console.error('Error extracting session data:', error);
        // Keep defaults if extraction fails
      }
      
      // Format dates to ISO string if they exist
      const formatDate = (date: any): string | undefined => {
        if (!date) return undefined;
        if (typeof date === 'string') return date;
        if (date instanceof Date) return date.toISOString();
        return undefined;
      };
      
      // Extract metrics from run or session data
      const extractMetrics = (sessionData: any) => {
        // Look for metrics in run.metrics, run.data.metrics, or session.metrics
        const metrics = sessionData.run?.metrics || 
                       sessionData.run?.data?.metrics || 
                       sessionData.metrics || 
                       null;
        
        if (metrics && typeof metrics === 'object') {
          return {
            input_tokens: metrics.input_tokens || 0,
            output_tokens: metrics.output_tokens || 0,
            total_tokens: metrics.total_tokens || 0,
            cost: metrics.cost || null,
            audio_input_tokens: metrics.audio_input_tokens || 0,
            audio_output_tokens: metrics.audio_output_tokens || 0,
            audio_total_tokens: metrics.audio_total_tokens || 0,
            cache_read_tokens: metrics.cache_read_tokens || 0,
            cache_write_tokens: metrics.cache_write_tokens || 0,
            reasoning_tokens: metrics.reasoning_tokens || 0,
            timer: metrics.timer || null,
            time_to_first_token: metrics.time_to_first_token || null,
            duration: metrics.duration || null,
            provider_metrics: metrics.provider_metrics || null,
            additional_metrics: metrics.additional_metrics || null,
          };
        }
        return null;
      };
      
      // Map to the expected response structure
      return {
        user_id: session.user_id || null,
        agent_session_id: session.id, // same as session_id for agent sessions
        session_id: session.session_id,
        session_name: sessionName,
        session_state: session.session_state || session.run?.session_state || {},
        agent_id: session.agent_id || null,
        team_id: session.team_id || null,
        total_tokens: session.total_tokens || 
                     session.run?.metrics?.total_tokens || 
                     session.run?.data?.metrics?.total_tokens || 
                     null,
        metrics: extractMetrics(session),
        metadata: session.metadata || {},
        chat_history: chatHistory,
        created_at: formatDate(session.created_at),
        updated_at: formatDate(session.updated_at),
        ...(session.stage_name && { stage_name: session.stage_name }),
      };
    });

    const searchTimeMs = Date.now() - startTime;
    const totalPages = Math.ceil(totalCount / limitNum);

    console.log(`Returning ${transformedSessions.length} sessions with extracted names (page ${pageNum} of ${totalPages}, total: ${totalCount})`);

    // Return response in the expected format with data and meta
    return new Response(
      JSON.stringify({
        data: transformedSessions,
        meta: {
          page: pageNum,
          limit: limitNum,
          total_pages: totalPages,
          total_count: totalCount,
          search_time_ms: searchTimeMs,
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

