import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface GetFilesRequest {
  project_id: string; // UUID
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
  is_key_deliverable: boolean;
  stage_name?: string;
}

interface GetFilesResponse {
  files: StageFile[];
  total_count: number;
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

    // Parse request body
    const { project_id } = (await req.json()) as GetFilesRequest;

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: project_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Optimized query: Join only stage_buckets and stage_files
    // Filter by project_id via project_stages relation
    const { data: bucketsData, error: bucketsError } = await supabaseAdmin
      .from('loopops_stage_buckets')
      .select(
        `
        id,
        bucket_name,
        project_stages:loopops_project_stages!inner (
          project_id
        ),
        loopops_stage_files (
          id, file_name, file_size, mime_type, file_path, created_at, is_deliverable, is_key_deliverable
        )
      `,
      )
      .eq('project_stages.project_id', project_id);

    if (bucketsError) {
      console.error('Error querying project assets:', bucketsError);
      return new Response(
        JSON.stringify({
          error: `Failed to query files: ${bucketsError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!bucketsData || bucketsData.length === 0) {
      return new Response(
        JSON.stringify({
          files: [],
          total_count: 0,
        } as GetFilesResponse),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Flatten all files with their bucket names for parallel processing
    const fileEntries: Array<{ file: any; bucketName: string }> = [];
    for (const bucket of bucketsData) {
      const files = (bucket.loopops_stage_files as any[]) || [];
      for (const file of files) {
        fileEntries.push({ file, bucketName: bucket.bucket_name });
      }
    }

    // Generate signed URLs in parallel for all files
    const allFiles: StageFile[] = await Promise.all(
      fileEntries.map(async ({ file, bucketName }) => {
        let signedUrl = '';
        try {
          const { data: signedData } = await supabaseAdmin.storage
            .from(bucketName)
            .createSignedUrl(file.file_path, 3600); // 1 hour

          if (signedData) {
            signedUrl = signedData.signedUrl;
          }
        } catch (e) {
          console.error('Error signing url', e);
        }

        return {
          id: file.id,
          file_name: file.file_name,
          file_size: file.file_size,
          mime_type: file.mime_type,
          signed_url: signedUrl,
          created_at: file.created_at,
          created_in_editor: false,
          is_deliverable: file.is_deliverable,
          is_key_deliverable: file.is_key_deliverable,
        };
      }),
    );

    // Sort by created_at desc
    allFiles.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return new Response(
      JSON.stringify({
        files: allFiles,
        total_count: allFiles.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in get-project-assets function:', error);
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
