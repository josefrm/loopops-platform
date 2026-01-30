import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { extractMetadata, processDocument } from '../_shared/knowledge-base.ts';

// File validation constants
const MAX_FILE_SIZE_MB = parseInt(Deno.env.get('MAX_FILE_SIZE_MB') || '30');
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'text/markdown',
  'text/plain',
];

interface UploadProjectContextFileRequest {
  workspace_id: string;
  project_id: string;
  stage_id: string;
  file: File;
}

interface UploadProjectContextFileResponse {
  success: boolean;
  stage_file_id: string;
  message: string;
  file: {
    id: string;
    file_name: string;
    file_path: string;
    file_size: number;
    mime_type: string;
    created_at: string;
    bucket_name: string;
    signed_url?: string;
  };
  // Extracted metadata from the document
  metadata?: {
    summary: string;
    tags: string[];
    category: string;
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

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const workspace_id = formData.get('workspace_id') as string;
    const project_id = formData.get('project_id') as string;
    const stage_id = formData.get('stage_id') as string;

    if (!file || !workspace_id || !project_id || !stage_id) {
      return new Response(
        JSON.stringify({
          error:
            'Missing required fields: file, workspace_id, project_id, stage_id',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Validate UUID format for stage_id
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(stage_id)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid UUID format for stage_id',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return new Response(
        JSON.stringify({
          error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE_MB}MB`,
          max_size_mb: MAX_FILE_SIZE_MB,
          file_size_mb: (file.size / 1024 / 1024).toFixed(2),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({
          error:
            'Invalid file type. Allowed types: PDF, PNG, JPG, DOCX, MD, TXT',
          provided_type: file.type,
          allowed_types: ALLOWED_MIME_TYPES,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `User ${userId} uploading file to project context: ${file.name} (${file.size} bytes, ${file.type})`,
    );

    // Step 1: Verify user has access to the project stage and get workspace info
    const { data: stageAccess, error: accessError } = await supabaseAdmin
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
        )
      `,
      )
      .eq('id', stage_id)
      .eq('project_id', project_id)
      .maybeSingle();

    if (accessError) {
      console.error('Error checking stage access:', accessError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify stage access permissions' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!stageAccess) {
      return new Response(
        JSON.stringify({
          error: 'Project stage not found or does not belong to the project',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verify workspace_id matches
    if (stageAccess.projects.workspace_id !== workspace_id) {
      return new Response(
        JSON.stringify({
          error: 'Workspace ID does not match the project workspace',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verify user owns the workspace
    if (stageAccess.projects.workspaces.owner_id !== userId) {
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

    console.log(`User ${userId} has access to stage ${stage_id}`);

    // Step 2: Get or verify stage bucket exists
    const { data: stageBucket, error: bucketError } = await supabaseAdmin
      .from('loopops_stage_buckets')
      .select('id, bucket_name, project_stage_id')
      .eq('project_stage_id', stage_id)
      .maybeSingle();

    if (bucketError && bucketError.code !== 'PGRST116') {
      console.error('Error querying stage bucket:', bucketError);
      return new Response(
        JSON.stringify({ error: 'Failed to query stage bucket' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!stageBucket) {
      return new Response(
        JSON.stringify({
          error:
            'Stage bucket not found. Please ensure the stage bucket is created first.',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `Using stage bucket: ${stageBucket.bucket_name} (${stageBucket.id})`,
    );

    // Step 3: Generate unique file path and upload to stage bucket
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${timestamp}-${sanitizedFilename}`;

    console.log(
      `Uploading file to storage: ${stageBucket.bucket_name}/${filePath}`,
    );

    // Convert file to ArrayBuffer for upload
    const fileBuffer = await file.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(stageBucket.bucket_name)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file to stage bucket:', uploadError);
      return new Response(
        JSON.stringify({
          error: `Failed to upload file to stage: ${uploadError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Successfully uploaded file to storage: ${uploadData.path}`);

    // Step 4: Create stage file record and call knowledge base API
    let newStageFile;
    let extractedMetadata:
      | { summary: string; tags: string[]; category: string }
      | undefined;

    try {
      // Insert into stage_files table
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('loopops_stage_files')
        .insert({
          stage_bucket_id: stageBucket.id,
          file_path: uploadData.path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        })
        .select('id, file_name, file_path, file_size, mime_type, created_at')
        .single();

      if (insertError) {
        throw new Error(
          `Failed to create stage file record: ${insertError.message}`,
        );
      }

      newStageFile = insertData;
      console.log(`Successfully created stage file record: ${newStageFile.id}`);

      // Step 5: Call knowledge base API to vectorize the document
      console.log('Setting up knowledge base for the uploaded file...');

      try {
        // Step 5a: Extract metadata
        console.log('Extracting metadata...');
        const metadata = await extractMetadata({
          storage_key: uploadData.path,
          bucket_name: stageBucket.bucket_name,
          project_id: project_id,
          stage_id: stage_id,
          workspace_id: workspace_id,
        });

        console.log('Metadata extracted successfully:', metadata);

        // Store the extracted metadata to return in response
        extractedMetadata = {
          summary: metadata.summary,
          tags: metadata.tags,
          category: metadata.category,
        };

        // Step 5b: Process document with extracted metadata
        console.log('Processing document for knowledge base...');
        const kbResult = await processDocument({
          storage_key: uploadData.path,
          bucket_name: stageBucket.bucket_name,
          project_id: project_id,
          stage_id: stage_id,
          workspace_id: workspace_id,
          summary: metadata.summary,
          tags: metadata.tags,
          category: metadata.category,
        });

        console.log('Knowledge base setup successful:', kbResult.message);
      } catch (kbError) {
        console.warn(
          'Knowledge base setup failed, but file was uploaded successfully:',
          kbError,
        );
        // Don't fail the entire operation if knowledge base setup fails
      }
    } catch (error) {
      console.error('Error in database/API operations:', error);

      // Rollback: Clean up the uploaded file from storage
      try {
        console.log('Rolling back: removing uploaded file from storage...');
        await supabaseAdmin.storage
          .from(stageBucket.bucket_name)
          .remove([uploadData.path]);
        console.log('Storage cleanup successful');
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }

      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Operation failed',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 6: Get a signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from(stageBucket.bucket_name)
      .createSignedUrl(uploadData.path, 3600);

    if (urlError) {
      console.error('Error creating signed URL:', urlError);
      // We continue even if signed URL fails, as the file is committed
    }

    const response: UploadProjectContextFileResponse = {
      success: true,
      stage_file_id: newStageFile.id,
      message:
        'File successfully uploaded to project context and queued for vectorization',
      file: {
        id: newStageFile.id,
        file_name: newStageFile.file_name,
        file_path: newStageFile.file_path,
        file_size: newStageFile.file_size,
        mime_type: newStageFile.mime_type,
        created_at: newStageFile.created_at,
        bucket_name: stageBucket.bucket_name,
        signed_url: urlData?.signedUrl,
      },
      metadata: extractedMetadata,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in upload-project-context-file function:', error);

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
