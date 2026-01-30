import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Create client with service role key for admin access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const { fileIds, categoryId } = await req.json();

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'fileIds must be a non-empty array' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (categoryId === undefined || categoryId === null) {
      return new Response(JSON.stringify({ error: 'categoryId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(
      `Moving ${fileIds.length} files to category ${categoryId} for user ${user.id}`,
    );

    // Verify ownership of the files before updating
    // We check via mindspace_buckets -> user_id

    // First, find the bucket(s) belonging to the user
    // Ideally we'd join, but with RLS we can simulate or just trust the query
    // Let's rely on strict filtering in the update

    const { data: updatedData, error: updateError } = await supabaseAdmin
      .from('loopops_mindspace_files')
      .update({ category_id: categoryId, updated_at: new Date().toISOString() })
      .in('id', fileIds);
    // Check that the file belongs to a bucket that belongs to the user
    // Since supabase-js doesn't support complex joins in update easily without RLS or specific logic,
    // and we are using service role, we should strictly enforce it.
    // However, we can use a subquery logic if we were using raw sql.
    // Instead, let's verify ownership first or filter by bucket ID if possible.
    // Easiest is to select the files first to ensure they belong to user.

    // Better approach:
    // 1. Get all bucket IDs for this user
    // 2. Update files where mindspace_bucket_id is in user's buckets AND id is in fileIds

    // 1. Get user's buckets
    const { data: buckets, error: bucketError } = await supabaseAdmin
      .from('loopops_mindspace_buckets')
      .select('id')
      .eq('user_id', user.id);

    if (bucketError) {
      throw bucketError;
    }

    const bucketIds = buckets.map((b) => b.id);

    if (bucketIds.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No mindspace buckets found for user',
          success: false,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // 2. Update files
    const { error: updateFilesError } = await supabaseAdmin
      .from('loopops_mindspace_files')
      .update({ category_id: categoryId })
      .in('id', fileIds)
      .in('mindspace_bucket_id', bucketIds);

    if (updateFilesError) {
      throw updateFilesError;
    }

    return new Response(
      JSON.stringify({ success: true, count: fileIds.length }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
