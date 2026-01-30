import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface DeleteProjectFileRequest {
  file_id?: string; // Single file ID (backwards compatible)
  file_ids?: string[]; // Multiple file IDs for bulk delete
}

interface DeleteResult {
  id: string;
  file_name: string;
  file_path: string;
  success: boolean;
  error?: string;
  storage_deletion_status: 'success' | 'failed';
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
    const request: DeleteProjectFileRequest = await req.json();

    // Support both single file_id and bulk file_ids
    const fileIds: string[] =
      request.file_ids || (request.file_id ? [request.file_id] : []);

    if (fileIds.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: file_id or file_ids',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const isBulkDelete = fileIds.length > 1;
    console.log(
      `User ${userId} requesting to delete ${
        fileIds.length
      } project file(s): ${fileIds.join(', ')}`,
    );

    // Process deletions
    const results: DeleteResult[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const fileId of fileIds) {
      try {
        // Get file record with bucket and project information
        const { data: fileRecord, error: fileError } = await supabase
          .from('loopops_stage_files')
          .select(
            `
            id,
            file_path,
            file_name,
            stage_bucket_id,
            loopops_stage_buckets (
              id,
              bucket_name,
              project_stage_id,
              loopops_project_stages (
                id,
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
            file_path: '',
            success: false,
            error:
              fileError.code === 'PGRST116'
                ? 'File not found'
                : fileError.message,
            storage_deletion_status: 'failed',
          });
          failureCount++;
          continue;
        }

        // Verify user owns the file (through the workspace)
        if (
          fileRecord.loopops_stage_buckets.loopops_project_stages
            .loopops_projects.loopops_workspaces.owner_id !== userId
        ) {
          console.error(
            `Access denied for file ${fileId}: user ${userId} does not own it`,
          );
          results.push({
            id: fileId,
            file_name: fileRecord.file_name,
            file_path: fileRecord.file_path,
            success: false,
            error: 'Access denied: You do not own this file',
            storage_deletion_status: 'failed',
          });
          failureCount++;
          continue;
        }

        console.log(
          `File ${fileId} belongs to user ${userId}, proceeding with deletion`,
        );

        // Delete file from storage
        const bucketName = fileRecord.loopops_stage_buckets.bucket_name;
        const filePath = fileRecord.file_path;

        const { error: storageError } = await supabase.storage
          .from(bucketName)
          .remove([filePath]);

        if (storageError) {
          console.error(
            `Error deleting file ${fileId} from storage:`,
            storageError,
          );
          // Don't fail the entire operation if storage deletion fails
          console.warn(
            'Continuing with database deletion despite storage error',
          );
        } else {
          console.log(`Successfully deleted file from storage: ${filePath}`);
        }

        // Delete file record from database
        const { error: dbError } = await supabase
          .from('loopops_stage_files')
          .delete()
          .eq('id', fileId);

        if (dbError) {
          console.error(
            `Error deleting file record ${fileId} from database:`,
            dbError,
          );
          results.push({
            id: fileId,
            file_name: fileRecord.file_name,
            file_path: fileRecord.file_path,
            success: false,
            error: `Failed to delete file record: ${dbError.message}`,
            storage_deletion_status: storageError ? 'failed' : 'success',
          });
          failureCount++;
          continue;
        }

        console.log(`Successfully deleted file record: ${fileId}`);
        results.push({
          id: fileRecord.id,
          file_name: fileRecord.file_name,
          file_path: fileRecord.file_path,
          success: true,
          storage_deletion_status: storageError ? 'failed' : 'success',
        });
        successCount++;
      } catch (error) {
        console.error(`Unexpected error deleting file ${fileId}:`, error);
        results.push({
          id: fileId,
          file_name: '',
          file_path: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unexpected error',
          storage_deletion_status: 'failed',
        });
        failureCount++;
      }
    }

    // Return appropriate response based on bulk or single delete
    if (isBulkDelete) {
      return new Response(
        JSON.stringify({
          success: failureCount === 0,
          message: `Deleted ${successCount} of ${fileIds.length} project files`,
          total: fileIds.length,
          success_count: successCount,
          failure_count: failureCount,
          results,
        }),
        {
          status: failureCount === fileIds.length ? 500 : 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    } else {
      // Single file delete - maintain backwards compatible response
      const result = results[0];
      if (result.success) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Project file deleted successfully',
            file: {
              id: result.id,
              file_name: result.file_name,
              file_path: result.file_path,
            },
            storage_deletion_status: result.storage_deletion_status,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: result.error,
          }),
          {
            status: result.error === 'File not found' ? 404 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    }
  } catch (error) {
    console.error('Error in delete-project-files function:', error);

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
