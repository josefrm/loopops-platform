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

    const { session_id, user_id } = await req.json();

    if (!session_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'session_id and user_id are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `Retrieving messages for session ${session_id} and user ${user_id}`,
    );

    // First verify that the session belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', session_id)
      .eq('user_id', user_id)
      .single();

    if (sessionError || !session) {
      console.error('Session not found or access denied:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Session not found or access denied' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Retrieve messages for the session
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('session_id', session_id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch messages' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `Retrieved ${messages?.length || 0} messages for session ${session_id}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        messages: messages || [],
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
