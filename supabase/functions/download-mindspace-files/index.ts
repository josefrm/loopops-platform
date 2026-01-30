import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import JSZip from 'https://esm.sh/jszip@3.10.1';
import { corsHeaders } from '../_shared/cors.ts';

interface DownloadMindspaceFilesRequest {
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
    const request: DownloadMindspaceFilesRequest = await req.json();

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
      `User ${userId} requesting to download ${
        fileIds.length
      } file(s): ${fileIds.join(', ')}`,
    );

    // If only one file is requested, return it directly
    if (fileIds.length === 1) {
      const fileId = fileIds[0];

      // Get file record with bucket information
      const { data: fileRecord, error: fileError } = await supabase
        .from('loopops_mindspace_files')
        .select(
          `
          id,
          file_path,
          file_name,
          mime_type,
          loopops_mindspace_buckets (
            id,
            bucket_name,
            user_id
          )
        `,
        )
        .eq('id', fileId)
        .single();

      if (fileError) {
        console.error(`Error fetching file record for ${fileId}:`, fileError);
        return new Response(
          JSON.stringify({
            error:
              fileError.code === 'PGRST116'
                ? 'File not found'
                : fileError.message,
          }),
          {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // Verify user owns the file (through the bucket)
      if (fileRecord.loopops_mindspace_buckets.user_id !== userId) {
        console.error(
          `Access denied for file ${fileId}: user ${userId} does not own it`,
        );
        return new Response(
          JSON.stringify({ error: 'Access denied: You do not own this file' }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      // Download the file from storage
      const bucketName = fileRecord.loopops_mindspace_buckets.bucket_name;
      const filePath = fileRecord.file_path;

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
            error: downloadError?.message || 'Failed to download file',
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }

      console.log(
        `Streaming single file: ${fileRecord.file_name} (${fileData.size} bytes)`,
      );

      // Return the file directly
      return new Response(fileData, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': fileRecord.mime_type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${fileRecord.file_name}"`,
          'Content-Length': fileData.size.toString(),
        },
      });
    }

    // Create a new ZIP file for multiple files
    const zip = new JSZip();
    const results: FileDownloadResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    // Track file names to handle duplicates
    const fileNameCounts: Record<string, number> = {};

    for (const fileId of fileIds) {
      try {
        // Get file record with bucket information
        const { data: fileRecord, error: fileError } = await supabase
          .from('loopops_mindspace_files')
          .select(
            `
            id,
            file_path,
            file_name,
            mime_type,
            loopops_mindspace_buckets (
              id,
              bucket_name,
              user_id
            )
          `,
          )
          .eq('id', fileId)
          .single();

        if (fileError) {
          console.error(`Error fetching file record for ${fileId}:`, fileError);
          results.push({
            id: fileId,
            file_name: '',
            success: false,
            error:
              fileError.code === 'PGRST116'
                ? 'File not found'
                : fileError.message,
          });
          failureCount++;
          continue;
        }

        // Verify user owns the file (through the bucket)
        if (fileRecord.loopops_mindspace_buckets.user_id !== userId) {
          console.error(
            `Access denied for file ${fileId}: user ${userId} does not own it`,
          );
          results.push({
            id: fileId,
            file_name: fileRecord.file_name,
            success: false,
            error: 'Access denied: You do not own this file',
          });
          failureCount++;
          continue;
        }

        // Download the file from storage
        const bucketName = fileRecord.loopops_mindspace_buckets.bucket_name;
        const filePath = fileRecord.file_path;

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
            file_name: fileRecord.file_name,
            success: false,
            error: downloadError?.message || 'Failed to download file',
          });
          failureCount++;
          continue;
        }

        // Handle duplicate file names by appending a number
        let fileName = fileRecord.file_name;
        if (fileNameCounts[fileName]) {
          const ext = fileName.lastIndexOf('.');
          if (ext > 0) {
            const name = fileName.substring(0, ext);
            const extension = fileName.substring(ext);
            fileName = `${name} (${fileNameCounts[fileName]})${extension}`;
          } else {
            fileName = `${fileName} (${fileNameCounts[fileName]})`;
          }
          fileNameCounts[fileRecord.file_name]++;
        } else {
          fileNameCounts[fileRecord.file_name] = 1;
        }

        // Add file to ZIP
        const arrayBuffer = await fileData.arrayBuffer();
        zip.file(fileName, arrayBuffer);

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
          error: 'No files could be downloaded',
          results,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Generate the ZIP file
    console.log(`Generating ZIP file with ${successCount} files...`);
    const zipContent = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    // Generate filename with current date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const zipFileName = `mindspace_${dateStr}.zip`;

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
    console.error('Error in download-mindspace-files function:', error);

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
