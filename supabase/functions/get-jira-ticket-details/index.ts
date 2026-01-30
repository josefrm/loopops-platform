import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface TicketDetailsRequest {
  workspace_id: string;
  ticket_id: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request for get-jira-ticket-details');
    return new Response(null, {
      headers: corsHeaders,
      status: 200
    });
  }
  
  const { workspace_id, ticket_id } = await req.json() as TicketDetailsRequest;
  
  if (!workspace_id || !ticket_id) {
    return new Response(JSON.stringify({
      error: 'Missing workspace_id or ticket_id parameter.'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  // Fetch secrets from the vault
  const { data: secret, error: secretsError } = await fetchSecrets(workspace_id);
  if (secretsError || !secret) {
    console.error("Secrets fetch error:", secretsError || "No secret returned");
    return new Response(JSON.stringify({
      error: 'Failed to fetch secrets'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  if (typeof secret !== 'object' || secret === null || !('jira_base_url' in secret) || !('jira_email' in secret) || !('jira_api_token' in secret)) {
    console.error("Invalid secret structure after parsing:", secret);
    return new Response(JSON.stringify({
      error: 'Invalid secret structure retrieved from vault.'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  const { jira_base_url, jira_email, jira_api_token } = secret;
  
  // Fetch rich ticket details with expanded fields
  const expandParams = 'description,renderedFields,names,schema,operations';
  const url = `${jira_base_url}/rest/api/3/issue/${ticket_id}?expand=${expandParams}`;
  
  console.log("Fetching ticket details from:", url);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${jira_email}:${jira_api_token}`)}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error fetching ticket details from Jira: ${response.status} - ${errorText}`);
      return new Response(JSON.stringify({
        error: `Failed to fetch ticket details from Jira: ${response.statusText}`,
        details: errorText
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
    
    const ticketDetails = await response.json();
    console.log("Jira ticket details fetched successfully for:", ticket_id);
    
    return new Response(JSON.stringify(ticketDetails), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Unexpected error fetching ticket details:", error);
    return new Response(JSON.stringify({
      error: 'Unexpected error occurred while fetching ticket details'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});

async function fetchSecrets(workspace_id: string) {
  console.log("fetching secrets for workspace_id: " + workspace_id);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error("Supabase URL or Service Role Key not set in environment variables.");
    return {
      data: null,
      error: new Error("Supabase environment variables not configured.")
    };
  }
  const supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false
    }
  });
  const { data: credentialData, error: credentialError } = await supabaseClient.from('workspace_credentials').select('secret_id').eq('workspace_id', workspace_id).single();
  if (credentialError) {
    console.error("Error fetching credentialData:", credentialError);
    return {
      data: null,
      error: credentialError
    };
  }
  if (!credentialData) {
    console.error("No credential data found for workspace_id:", workspace_id);
    return {
      data: null,
      error: new Error("No credential data found.")
    };
  }
  console.log("secret ID from workspace_credentials:", credentialData.secret_id);
  const key = "jira_credentials_for_" + workspace_id;
  console.log("Attempting to read secret with name:", key);
  try {
    const { data, error } = await supabaseClient.rpc('read_secret', {
      secret_name: key
    });
    if (error) {
      console.error(`Error from read_secret RPC for '${key}':`, error);
      return {
        data: null,
        error: error
      };
    }
    let parsedSecret;
    try {
      parsedSecret = JSON.parse(data);
    } catch (parseError) {
      console.error(`Failed to parse secret data as JSON for '${key}':`, parseError);
      return {
        data: null,
        error: new Error("Failed to parse secret as JSON.")
      };
    }
    console.log("Decrypted and parsed secret data:", JSON.stringify(parsedSecret));
    return {
      data: parsedSecret,
      error: null
    };
  } catch (error) {
    console.error(`Unexpected error reading or parsing secret '${key}':`, error);
    return {
      data: null,
      error: error
    };
  }
}
