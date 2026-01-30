import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { CopyFileResult, copySingleFile } from '../_shared/mindspace-copy.ts';

// Request can have either single file or array of files
interface CopyFileRequest {
  mindspace_file_id?: string; // UUID (single file - backward compatible)
  mindspace_file_ids?: string[]; // UUIDs (bulk files)
  project_stage_id: string; // UUID
}

// Response for single file (backward compatible)
interface CopyFileResponse {
  success: boolean;
  stage_file_id: string;
  message: string;
}

// Response for bulk operation
interface BulkCopyFileResponse {
  success: boolean;
  message: string;
  results: CopyFileResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
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
    const requestBody = (await req.json()) as CopyFileRequest;
    const { mindspace_file_id, mindspace_file_ids, project_stage_id } =
      requestBody;

    // Determine if this is a single or bulk operation
    const fileIds: string[] = mindspace_file_ids
      ? mindspace_file_ids
      : mindspace_file_id
      ? [mindspace_file_id]
      : [];

    if (fileIds.length === 0 || !project_stage_id) {
      return new Response(
        JSON.stringify({
          error:
            'Missing required fields: mindspace_file_id or mindspace_file_ids, and project_stage_id',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Validate UUID format for all file IDs and project stage ID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(project_stage_id)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid UUID format for project_stage_id',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const invalidFileIds = fileIds.filter((id) => !uuidRegex.test(id));
    if (invalidFileIds.length > 0) {
      return new Response(
        JSON.stringify({
          error: `Invalid UUID format for file IDs: ${invalidFileIds.join(
            ', ',
          )}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const isBulkOperation = fileIds.length > 1;

    console.log(
      `Copying ${fileIds.length} mindspace file(s) to stage ${project_stage_id} for user ${userId}`,
    );

    const promise = fileIds.map((fileId) =>
      copySingleFile(supabaseAdmin, fileId, project_stage_id, userId),
    );

    const results: CopyFileResult[] = await Promise.all(promise);

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    if (!isBulkOperation) {
      // Single file operation - backward compatible response
      const result = results[0];
      if (result.success) {
        const response: CopyFileResponse = {
          success: true,
          stage_file_id: result.stage_file_id!,
          message: 'File successfully copied from mindspace to stage',
        };
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: result.error,
          }),
          {
            status: result.error?.includes('already exists') ? 409 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
    } else {
      // Bulk operation response
      const response: BulkCopyFileResponse = {
        success: failed === 0,
        message:
          failed === 0
            ? `All ${succeeded} file(s) copied successfully`
            : `${succeeded} of ${fileIds.length} file(s) copied successfully`,
        results,
        summary: {
          total: fileIds.length,
          succeeded,
          failed,
        },
      };

      return new Response(JSON.stringify(response), {
        status: failed === 0 ? 200 : 207, // 207 Multi-Status for partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in copy-mindspace-to-stage function:', error);

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
