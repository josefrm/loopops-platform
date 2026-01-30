import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

interface CreateProjectBucketRequest {
  project_id: string;
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

    const { project_id } = await req.json() as CreateProjectBucketRequest;

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: project_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if project exists
    const { data: project, error: projectError } = await supabase
      .from('loopops_projects')
      .select('id')
      .eq('id', project_id)
      .maybeSingle();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: `Project not found: ${project_id}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if project bucket already exists
    const { data: existingBucket, error: checkError } = await supabase
      .from('loopops_project_buckets')
      .select('id, bucket_name')
      .eq('project_id', project_id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing bucket:', checkError);
      return new Response(
        JSON.stringify({ error: `Failed to check existing bucket: ${checkError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingBucket) {
      console.log(`Project bucket already exists: ${existingBucket.bucket_name}`);
      return new Response(
        JSON.stringify({
          success: true,
          bucket_name: existingBucket.bucket_name,
          project_bucket_id: existingBucket.id,
          message: 'Project bucket already exists'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create bucket name: project-{project_id}
    const bucketName = `project-${project_id}`;

    console.log(`Creating project storage bucket: ${bucketName}`);

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
    const { data: projectBucket, error: dbError } = await supabase
      .from('loopops_project_buckets')
      .insert({
        project_id: project_id,
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
        project_bucket_id: projectBucket.id,
        project_id,
        message: 'Project bucket created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-project-bucket function:', error);
    
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

