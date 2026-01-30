import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface GetFilesRequest {
  project_stage_id: string; // UUID
}

interface StageFile {
  id: string;
  file_name: string;
  file_size: number; // bytes
  mime_type: string;
  signed_url: string;
  created_at: string;
  created_in_editor: boolean;
  is_deliverable: boolean;
}

interface GetFilesResponse {
  files: StageFile[];
  total_count: number;
  stage_bucket_id: string | null;
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

    const userId = user.id;

    // Parse request body
    const { project_stage_id } = (await req.json()) as GetFilesRequest;

    if (!project_stage_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: project_stage_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(project_stage_id)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid project_stage_id format (must be UUID)',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `Fetching files for project_stage_id: ${project_stage_id}, user: ${userId}`,
    );

    // Step 1: Verify user has access to this project stage and get stage bucket
    // We'll do this by checking if they can read the project through the workspace
    const { data: stageData, error: accessError } = await supabaseAdmin
      .from('loopops_project_stages')
      .select(
        `
        id,
        project_id,
        projects:loopops_projects!inner (
          id,
          workspace_id,
          workspaces:loopops_workspaces!inner (
            id,
            owner_id
          )
        ),
        stage_buckets:loopops_stage_buckets (
          id,
          bucket_name
        )
      `,
      )
      .eq('id', project_stage_id)
      .maybeSingle();

    if (accessError) {
      console.error('Error checking access/bucket:', accessError);
      return new Response(
        JSON.stringify({
          error: `Failed to verify access permissions: ${accessError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!stageData || stageData.projects.workspaces.owner_id !== userId) {
      console.log(
        `User ${userId} does not have access to stage ${project_stage_id}`,
      );
      return new Response(
        JSON.stringify({
          error: 'Forbidden: You do not have access to this project stage',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Extract bucket from the relationship
    // fast check if array or object (PostgREST returns array for 1:N usually)
    const rawBucket = stageData.stage_buckets;
    const stageBucket = Array.isArray(rawBucket) ? rawBucket[0] : rawBucket;

    // If no bucket exists for this stage, return empty array
    if (!stageBucket) {
      console.log(
        `No stage bucket found for project_stage_id: ${project_stage_id}`,
      );
      return new Response(
        JSON.stringify({
          files: [],
          total_count: 0,
          stage_bucket_id: null,
        } as GetFilesResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `Found stage bucket: ${stageBucket.bucket_name} (${stageBucket.id})`,
    );

    // Step 3: Query all files in this stage bucket, sorted by newest first
    const { data: stageFiles, error: filesError } = await supabaseAdmin
      .from('loopops_stage_files')
      .select(
        'id, file_name, file_size, mime_type, file_path, created_at, is_deliverable',
      )
      .eq('stage_bucket_id', stageBucket.id)
      .order('created_at', { ascending: false });

    if (filesError) {
      console.error('Error querying stage files:', filesError);
      return new Response(
        JSON.stringify({
          error: `Failed to query files: ${filesError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Found ${stageFiles?.length || 0} files in stage bucket`);

    // If no files, return empty array
    if (!stageFiles || stageFiles.length === 0) {
      return new Response(
        JSON.stringify({
          files: [],
          total_count: 0,
          stage_bucket_id: stageBucket.id,
        } as GetFilesResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 4: Generate signed URLs for each file
    const filesWithSignedUrls: StageFile[] = [];

    for (const file of stageFiles) {
      try {
        filesWithSignedUrls.push({
          id: file.id,
          file_name: file.file_name,
          file_size: file.file_size,
          mime_type: file.mime_type,
          signed_url: file.signed_url,
          created_at: file.created_at,
          created_in_editor: false,
          is_deliverable: file.is_deliverable,
        });
      } catch (error) {
        console.error(
          `Exception generating signed URL for ${file.file_path}:`,
          error,
        );
        // Skip this file and continue with others
      }
    }

    console.log(
      `Successfully generated ${filesWithSignedUrls.length} signed URLs`,
    );

    const response: GetFilesResponse = {
      files: filesWithSignedUrls,
      total_count: filesWithSignedUrls.length,
      stage_bucket_id: stageBucket.id,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-files-v2 function:', error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
