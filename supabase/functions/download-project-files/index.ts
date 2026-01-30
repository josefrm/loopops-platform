import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface DownloadProjectFileRequest {
  file_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the authenticated user from the request
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

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const userId = user.id;

    // Parse and validate request
    const request: DownloadProjectFileRequest = await req.json();

    if (!request.file_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: file_id' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const fileId = request.file_id;
    console.log(
      `User ${userId} requesting to download project file: ${fileId}`,
    );

    // Get file record with bucket and project information
    // Try to get file from loopops_project_files first
    let fileType = 'project';
    let fileDataRaw: any = null;

    const { data: projectFile, error: projectError } = await supabase
      .from('loopops_project_files')
      .select(
        `
        id,
        file_path,
        file_name,
        mime_type,
        loopops_project_buckets (
          id,
          bucket_name,
          project_id,
          loopops_projects (
            id,
            workspace_id,
            loopops_workspaces (
              id,
              owner_id
            )
          )
        )
      `,
      )
      .eq('id', fileId)
      .maybeSingle();

    if (projectFile) {
      fileDataRaw = projectFile;
    } else {
      // If not found in project files, try stage files
      const { data: stageFile, error: stageError } = await supabase
        .from('loopops_stage_files')
        .select(
          `
          id,
          file_path,
          file_name,
          mime_type,
          loopops_stage_buckets (
            id,
            bucket_name,
            loopops_project_stages (
              id,
              loopops_projects (
                id,
                workspace_id,
                loopops_workspaces (
                  id,
                  owner_id
                )
              )
            )
          )
        `,
        )
        .eq('id', fileId)
        .maybeSingle();

      if (stageFile) {
        fileType = 'stage';
        fileDataRaw = stageFile;
      }
    }

    if (!fileDataRaw) {
      console.error(`File ${fileId} not found in project or stage files`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'File not found',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verify user owns the file (through the workspace)
    let ownerId: string | undefined;
    let bucketName: string | undefined;

    if (fileType === 'project') {
      ownerId =
        fileDataRaw.loopops_project_buckets?.loopops_projects
          ?.loopops_workspaces?.owner_id;
      bucketName = fileDataRaw.loopops_project_buckets?.bucket_name;
    } else {
      ownerId =
        fileDataRaw.loopops_stage_buckets?.loopops_project_stages
          ?.loopops_projects?.loopops_workspaces?.owner_id;
      bucketName = fileDataRaw.loopops_stage_buckets?.bucket_name;
    }

    if (ownerId !== userId) {
      console.error(
        `Access denied for file ${fileId}: user ${userId} does not own it`,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Access denied: You do not own this file',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const filePath = fileDataRaw.file_path;
    const fileName = fileDataRaw.file_name;
    const mimeType = fileDataRaw.mime_type || 'application/octet-stream';

    if (!bucketName) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not determine bucket name',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucketName)
      .download(filePath);

    if (downloadError || !fileData) {
      console.error(
        `Error downloading file ${fileId} from storage:`,
        downloadError,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: downloadError?.message || 'Failed to download file',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Successfully downloaded file: ${fileName} (${mimeType})`);

    // Return the file as a binary response
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    return new Response(uint8Array, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          fileName,
        )}"`,
        'Content-Length': uint8Array.length.toString(),
        'X-File-Name': fileName,
        'X-File-Id': fileId,
      },
    });
  } catch (error) {
    console.error('Error in download-project-files function:', error);

    return new Response(
      JSON.stringify({
        success: false,
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
