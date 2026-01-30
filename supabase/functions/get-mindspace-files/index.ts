import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface GetMindspaceFilesRequest {
  workspace_id: string;
  project_id: string;
}

interface MindspaceFile {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  signed_url: string;
  created_at: string;
  belongs_to_stage: boolean;
  created_in_editor: boolean;
  category_id: number;
}

interface GetMindspaceFilesResponse {
  files: MindspaceFile[];
  total_count: number;
  mindspace_bucket_id: string | null;
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
    const { workspace_id, project_id } =
      (await req.json()) as GetMindspaceFilesRequest;

    if (!workspace_id || !project_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: workspace_id, project_id',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(workspace_id) || !uuidRegex.test(project_id)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid workspace_id or project_id format (must be UUID)',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `Fetching mindspace files for workspace: ${workspace_id}, project: ${project_id}, user: ${userId}`,
    );

    // Step 1: Find the mindspace bucket and its files in one query
    const { data: mindspaceBucket, error: bucketError } = await supabaseAdmin
      .from('loopops_mindspace_buckets')
      .select(
        `
        id,
        bucket_name,
        loopops_mindspace_files (
          id, file_name, file_size, mime_type, file_path, created_at, created_in_editor, category_id
        )
      `,
      )
      .eq('workspace_id', workspace_id)
      .eq('project_id', project_id)
      .eq('user_id', userId)
      .order('created_at', {
        foreignTable: 'loopops_mindspace_files',
        ascending: false,
      })
      .maybeSingle();

    if (bucketError && bucketError.code !== 'PGRST116') {
      console.error('Error querying mindspace bucket:', bucketError);
      return new Response(
        JSON.stringify({
          error: `Failed to query mindspace bucket: ${bucketError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // If no bucket exists for this user/workspace/project, return empty array (valid scenario)
    if (!mindspaceBucket) {
      console.log(
        `No mindspace bucket found for workspace: ${workspace_id}, project: ${project_id}, user: ${userId}`,
      );
      return new Response(
        JSON.stringify({
          files: [],
          total_count: 0,
          mindspace_bucket_id: null,
        } as GetMindspaceFilesResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `Found mindspace bucket: ${mindspaceBucket.bucket_name} (${mindspaceBucket.id})`,
    );

    // Extract files from the relationship
    // @ts-ignore: dynamic property from join
    const mindspaceFiles = mindspaceBucket.loopops_mindspace_files as {
      id: string;
      file_name: string;
      file_size: number;
      mime_type: string;
      file_path: string;
      created_at: string;
      created_in_editor: boolean;
      category_id: number;
    }[];

    console.log(
      `Found ${mindspaceFiles?.length || 0} files in mindspace bucket`,
    );

    // If no files, return empty array
    if (!mindspaceFiles || mindspaceFiles.length === 0) {
      return new Response(
        JSON.stringify({
          files: [],
          total_count: 0,
          mindspace_bucket_id: mindspaceBucket.id,
        } as GetMindspaceFilesResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 3: Check which files belong to a stage and generate signed URLs
    const signedUrlDuration = 3600; // 1 hour in seconds
    // List to collect files with signed URLs

    // Get all mindspace file IDs to check stage membership in a single query
    const mindspaceFileIds = mindspaceFiles.map((file) => file.id);

    // Query stage files to find which mindspace files belong to stages for THIS project
    // We need to join through stage_buckets -> project_stages to filter by project_id
    const { data: stageFiles, error: stageFilesError } = await supabaseAdmin
      .from('loopops_stage_files')
      .select(
        `
        id,
        mindspace_file_id,
        stage_bucket:loopops_stage_buckets!inner (
          project_stage:loopops_project_stages!inner (
            project_id
          )
        )
      `,
      )
      .in('mindspace_file_id', mindspaceFileIds);

    if (stageFilesError) {
      console.error('Error querying stage files:', stageFilesError);
      // Continue with belongs_to_stage = false for all files
    }

    // Create a Set for O(1) lookup of files that belong to stages
    const stageFileIds = new Set(stageFiles?.map((sf) => sf.id) || []);

    const filePromises = mindspaceFiles.map(async (file) => {
      try {
        // Generate signed URL for download
        const { data: signedUrlData, error: urlError } =
          await supabaseAdmin.storage
            .from(mindspaceBucket.bucket_name)
            .createSignedUrl(file.file_path, signedUrlDuration);

        if (urlError) {
          console.error(
            `Error creating signed URL for ${file.file_path}:`,
            urlError,
          );
          return null;
        }

        return {
          id: file.id,
          file_name: file.file_name,
          file_size: file.file_size,
          mime_type: file.mime_type,
          signed_url: signedUrlData.signedUrl,
          created_at: file.created_at,
          belongs_to_stage: stageFileIds.has(file.id),
          created_in_editor: file.created_in_editor || false,
          category_id: file.category_id || 1, // Default to 1 (All) if null
        };
      } catch (error) {
        console.error(
          `Exception generating signed URL for ${file.file_path}:`,
          error,
        );
        return null;
      }
    });

    const results = await Promise.all(filePromises);
    const filesWithSignedUrls = results.filter(
      (f): f is MindspaceFile => f !== null,
    );

    console.log(
      `Successfully generated ${filesWithSignedUrls.length} signed URLs`,
    );

    const response: GetMindspaceFilesResponse = {
      files: filesWithSignedUrls,
      total_count: filesWithSignedUrls.length,
      mindspace_bucket_id: mindspaceBucket.id,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-mindspace-files function:', error);

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
