import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from "../_shared/cors.ts";

interface CreateWorkspaceRequest {
  name: string;
  role?: string;
  user_id?: string;
}

interface CreateWorkspaceResponse {
  workspace: {
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body first
    const requestBody = await req.json() as CreateWorkspaceRequest;
    const { name, role = 'admin', user_id } = requestBody;
    
    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    
    // Try to get user from JWT, fallback to user_id from body
    let userId: string | null = user_id || null;
    
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

      if (!authError && user) {
        userId = user.id;
        console.log('create-workspace-v2: Authenticated user from JWT:', user.id);
      } else {
        console.error('create-workspace-v2: JWT validation failed, using user_id from body');
      }
    }
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'user_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!name || name.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Workspace name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating workspace "${name}" for user ${userId}`);

    // Create service role client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      urlLength: supabaseUrl.length,
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyLength: supabaseServiceKey.length,
      urlPreview: supabaseUrl.substring(0, 30) + '...'
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables:', {
        SUPABASE_URL: !!supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey
      });
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Test connection by checking if we can query the table
    console.log('Testing database connection...');
    const { data: testData, error: testError } = await supabaseAdmin
      .from('loopops_workspaces')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('Database connection test failed:', JSON.stringify(testError, null, 2));
      return new Response(
        JSON.stringify({ 
          error: `Database connection failed: ${testError.message || JSON.stringify(testError)}`,
          details: testError.details,
          hint: testError.hint,
          code: testError.code
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Database connection test passed');

    // Create the workspace in loopops schema
    // Note: Using public view loopops_workspaces (which references loopops.workspaces)
    console.log('Attempting to insert workspace:', { name: name.trim(), owner_id: userId });
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('loopops_workspaces')
      .insert({
        name: name.trim(),
        owner_id: userId,
      })
      .select()
      .single();

    if (workspaceError) {
      console.error('Error creating workspace:', JSON.stringify(workspaceError, null, 2));
      console.error('Error type:', typeof workspaceError);
      console.error('Error keys:', Object.keys(workspaceError || {}));
      
      // Handle different error structures
      const errorMessage = workspaceError.message 
        || workspaceError.error?.message
        || (typeof workspaceError === 'string' ? workspaceError : 'Unknown error');
      
      const errorDetails = {
        message: errorMessage,
        code: workspaceError.code || workspaceError.error?.code,
        details: workspaceError.details || workspaceError.error?.details,
        hint: workspaceError.hint || workspaceError.error?.hint,
        fullError: workspaceError
      };
      
      return new Response(
        JSON.stringify({ 
          error: `Failed to create workspace: ${errorMessage}`,
          ...errorDetails
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!workspace) {
      console.error('Workspace creation returned no data and no error');
      return new Response(
        JSON.stringify({ error: 'Failed to create workspace: No data returned' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Workspace created with ID: ${workspace.id}`);

    const response: CreateWorkspaceResponse = {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        owner_id: workspace.owner_id,
        created_at: workspace.created_at,
      },
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in create-workspace-v2 function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});



