import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
const isValidUrl = (url) => {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.protocol === 'https:' && urlObj.hostname.includes('atlassian.net')
    );
  } catch {
    return false;
  }
};
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
const isValidUuid = (uuid) => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({
          error: 'Method not allowed',
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON body',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    // Validate required fields
    const { workspace_id, jira_base_url, jira_email, jira_api_token } = body;
    if (!workspace_id || !jira_base_url || !jira_email || !jira_api_token) {
      return new Response(
        JSON.stringify({
          error:
            'Missing required fields: workspace_id, jira_base_url, jira_email, jira_api_token',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    // Validate field formats
    if (!isValidUuid(workspace_id)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid workspace_id format',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    if (!isValidUrl(jira_base_url)) {
      return new Response(
        JSON.stringify({
          error:
            'Invalid jira_base_url format. Must be https://your-domain.atlassian.net',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    if (!isValidEmail(jira_email)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid jira_email format',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    if (jira_api_token.length < 10) {
      return new Response(
        JSON.stringify({
          error: 'Invalid jira_api_token format',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    console.log('Storing JIRA credentials for workspace:', workspace_id);
    // Check if workspace exists
    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspace_id)
      .single();
    if (workspaceError || !workspace) {
      console.error('Workspace not found:', workspaceError);
      return new Response(
        JSON.stringify({
          error: 'Workspace not found',
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    //CREATE THE SECRET OBJECT:
    const secret_object = {
      jira_api_token: jira_api_token,
      jira_base_url: jira_base_url,
      jira_email: jira_email,
    };
    const key = 'jira_credentials_for_' + workspace.id;
    //store the credentials into the vault secrets using the rcp function
    const { data: secret, error: secret_error } = await supabase
      .schema('vault')
      .rpc('create_secret', {
        new_secret: secret_object,
        new_name: key,
        new_description: 'Jira credentials',
      });
    console.log(JSON.stringify(secret));
    //validate if any error
    if (secret_error) {
      return new Response(
        JSON.stringify({
          error: 'failed to create secret for: ' + workspace,
        }),
      );
    }
    // Store credentials in workspace_credentials table
    const { error: credentialsError } = await supabase
      .from('workspace_credentials')
      .upsert({
        workspace_id,
        service: 'Jira',
        secret_id: secret,
        is_active: true,
        updated_at: new Date().toISOString(),
      });
    if (credentialsError) {
      console.error('Error storing credentials:', credentialsError);
      return new Response(
        JSON.stringify({
          error: 'Failed to store credentials',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        },
      );
    }
    console.log(
      'JIRA credentials stored successfully for workspace:',
      workspace_id,
    );
    return new Response(
      JSON.stringify({
        success: true,
        message: 'JIRA credentials stored successfully',
        workspace_id,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
