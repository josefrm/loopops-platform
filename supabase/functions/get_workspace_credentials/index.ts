import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-attempt, x-max-retries',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};
// Common validation functions
export const isValidUrl = (url)=>{
  try {
    const urlObj = new URL(url);
    // Be careful with specific domain checks if you want this truly generic
    // For Jira, you might keep the .atlassian.net check, but for general use, remove it.
    return urlObj.protocol === 'https:'; // More generic
  } catch  {
    return false;
  }
};
export const isValidEmail = (email)=>{
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
export const isValidUuid = (uuid)=>{
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    // Only allow POST or GET requests (POST for body, GET for query params)
    if (req.method !== 'POST' && req.method !== 'GET') {
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    let workspace_id = null;
    if (req.method === 'POST') {
      let body;
      try {
        body = await req.json();
        workspace_id = body.workspace_id;
      } catch  {
        return new Response(JSON.stringify({
          error: 'Invalid JSON body for POST'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    } else if (req.method === 'GET') {
      const url = new URL(req.url);
      workspace_id = url.searchParams.get('workspace_id');
    }
    // Validate required fields
    if (!workspace_id) {
      return new Response(JSON.stringify({
        error: 'Missing required field: workspace_id'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Validate field format
    if (!isValidUuid(workspace_id)) {
      return new Response(JSON.stringify({
        error: 'Invalid workspace_id format'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false
      }
    });
    // 1. Fetch the secret_id from workspace_credentials table
    console.log('Fetching secret_id for workspace:', workspace_id);
    const { data: credentialsMeta, error: metaError } = await supabase.from('workspace_credentials').select('secret_id').eq('workspace_id', workspace_id).eq('service', 'Jira') // Ensure we get the Jira specific credentials
    .single();
    if (metaError || !credentialsMeta) {
      console.error('Credentials metadata not found:', metaError?.message || 'Not found');
      return new Response(JSON.stringify({
        error: 'JIRA credentials not found for this workspace.'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const secretIdToReveal = credentialsMeta.secret_id;
    if (!isValidUuid(secretIdToReveal)) {
      return new Response(JSON.stringify({
        error: 'Invalid secret_id found for retrieval.'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // 2. Reveal the secret from Vault using the 'reveal_secret' RPC
    console.log('Revealing JIRA credentials from Vault for secret_id:', secretIdToReveal);
    const { data: revealedSecret, error: revealError } = await supabase.rpc('reveal_secret', {
      secret_id: secretIdToReveal
    });
    if (revealError) {
      console.error('Error revealing secret from vault:', revealError);
      return new Response(JSON.stringify({
        error: 'Failed to retrieve credentials securely'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Parse the JSON string returned by reveal_secret
    let credentials;
    try {
      credentials = JSON.parse(revealedSecret);
    } catch (parseError) {
      console.error('Error parsing secret JSON:', parseError);
      return new Response(JSON.stringify({
        error: 'Invalid credentials format'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Map response fields and exclude sensitive data for security
    const mappedCredentials = {
      companyUrl: credentials.jira_base_url,
      username: credentials.jira_email
      // jira_api_token excluded for security reasons
    };

    // Note: Do NOT log sensitive data in production
    // console.log('Revealed Secret:', credentials);
    return new Response(JSON.stringify({
      success: true,
      message: 'JIRA credentials retrieved securely',
      credentials: mappedCredentials
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
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
