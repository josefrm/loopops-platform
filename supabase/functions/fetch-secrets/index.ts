import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

// Define CORS headers directly in the function to avoid import issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  console.log('fetch-secrets function invoked with method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request for fetch-secrets');
    return new Response(null, { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const { workspace_id } = await req.json();
    
    console.log('Checking JIRA credentials for workspace:', workspace_id);

    if (!workspace_id) {
      console.error('Missing workspace_id in request');
      return new Response(
        JSON.stringify({ error: 'workspace_id is required', success: false }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check for active JIRA credentials for this workspace
    const { data: credentials, error } = await supabase
      .from('workspace_credentials')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('service', 'Jira')
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error querying workspace_credentials:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to check credentials', success: false }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const hasCredentials = credentials !== null;
    console.log('JIRA credentials found:', hasCredentials);

    return new Response(
      JSON.stringify({ 
        success: hasCredentials,
        has_credentials: hasCredentials 
      }), 
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in fetch-secrets function:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});