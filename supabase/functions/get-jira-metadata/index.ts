import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface MetadataRequest {
  workspace_id: string;
  project_key: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request for get-jira-metadata');
    return new Response(null, {
      headers: corsHeaders,
      status: 200
    });
  }
  
  const { workspace_id, project_key } = await req.json() as MetadataRequest;
  
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
  
  try {
    // Fetch metadata from Jira
    const metadata = await fetchJiraMetadata(jira_base_url, jira_email, jira_api_token, project_key);
    
    return new Response(JSON.stringify(metadata), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error('Error fetching Jira metadata:', error);
    return new Response(JSON.stringify({
      error: 'Failed to fetch Jira metadata',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
});

async function fetchJiraMetadata(baseUrl: string, email: string, apiToken: string, projectKey: string) {
  const headers = {
    'Authorization': `Basic ${btoa(`${email}:${apiToken}`)}`,
    'Accept': 'application/json'
  };

  // Fetch project metadata
  const projectResponse = await fetch(`${baseUrl}/rest/api/3/project/${projectKey}`, {
    method: 'GET',
    headers
  });

  if (!projectResponse.ok) {
    throw new Error(`Failed to fetch project metadata: ${projectResponse.statusText}`);
  }

  const project = await projectResponse.json();

  // Fetch issue types for the project
  const issueTypesResponse = await fetch(`${baseUrl}/rest/api/3/project/${projectKey}`, {
    method: 'GET',
    headers
  });

  if (!issueTypesResponse.ok) {
    throw new Error(`Failed to fetch issue types: ${issueTypesResponse.statusText}`);
  }

  const issueTypesData = await issueTypesResponse.json();
  const issueTypes = issueTypesData.issueTypes || [];

  // Fetch statuses for the project
  const statusesResponse = await fetch(`${baseUrl}/rest/api/3/project/${projectKey}/statuses`, {
    method: 'GET',
    headers
  });

  if (!statusesResponse.ok) {
    throw new Error(`Failed to fetch statuses: ${statusesResponse.statusText}`);
  }

  const statusesData = await statusesResponse.json();
  const statuses = statusesData.flatMap((issueType: any) => issueType.statuses || []);

  // Fetch priorities
  const prioritiesResponse = await fetch(`${baseUrl}/rest/api/3/priority`, {
    method: 'GET',
    headers
  });

  if (!prioritiesResponse.ok) {
    throw new Error(`Failed to fetch priorities: ${prioritiesResponse.statusText}`);
  }

  const priorities = await prioritiesResponse.json();

  // Fetch users (assignees) for the project
  const usersResponse = await fetch(`${baseUrl}/rest/api/3/user/assignable/search?project=${projectKey}`, {
    method: 'GET',
    headers
  });

  if (!usersResponse.ok) {
    throw new Error(`Failed to fetch users: ${usersResponse.statusText}`);
  }

  const users = await usersResponse.json();

  // Get unique statuses, priorities, and assignees
  const uniqueStatuses = [...new Set(statuses.map((status: any) => status.name))];
  const uniquePriorities = priorities.map((priority: any) => priority.name);
  const uniqueAssignees = users.map((user: any) => user.displayName);

  return {
    project: {
      key: project.key,
      name: project.name,
      description: project.description
    },
    statuses: uniqueStatuses,
    priorities: uniquePriorities,
    assignees: uniqueAssignees,
    issueTypes: issueTypes.map((type: any) => ({
      id: type.id,
      name: type.name,
      description: type.description
    }))
  };
}

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