
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { session_id, ticket_id, role, content, user_id } = await req.json()

    if (!session_id || !ticket_id || !role || !content) {
      return new Response(
        JSON.stringify({ error: 'session_id, ticket_id, role, and content are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Processing message for session ${session_id}, role: ${role}`)

    // Generate embedding using OpenAI
    let embedding = null;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (openAIApiKey) {
      try {
        console.log('Generating embedding for message content...');
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: content,
            encoding_format: 'float'
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          embedding = embeddingData.data[0].embedding;
          console.log('Successfully generated embedding');
        } else {
          console.error('Failed to generate embedding:', await embeddingResponse.text());
        }
      } catch (error) {
        console.error('Error generating embedding:', error);
      }
    } else {
      console.log('OpenAI API key not found, skipping embedding generation');
    }

    // Store message in the messages table
    const { data, error } = await supabase
      .from('messages')
      .insert({
        session_id,
        ticket_id,
        role,
        content,
        embedding
      })
      .select()
      .single()

    if (error) {
      console.error('Error storing message:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to store message' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Successfully stored message with ID: ${data.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        message_id: data.id,
        embedding_generated: !!embedding
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
