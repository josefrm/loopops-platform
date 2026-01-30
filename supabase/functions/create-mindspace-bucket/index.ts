import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

interface CreateMindspaceBucketRequest {
  workspace_id: string;
  project_id: string;
  user_id: string;
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
        persistSession: false
      }
    });

    const { workspace_id, project_id, user_id } = await req.json() as CreateMindspaceBucketRequest;

    if (!workspace_id || !project_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: workspace_id, project_id, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if mindspace bucket already exists
    const { data: existingBucket, error: checkError } = await supabase
      .from('loopops_mindspace_buckets')
      .select('id, bucket_name')
      .eq('workspace_id', workspace_id)
      .eq('project_id', project_id)
      .eq('user_id', user_id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing bucket:', checkError);
      return new Response(
        JSON.stringify({ error: `Failed to check existing bucket: ${checkError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingBucket) {
      console.log(`Mindspace bucket already exists: ${existingBucket.bucket_name}`);
      return new Response(
        JSON.stringify({
          success: true,
          bucket_name: existingBucket.bucket_name,
          mindspace_bucket_id: existingBucket.id,
          message: 'Mindspace bucket already exists'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create bucket name: ms-{workspace_id_no_hyphens}-{project_id_no_hyphens}-{user_id_no_hyphens}
    // Remove hyphens from UUIDs to shorten the name (max 100 chars in Supabase)
    // Each UUID without hyphens is 32 chars, so we need to truncate to fit: 3 + 31 + 1 + 31 + 1 + 31 = 98 chars
    const workspaceIdShort = workspace_id.replace(/-/g, '').substring(0, 31);
    const projectIdShort = project_id.replace(/-/g, '').substring(0, 31);
    const userIdShort = user_id.replace(/-/g, '').substring(0, 31);
    const bucketName = `ms-${workspaceIdShort}-${projectIdShort}-${userIdShort}`;

    console.log(`Creating Mindspace storage bucket: ${bucketName}`);

    // Create the storage bucket
    const { data: bucketData, error: bucketError } = await supabase.storage
      .createBucket(bucketName, {
        public: false,
        fileSizeLimit: 52428800, // 50MB limit
        allowedMimeTypes: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'text/plain',
          'text/markdown',
          'text/csv',
          'application/json',
          'image/png',
          'image/jpeg',
          'image/gif',
          'image/webp'
        ]
      });

    if (bucketError) {
      console.error('Error creating bucket:', bucketError);
      return new Response(
        JSON.stringify({ error: `Failed to create bucket: ${bucketError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully created storage bucket: ${bucketName}`);

    // Store bucket info in database
    const { data: mindspaceBucket, error: dbError } = await supabase
      .from('loopops_mindspace_buckets')
      .insert({
        workspace_id: workspace_id,
        project_id: project_id,
        user_id: user_id,
        bucket_name: bucketName
      })
      .select()
      .single();

    if (dbError) {
      console.error('Error storing bucket info in database:', dbError);
      // Try to delete the bucket we just created
      await supabase.storage.deleteBucket(bucketName);
      return new Response(
        JSON.stringify({ error: `Failed to store bucket info: ${dbError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        bucket_name: bucketName,
        mindspace_bucket_id: mindspaceBucket.id,
        workspace_id,
        project_id,
        user_id,
        message: 'Mindspace bucket created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-mindspace-bucket function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

