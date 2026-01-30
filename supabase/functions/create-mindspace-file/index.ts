import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// File validation constants
const MAX_CONTENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB max for markdown content

interface CreateMindspaceFileRequest {
  workspace_id: string;
  project_id: string;
  content: string;
  file_name?: string;
  category_id?: number;
}

/**
 * Extract a meaningful title from markdown content
 * @param content - The markdown content to analyze
 * @returns string - The extracted title or first 30 characters
 */
function extractTitleFromContent(content: string): string {
  if (!content || content.trim().length === 0) {
    return 'Untitled document';
  }

  const lines = content.split('\n').filter((line) => line.trim());

  // Look for markdown headers (# Title, ## Title, etc.)
  for (const line of lines) {
    const headerMatch = line.match(/^#+\s*(.+)$/);
    if (headerMatch && headerMatch[1].trim()) {
      return headerMatch[1].trim().substring(0, 30);
    }
  }

  // If no headers, look for the first meaningful line
  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine && !cleanLine.startsWith('#') && cleanLine.length > 3) {
      return cleanLine.substring(0, 30);
    }
  }

  // Fallback to first 30 characters of content
  const cleanContent = content.replace(/[\n\r\t]+/g, ' ').trim();
  if (cleanContent.length > 3) {
    return cleanContent.substring(0, 30);
  }

  return 'Untitled document';
}

/**
 * Generate a smart filename with timestamp
 * @param content - The file content
 * @param providedName - Optional provided filename
 * @returns string - Generated filename with timestamp
 */
function generateSmartFilename(content: string, providedName?: string): string {
  let title: string;

  if (providedName) {
    // Use provided name, remove extension if present
    title = providedName.replace(/\.md$/, '').substring(0, 30);
  } else {
    // Extract title from content
    title = extractTitleFromContent(content);
  }

  // Clean the title for use in filename
  const cleanTitle = title
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  return `${cleanTitle}.md`;
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

    // Parse JSON body
    const body: CreateMindspaceFileRequest = await req.json();
    const { workspace_id, project_id, content, file_name, category_id } = body;

    if (!workspace_id || !project_id || content === undefined) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: workspace_id, project_id, content',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Validate content size
    const contentBytes = new TextEncoder().encode(content).length;
    if (contentBytes > MAX_CONTENT_SIZE_BYTES) {
      return new Response(
        JSON.stringify({
          error: `Content size exceeds maximum allowed size of 5MB`,
          max_size_bytes: MAX_CONTENT_SIZE_BYTES,
          content_size_bytes: contentBytes,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `User ${userId} creating markdown file (${contentBytes} bytes)`,
    );

    // Validate user's mindspace bucket
    const { data: mindspaceBucket, error: bucketError } = await supabase
      .from('loopops_mindspace_buckets')
      .select('id, bucket_name, user_id')
      .eq('workspace_id', workspace_id)
      .eq('project_id', project_id)
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
          workspace_id,
          project_id,
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

    // Use provided filename as-is, or generate smart filename if not provided
    const finalFileName = file_name || generateSmartFilename(content);

    // Create file path: {user_id}/{timestamp}_{filename}
    const timestamp = Date.now();
    const sanitizedFilename = finalFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${userId}/${timestamp}_${sanitizedFilename}`;

    console.log(
      `Creating markdown file in storage: ${mindspaceBucket.bucket_name}/${filePath}`,
    );

    // Convert content to Uint8Array for upload
    const contentBuffer = new TextEncoder().encode(content);

    // Upload markdown file to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(mindspaceBucket.bucket_name)
      .upload(filePath, contentBuffer, {
        contentType: 'text/markdown',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading file to storage:', uploadError);
      return new Response(
        JSON.stringify({
          error: `Failed to create file: ${uploadError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Successfully created file in storage: ${uploadData.path}`);

    // Create database record
    const { data: fileRecord, error: dbError } = await supabase
      .from('loopops_mindspace_files')
      .insert({
        mindspace_bucket_id: mindspaceBucket.id,
        file_path: uploadData.path,
        file_name: finalFileName, // Use the filename as-is (from backend or generated)
        file_size: contentBytes,
        mime_type: 'text/markdown',
        created_in_editor: true, // Mark as created in editor
        category_id: category_id || 1, // Default to 1 (All)
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
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Markdown file created successfully',
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
    console.error('Error in create-mindspace-file function:', error);

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
