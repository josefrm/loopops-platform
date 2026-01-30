import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import JSZip from 'https://esm.sh/jszip@3.10.1';
import { corsHeaders } from '../_shared/cors.ts';

interface BulkDownloadProjectFilesRequest {
  file_ids: string[];
}

interface FileDownloadResult {
  id: string;
  file_name: string;
  success: boolean;
  error?: string;
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
    const request: BulkDownloadProjectFilesRequest = await req.json();

    if (!request.file_ids || request.file_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: file_ids' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const fileIds = request.file_ids;
    console.log(
      `User ${userId} requesting bulk download of ${
        fileIds.length
      } project file(s): ${fileIds.join(', ')}`,
    );

    // Create a new ZIP file
    const zip = new JSZip();
    const results: FileDownloadResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Track file names to handle duplicates
    const fileNameCounts: Record<string, number> = {};

    for (const fileId of fileIds) {
      try {
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
          results.push({
            id: fileId,
            file_name: '',
            success: false,
            error: 'File not found',
          });
          failureCount++;
          continue;
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
          results.push({
            id: fileId,
            file_name: fileDataRaw.file_name,
            success: false,
            error: 'Access denied: You do not own this file',
          });
          failureCount++;
          continue;
        }

        const filePath = fileDataRaw.file_path;

        if (!bucketName) {
          throw new Error('Could not determine bucket name');
        }

        const { data: fileData, error: downloadError } = await supabase.storage
          .from(bucketName)
          .download(filePath);

        if (downloadError || !fileData) {
          console.error(
            `Error downloading file ${fileId} from storage:`,
            downloadError,
          );
          results.push({
            id: fileId,
            file_name: fileDataRaw.file_name,
            success: false,
            error: downloadError?.message || 'Failed to download file',
          });
          failureCount++;
          continue;
        }

        // Handle duplicate file names by appending a number
        let fileName = fileDataRaw.file_name;
        if (fileNameCounts[fileName]) {
          const ext = fileName.lastIndexOf('.');
          if (ext > 0) {
            const name = fileName.substring(0, ext);
            const extension = fileName.substring(ext);
            fileName = `${name} (${fileNameCounts[fileName]})${extension}`;
          } else {
            fileName = `${fileName} (${fileNameCounts[fileName]})`;
          }
          fileNameCounts[fileDataRaw.file_name]++;
        } else {
          fileNameCounts[fileDataRaw.file_name] = 1;
        }

        // Add file to ZIP - convert to Uint8Array for proper binary handling
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        zip.file(fileName, uint8Array, { binary: true });

        console.log(`Added file to ZIP: ${fileName}`);
        results.push({
          id: fileId,
          file_name: fileName,
          success: true,
        });
        successCount++;
      } catch (error) {
        console.error(`Unexpected error processing file ${fileId}:`, error);
        results.push({
          id: fileId,
          file_name: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unexpected error',
        });
        failureCount++;
      }
    }

    // If no files were successfully added, return an error
    if (successCount === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No project files could be downloaded',
          results,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Generate the ZIP file
    console.log(`Generating ZIP file with ${successCount} project files...`);
    const zipContent = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    // Generate filename with current date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const zipFileName = `project_files_${dateStr}.zip`;

    console.log(
      `ZIP file generated: ${zipFileName} (${zipContent.length} bytes)`,
    );

    // Return the ZIP file as a binary response
    return new Response(zipContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
        'Content-Length': zipContent.length.toString(),
        'X-Download-Results': JSON.stringify({
          success: true,
          total: fileIds.length,
          success_count: successCount,
          failure_count: failureCount,
          results,
        }),
      },
    });
  } catch (error) {
    console.error('Error in bulk-download-project-files function:', error);

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
