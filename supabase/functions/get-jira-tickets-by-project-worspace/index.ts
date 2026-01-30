import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

interface SearchRequest {
  workspace_id: string;
  project_key: string;
  search?: string;
  maxResults?: number;
  startAt?: number;
}

Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request for fetch-secrets');
    return new Response(null, {
      headers: corsHeaders,
      status: 200
    });
  }
  
  const { workspace_id, project_key, search, maxResults = 50, startAt = 0 } = await req.json() as SearchRequest;
  
  if (!workspace_id || !project_key) {
    return new Response(JSON.stringify({
      error: 'Missing workspace_id or project_key query parameter.'
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
  
  // AFTER FIX: 'secret' should now be a parsed object.
  // The type check below should now pass if the JSON parsing was successful.
  if (typeof secret !== 'object' || secret === null || !('jira_base_url' in secret) || !('jira_email' in secret) || !('jira_api_token' in secret)) {
    console.error("Invalid secret structure after parsing:", secret); // Changed log message
    return new Response(JSON.stringify({
      error: 'Invalid secret structure retrieved from vault (expected object, got something else).'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  const { jira_base_url, jira_email, jira_api_token } = secret;
  
  // Build JQL query based on search parameters
  let jqlQuery = `project = "${project_key}"`;
  
  if (search && search.trim()) {
    const searchTerm = search.trim();
    // Check if search term looks like a ticket ID (contains project key + number pattern)
    const ticketIdPattern = new RegExp(`^${project_key}-\\d+$`, 'i');
    
    if (ticketIdPattern.test(searchTerm)) {
      // Search by exact ticket ID
      jqlQuery += ` AND key = "${searchTerm.toUpperCase()}"`;
    } else {
      // Search by summary (title) and description
      jqlQuery += ` AND (summary ~ "${searchTerm}" OR description ~ "${searchTerm}")`;
    }
  }
  
  // Add order by to get most recent tickets first
  jqlQuery += ` ORDER BY updated DESC`;
  
  const query_params = `jql=${encodeURIComponent(jqlQuery)}&maxResults=${maxResults}&startAt=${startAt}`;
  console.log("GETTING AT: " + `${jira_base_url}/rest/api/3/search?${query_params}`);
  console.log("JQL Query: " + jqlQuery);
  
  const response = await fetch(`${jira_base_url}/rest/api/3/search?${query_params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${btoa(`${jira_email}:${jira_api_token}`)}`,
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error fetching project issues from Jira: ${response.status} - ${errorText}`);
    return new Response(JSON.stringify({
      error: `Failed to fetch project issues from Jira: ${response.statusText}`,
      details: errorText
    }), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
  
  const projects = await response.json();
  console.log("Jira project issues fetched successfully.");
  return new Response(JSON.stringify(projects), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
});
async function fetchSecrets(workspace_id) {
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
    // --- THE CRUCIAL FIX IS HERE ---
    // The 'data' from read_secret RPC is a string, so parse it as JSON
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
    // --- END OF FIX ---
    console.log("Decrypted and parsed secret data:", JSON.stringify(parsedSecret));
    return {
      data: parsedSecret,
      error: null
    }; // Return the parsed object
  } catch (error) {
    console.error(`Unexpected error reading or parsing secret '${key}':`, error);
    return {
      data: null,
      error: error
    };
  }
}
