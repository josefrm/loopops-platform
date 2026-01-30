import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
} from 'https://esm.sh/docx@8.5.0';
import { corsHeaders } from '../_shared/cors.ts';

// File validation constants
const MAX_CONTENT_SIZE_BYTES = 5 * 1024 * 1024; // 5MB max for markdown content

// DOCX mime type constant
const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

interface UpdateMindspaceFileRequest {
  file_id: string;
  content: string;
}

/**
 * Converts plain text content to a valid DOCX document buffer.
 * Splits content by newlines and creates paragraphs for each line.
 */
async function convertTextToDocx(content: string): Promise<Uint8Array> {
  const paragraphs = content.split('\n').map(
    (line) =>
      new Paragraph({
        children: [new TextRun(line)],
      }),
  );

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
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
    const body: UpdateMindspaceFileRequest = await req.json();
    const { file_id, content } = body;

    if (!file_id || content === undefined) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: file_id, content',
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
      `User ${userId} updating file ${file_id} (${contentBytes} bytes text)`,
    );

    // Get the file record and verify ownership through the bucket
    const { data: fileRecord, error: fileError } = await supabase
      .from('loopops_mindspace_files')
      .select(
        `
        id,
        file_path,
        file_name,
        mime_type,
        mindspace_bucket_id,
        loopops_mindspace_buckets (
          id,
          bucket_name,
          user_id
        )
      `,
      )
      .eq('id', file_id)
      .single();

    if (fileError || !fileRecord) {
      console.error('Error fetching file record:', fileError);
      return new Response(
        JSON.stringify({
          error: 'File not found',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const bucket = (fileRecord as any).loopops_mindspace_buckets;

    if (!bucket) {
      return new Response(
        JSON.stringify({
          error: 'Bucket not found for file',
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Verify user owns the bucket (security check)
    if (bucket.user_id !== userId) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized: File does not belong to user',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(
      `Validated file ownership: ${fileRecord.file_name} in bucket ${bucket.bucket_name}`,
    );

    // Determine file content buffer based on mime type
    let contentBuffer: Uint8Array;
    let finalFileSize: number;
    let uploadContentType: string;

    if (fileRecord.mime_type === DOCX_MIME_TYPE) {
      // Convert text content to valid DOCX format
      console.log(
        `Converting text content to DOCX format for file: ${fileRecord.file_name}`,
      );
      contentBuffer = await convertTextToDocx(content);
      finalFileSize = contentBuffer.length;
      uploadContentType = DOCX_MIME_TYPE;
      console.log(`Generated DOCX file: ${finalFileSize} bytes`);
    } else {
      // For other text-based files (markdown, plain text), use text encoding
      contentBuffer = new TextEncoder().encode(content);
      finalFileSize = contentBuffer.length;
      uploadContentType = fileRecord.mime_type || 'text/markdown';
    }

    // Update file in storage (using upsert to overwrite existing file)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket.bucket_name)
      .upload(fileRecord.file_path, contentBuffer, {
        contentType: uploadContentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Error updating file in storage:', uploadError);
      return new Response(
        JSON.stringify({
          error: `Failed to update file: ${uploadError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Successfully updated file in storage: ${uploadData.path}`);

    // Update database record with new file size and updated_at timestamp
    const { data: updatedRecord, error: dbError } = await supabase
      .from('loopops_mindspace_files')
      .update({
        file_size: finalFileSize,
        updated_at: new Date().toISOString(),
      })
      .eq('id', file_id)
      .select()
      .single();

    if (dbError) {
      console.error('Error updating database record:', dbError);
      // Note: File is already updated in storage, but we continue to report success
      // since the content is saved, only metadata update failed
    }

    console.log(`Successfully updated file record: ${file_id}`);

    // Get a signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucket.bucket_name)
      .createSignedUrl(fileRecord.file_path, 3600);

    if (urlError) {
      console.error('Error creating signed URL:', urlError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'File updated successfully',
        file: {
          id: file_id,
          file_name: fileRecord.file_name,
          file_path: fileRecord.file_path,
          file_size: finalFileSize,
          mime_type: fileRecord.mime_type,
          updated_at: updatedRecord?.updated_at || new Date().toISOString(),
          bucket_name: bucket.bucket_name,
          signed_url: urlData?.signedUrl,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Error in update-mindspace-file function:', error);

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
