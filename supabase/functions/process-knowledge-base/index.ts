import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import {
  processDocument,
  ProcessDocumentRequest,
} from '../_shared/knowledge-base.ts';

// Result for a single file processing operation
interface ProcessFileResult {
  stage_file_id: string;
  success: boolean;
  error?: string;
}

// Request can have either single file or array of files
interface ProcessKbRequest extends ProcessDocumentRequest {
  stage_file_id?: string; // UUID (single file)
  stage_file_ids?: string[]; // UUIDs (bulk processing)
  file_metadata?: Record<
    string,
    { summary: string; tags: string[]; category: string }
  >; // Optional metadata map keyed by file ID
}

/**
 * Process a single stage file for the knowledge base
 */
async function processSingleStageFile(
  supabaseAdmin: ReturnType<typeof createClient>,
  stageFileId: string,
  userId: string,
  metadata?: { summary: string; tags: string[]; category: string },
): Promise<ProcessFileResult> {
  try {
    // Step 1: Get the stage file and verify user owns it
    const { data: stageFile, error: stageFileError } = await supabaseAdmin
      .from('loopops_stage_files')
      .select(
        `
        id,
        file_path,
        file_name,
        file_size,
        mime_type,
        stage_bucket:loopops_stage_buckets!inner (
          id,
          bucket_name,
          project_stage_id,
          project_stage:loopops_project_stages!inner (
            id,
            project_id,
            project:loopops_projects!inner (
              id,
              workspace_id,
              workspace:loopops_workspaces!inner (
                id,
                owner_id
              )
            )
          )
        )
      `,
      )
      .eq('id', stageFileId)
      .maybeSingle();

    if (stageFileError) {
      console.error('Error querying stage file:', stageFileError);
      return {
        stage_file_id: stageFileId,
        success: false,
        error: 'Failed to query stage file',
      };
    }

    if (!stageFile) {
      return {
        stage_file_id: stageFileId,
        success: false,
        error: 'Stage file not found',
      };
    }

    // Verify user owns this file (through workspace ownership)
    const workspaceOwnerId =
      stageFile.stage_bucket.project_stage.project.workspace.owner_id;
    if (workspaceOwnerId !== userId) {
      return {
        stage_file_id: stageFileId,
        success: false,
        error: 'Forbidden: You do not have access to this stage file',
      };
    }

    console.log(
      `Found stage file: ${stageFile.file_name} in bucket ${stageFile.stage_bucket.bucket_name}`,
    );

    // Step 2: Process document in knowledge base
    if (!metadata) {
      return {
        stage_file_id: stageFileId,
        success: false,
        error: 'Metadata is required for knowledge base processing',
      };
    }

    try {
      const projectStageId = stageFile.stage_bucket.project_stage.id;
      const projectId = stageFile.stage_bucket.project_stage.project_id;
      const workspaceId =
        stageFile.stage_bucket.project_stage.project.workspace_id;

      console.log('Processing document for knowledge base...');
      const kbResult = await processDocument({
        storage_key: stageFile.file_path,
        bucket_name: stageFile.stage_bucket.bucket_name,
        project_id: projectId,
        stage_id: projectStageId,
        workspace_id: workspaceId,
        summary: metadata.summary,
        tags: metadata.tags,
        category: metadata.category,
      });

      console.log('Knowledge base setup successful:', kbResult.message);
    } catch (kbError) {
      console.error('Knowledge base setup failed:', kbError);
      return {
        stage_file_id: stageFileId,
        success: false,
        error:
          kbError instanceof Error
            ? kbError.message
            : 'Knowledge base processing failed',
      };
    }

    return {
      stage_file_id: stageFileId,
      success: true,
    };
  } catch (error) {
    console.error('Error processing stage file:', error);
    return {
      stage_file_id: stageFileId,
      success: false,
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestData: ProcessKbRequest = await req.json();
    const { stage_file_id, stage_file_ids, file_metadata } = requestData;

    // Check if this is a stage file processing operation
    if (stage_file_id || (stage_file_ids && stage_file_ids.length > 0)) {
      console.log('Processing stage files for knowledge base');
      if (file_metadata) {
        console.log(
          `Received metadata for ${Object.keys(file_metadata).length} files`,
        );
      }

      // Initialize Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // User auth check
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('Missing authorization header');
      }

      const userToken = authHeader.replace('Bearer ', '');
      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(userToken);

      if (authError || !user) {
        throw new Error('Unauthorized');
      }

      const userId = user.id;

      // Determine IDs to process
      const fileIds: string[] = stage_file_ids
        ? stage_file_ids
        : stage_file_id
        ? [stage_file_id]
        : [];

      console.log(`Processing ${fileIds.length} stage files for KB setup`);

      const results: ProcessFileResult[] = [];

      for (const fileId of fileIds) {
        // Get metadata for this specific file if available
        const metadata = file_metadata ? file_metadata[fileId] : undefined;

        const result = await processSingleStageFile(
          supabaseAdmin,
          fileId,
          userId,
          metadata,
        );
        results.push(result);
      }

      const succeeded = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      return new Response(
        JSON.stringify({
          success: failed === 0,
          message:
            failed === 0
              ? `All ${succeeded} file(s) processed successfully`
              : `${succeeded} of ${fileIds.length} file(s) processed successfully`,
          results,
          summary: {
            total: fileIds.length,
            succeeded,
            failed,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: failed === 0 ? 200 : 207,
        },
      );
    }

    // Default behavior: Process single document with provided params
    // (Existing logic for direct processing)
    const result = await processDocument(requestData);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in process-knowledge-base:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
