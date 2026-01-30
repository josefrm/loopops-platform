import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const { session_id, prompt, context = [], team_id, workspace_id } = await req.json();
    
    if (!session_id || !prompt) {
      return new Response(JSON.stringify({
        error: 'session_id and prompt are required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (!team_id) {
      return new Response(JSON.stringify({
        error: 'team_id is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (!workspace_id) {
      return new Response(JSON.stringify({
        error: 'workspace_id is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log(`Processing prompt for session ${session_id}:`, prompt);
    console.log('Context tickets received:', context.length);

    // Query existing session_contexts from database
    const { data: sessionContexts, error: contextError } = await supabase
      .from('session_contexts')
      .select('ticket_data')
      .eq('session_id', session_id);
      
    if (contextError) {
      console.error('Error fetching session contexts:', contextError);
    }

    // Use database context if available, otherwise use passed context
    const ticketContext = sessionContexts && sessionContexts.length > 0 
      ? sessionContexts.map((ctx) => ctx.ticket_data) 
      : context;
      
    console.log(`Using context with ${ticketContext.length} tickets for agents API`);

    // Check if this is a streaming request
    const isStreaming = req.headers.get('accept') === 'text/event-stream';

    if (isStreaming) {
      // Return streaming response
      return new Response(
        new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            
            try {
              // Send initial status
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'status',
                message: 'Starting agent execution...',
                timestamp: Date.now()
              })}\n\n`));

              // Make request to the agents API with streaming
              const agentsResponse = await fetch(`https://agents-api-282035616357.us-central1.run.app/v1/agents/${team_id}/resolve-with-knowledge/stream`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'text/event-stream'
                },
                body: JSON.stringify({
                  session_id: session_id,
                  prompt: prompt,
                  context: ticketContext,
                  workspace_id: workspace_id
                })
              });

              if (!agentsResponse.ok) {
                const errorText = await agentsResponse.text();
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'error',
                  message: 'Failed to communicate with agents API',
                  details: errorText
                })}\n\n`));
                controller.close();
                return;
              }

              // Handle streaming response
              const reader = agentsResponse.body?.getReader();
              if (reader) {
                try {
                  while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    // Process streaming data in real-time
                    const chunk = new TextDecoder().decode(value);
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                      if (line.startsWith('data: ')) {
                        try {
                          const data = JSON.parse(line.slice(6));
                          // Forward the parsed data as-is to maintain the original structure
                          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                        } catch (parseError) {
                          // If parsing fails, log the error but don't forward malformed data
                          console.warn('Failed to parse streaming data line:', line, parseError);
                        }
                      }
                      // Remove the else clause that was forwarding non-data lines
                      // This prevents forwarding raw streaming data that could cause duplicates
                    }
                  }
                } finally {
                  reader.releaseLock();
                }
              }

              // Send completion message
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'status',
                message: 'Agent execution completed',
                timestamp: Date.now()
              })}\n\n`));
              
            } catch (error) {
              console.error('Streaming error:', error);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                message: 'Internal streaming error',
                details: error.message
              })}\n\n`));
            } finally {
              controller.close();
            }
          }
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        }
      );
    } else {
      // Original non-streaming behavior
      const agentsResponse = await fetch(`https://agents-api-282035616357.us-central1.run.app/v1/agents/${team_id}/resolve-with-knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session_id,
          prompt: prompt,
          context: ticketContext,
          workspace_id: workspace_id
        })
      });

      if (!agentsResponse.ok) {
        const errorText = await agentsResponse.text();
        console.error('Agents API error:', errorText);
        return new Response(JSON.stringify({
          error: 'Failed to communicate with agents API'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      const agentsData = await agentsResponse.json();
      console.log('Received response from agents API:', agentsData);
      
      return new Response(JSON.stringify({
        success: true,
        response: agentsData
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
