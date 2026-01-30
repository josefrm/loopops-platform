import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface ConvertToKeyDeliverableRequest {
  id?: string;
  ids?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verify user authentication
    const userToken = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(userToken);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { id, ids } = (await req.json()) as ConvertToKeyDeliverableRequest;

    // Normalize ids to array
    const targetIds = ids || (id ? [id] : []);

    if (targetIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: id or ids' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `Converting files to key deliverables: ${targetIds.join(', ')}`,
    );

    // Fetch current is_key_deliverable values for the target files
    const { data: currentFiles, error: fetchError } = await supabaseAdmin
      .from('loopops_stage_files')
      .select('id, is_key_deliverable')
      .in('id', targetIds);

    if (fetchError) {
      console.error('Error fetching stage files:', fetchError);
      return new Response(
        JSON.stringify({
          error: `Failed to fetch files: ${fetchError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!currentFiles || currentFiles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No files found with the provided IDs' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Toggle is_key_deliverable for each file
    const updates = currentFiles.map((file) => ({
      id: file.id,
      is_key_deliverable: !file.is_key_deliverable,
    }));

    // Update each file with its toggled value
    const updatePromises = updates.map((update) =>
      supabaseAdmin
        .from('loopops_stage_files')
        .update({ is_key_deliverable: update.is_key_deliverable })
        .eq('id', update.id),
    );

    const updateResults = await Promise.all(updatePromises);

    // Check for any errors
    const errors = updateResults.filter((result) => result.error);
    if (errors.length > 0) {
      console.error('Error updating stage files:', errors);
      return new Response(
        JSON.stringify({
          error: `Failed to update some files`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Build response with new states
    const updatedFiles = updates.reduce((acc, update) => {
      acc[update.id] = update.is_key_deliverable;
      return acc;
    }, {} as Record<string, boolean>);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully toggled ${targetIds.length} files`,
        updatedFiles,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      },
    );
  } catch (error) {
    console.error('Error in convert-to-key-deliverable function:', error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
