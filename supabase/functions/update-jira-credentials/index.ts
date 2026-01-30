import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from "../_shared/cors.ts";
// Input validation functions
function isValidUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' && parsedUrl.hostname.includes('atlassian.net');
  } catch  {
    return false;
  }
}
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
function isValidUuid(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  // Only allow POST requests
  if (req.method !== 'POST') {
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
  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { workspace_id, jira_base_url, jira_email, jira_api_token, secret_id } = requestBody;
    // Validate required fields
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
    if (!jira_base_url) {
      return new Response(JSON.stringify({
        error: 'jira_base_url is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!jira_email) {
      return new Response(JSON.stringify({
        error: 'jira_email is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!jira_api_token) {
      return new Response(JSON.stringify({
        error: 'jira_api_token is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Validate field formats
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
    if (!isValidUrl(jira_base_url)) {
      return new Response(JSON.stringify({
        error: 'Invalid jira_base_url. Must be a valid HTTPS URL for atlassian.net'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (!isValidEmail(jira_email)) {
      return new Response(JSON.stringify({
        error: 'Invalid jira_email format'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    // Check if workspace exists
    const { data: workspace, error: workspaceError } = await supabase.from('workspaces').select('id').eq('id', workspace_id).single();
    if (workspaceError || !workspace) {
      console.error('Workspace not found:', workspaceError);
      return new Response(JSON.stringify({
        error: 'Workspace not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Get existing workspace credentials to find the secret name
    const { data: existingCredentials, error: credentialsError } = await supabase.from('workspace_credentials').select('secret_id').eq('workspace_id', workspace_id).eq('service', 'Jira').single();
    if (credentialsError || !existingCredentials || !existingCredentials.secret_id) {
      console.error('Existing credentials not found:', credentialsError);
      return new Response(JSON.stringify({
        error: 'No existing Jira credentials found to update'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Prepare the credentials object
    const credentials = {
      jira_base_url,
      jira_email,
      jira_api_token
    };
    // Create secret name using workspace_id and service
    const secretName = `jira_credentials_for_${workspace_id}`;
    try {
      // Update the secret in the vault
      const { data: updateResult, error: updateError } = await supabase.rpc('update_secret', {
        secret_id: existingCredentials.secret_id,
        new_name: secretName,
        new_secret: JSON.stringify(credentials),
        new_description: "Jira Credentials"
      });
      if (updateError) {
        console.error('Error updating secret:', updateError);
        return new Response(JSON.stringify({
          error: 'Failed to update credentials in vault'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      // Update the workspace_credentials table
      const { error: updateCredentialsError } = await supabase.from('workspace_credentials').update({
        updated_at: new Date().toISOString(),
        is_active: true
      }).eq('workspace_id', workspace_id).eq('service', 'Jira');
      if (updateCredentialsError) {
        console.error('Error updating workspace_credentials:', updateCredentialsError);
        return new Response(JSON.stringify({
          error: 'Failed to update workspace credentials'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      return new Response(JSON.stringify({
        message: 'Jira credentials updated successfully',
        workspace_id: workspace_id
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
  } catch (error) {
    console.error('Request processing error:', error);
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
