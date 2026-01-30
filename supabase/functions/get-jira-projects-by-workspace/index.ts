import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  //const url = new URL(req.url);
  const { workspace_id } = await req.json();
  if (!workspace_id) {
    return new Response(JSON.stringify({
      error: 'Missing workspace_id query parameter.'
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
  const response = await fetch(`${jira_base_url}/rest/api/3/project`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${btoa(`${jira_email}:${jira_api_token}`)}`,
      'Accept': 'application/json'
    }
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error fetching projects from Jira: ${response.status} - ${errorText}`);
    return new Response(JSON.stringify({
      error: `Failed to fetch projects from Jira: ${response.statusText}`,
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
  console.log("Jira projects fetched successfully.");
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
