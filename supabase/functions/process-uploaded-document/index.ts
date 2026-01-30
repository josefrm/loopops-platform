// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

interface ProcessUploadedDocumentRequest {
  file_path: string;
  workspace_id: string;
  metadata?: {
    category?: string;
    priority?: string;
    department?: string;
    workspace_id: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_path, workspace_id, metadata } = await req.json() as ProcessUploadedDocumentRequest;

    if (!file_path || !workspace_id) {
      throw new Error('Missing required fields: file_path, workspace_id');
    }

    console.log(`Processing uploaded document: ${file_path} for workspace: ${workspace_id}`);

    // Prepare the request body for the external API
    const requestBody = {
      file_path,
      workspace_id,
      metadata: {
        category: metadata?.category || 'general',
        priority: metadata?.priority || 'medium',
        department: metadata?.department || 'general',
        workspace_id
      }
    };

    console.log('Calling external API with body:', requestBody);

    // Call the external API
    const response = await fetch('https://agents-api-282035616357.us-central1.run.app/v1/local-pdf-knowledge/process-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`External API response status: ${response.status}`);

    // We don't need to wait for or handle the response as specified
    // Just log the status for debugging purposes
    if (!response.ok) {
      console.warn(`External API returned non-OK status: ${response.status}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Document processing initiated',
        file_path,
        workspace_id,
        external_api_status: response.status
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in process-uploaded-document function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/process-uploaded-document' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
