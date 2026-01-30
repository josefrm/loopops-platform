import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// File validation constants
const MAX_FILE_SIZE_MB = parseInt(Deno.env.get('MAX_FILE_SIZE_MB') || '30');
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // Convert to bytes

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'text/markdown',
  'text/plain',
];

interface UploadMindspaceFileRequest {
  workspace_id: string;
  project_id: string;
  file: File;
  category_id?: number;
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

    // Create a client with the user's token to get their ID
    const userToken = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(userToken);

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
    const category_id_str = formData.get('category_id') as string;
    const category_id = category_id_str ? parseInt(category_id_str) : 1;

    if (!file || !workspace_id || !project_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: file, workspace_id, project_id',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Create request object following the interface
    const request: UploadMindspaceFileRequest = {
      workspace_id,
      project_id,
      file,
    };

    // Validate file size
    if (request.file.size > MAX_FILE_SIZE_BYTES) {
      return new Response(
        JSON.stringify({
          error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE_MB}MB`,
          max_size_mb: MAX_FILE_SIZE_MB,
          file_size_mb: (request.file.size / 1024 / 1024).toFixed(2),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(request.file.type)) {
      return new Response(
        JSON.stringify({
          error:
            'Invalid file type. Allowed types: PDF, PNG, JPG, DOCX, MD, TXT',
          provided_type: request.file.type,
          allowed_types: ALLOWED_MIME_TYPES,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `User ${userId} uploading file: ${request.file.name} (${request.file.size} bytes, ${request.file.type})`,
    );

    // Validate user's mindspace bucket
    const { data: mindspaceBucket, error: bucketError } = await supabase
      .from('loopops_mindspace_buckets')
      .select('id, bucket_name, user_id')
      .eq('workspace_id', request.workspace_id)
      .eq('project_id', request.project_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (bucketError && bucketError.code !== 'PGRST116') {
      console.error('Error checking mindspace bucket:', bucketError);
      return new Response(
        JSON.stringify({
          error: `Failed to validate bucket: ${bucketError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!mindspaceBucket) {
      return new Response(
        JSON.stringify({
          error:
            'No mindspace bucket found for user. Please create a mindspace bucket first.',
          workspace_id: request.workspace_id,
          project_id: request.project_id,
          user_id: userId,
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verify user owns the bucket (additional security check)
    if (mindspaceBucket.user_id !== userId) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized: Bucket does not belong to user',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `Validated mindspace bucket: ${mindspaceBucket.bucket_name} (${mindspaceBucket.id})`,
    );

    // Create file path: {user_id}/{timestamp}_{filename}
    const timestamp = Date.now();
    const sanitizedFilename = request.file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${timestamp}_${sanitizedFilename}`;

    console.log(
      `Uploading file to storage: ${mindspaceBucket.bucket_name}/${filePath}`,
    );

    // Convert file to ArrayBuffer for upload
    const fileBuffer = await request.file.arrayBuffer();

    // Upload file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(mindspaceBucket.bucket_name)
      .upload(filePath, fileBuffer, {
        contentType: request.file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return new Response(
        JSON.stringify({
          error: `Failed to upload file: ${uploadError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Successfully uploaded file to storage: ${uploadData.path}`);

    // Create database record
    const { data: fileRecord, error: dbError } = await supabase
      .from('loopops_mindspace_files')
      .insert({
        mindspace_bucket_id: mindspaceBucket.id,
        file_path: uploadData.path,
        file_name: request.file.name,
        file_size: request.file.size,
        mime_type: request.file.type,
        created_in_editor: false, // Mark as uploaded file, not created in editor
        category_id: category_id,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error creating database record:', dbError);

      // Rollback: Delete the uploaded file
      console.log('Rolling back: Deleting uploaded file from storage...');
      const { error: deleteError } = await supabase.storage
        .from(mindspaceBucket.bucket_name)
        .remove([uploadData.path]);

      if (deleteError) {
        console.error('Failed to rollback (delete file):', deleteError);
      } else {
        console.log('Successfully rolled back file upload');
      }

      return new Response(
        JSON.stringify({
          error: `Failed to create file record: ${dbError.message}`,
          rollback_status: deleteError ? 'failed' : 'success',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Successfully created file record: ${fileRecord.id}`);

    // Get a signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(mindspaceBucket.bucket_name)
      .createSignedUrl(uploadData.path, 3600);

    if (urlError) {
      console.error('Error creating signed URL:', urlError);
      // We continue even if signed URL fails, as the file is committed
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'File uploaded successfully',
        file: {
          id: fileRecord.id,
          file_name: fileRecord.file_name,
          file_path: fileRecord.file_path,
          file_size: fileRecord.file_size,
          mime_type: fileRecord.mime_type,
          created_at: fileRecord.created_at,
          bucket_name: mindspaceBucket.bucket_name,
          signed_url: urlData?.signedUrl,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in upload-mindspace-file function:', error);

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
