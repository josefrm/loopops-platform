import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";

interface CreateStageBucketsRequest {
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

    const { project_id } = await req.json() as CreateStageBucketsRequest;

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

    // Get all project stages for this project
    const { data: projectStages, error: stagesError } = await supabase
      .from('loopops_project_stages')
      .select('id')
      .eq('project_id', project_id);

    if (stagesError) {
      console.error('Error fetching project stages:', stagesError);
      return new Response(
        JSON.stringify({ error: `Failed to fetch project stages: ${stagesError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!projectStages || projectStages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No project stages found. Please create stages first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check which stage buckets already exist
    const { data: existingBuckets, error: existingError } = await supabase
      .from('loopops_stage_buckets')
      .select('project_stage_id')
      .in('project_stage_id', projectStages.map(s => s.id));

    if (existingError) {
      console.error('Error checking existing stage buckets:', existingError);
      return new Response(
        JSON.stringify({ error: `Failed to check existing stage buckets: ${existingError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingStageIds = new Set(existingBuckets?.map(b => b.project_stage_id) || []);
    const stagesToProcess = projectStages.filter(s => !existingStageIds.has(s.id));

    if (stagesToProcess.length === 0) {
      console.log(`All stage buckets already exist for project ${project_id}`);
      return new Response(
        JSON.stringify({
          success: true,
          project_id,
          message: 'All stage buckets already exist'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating ${stagesToProcess.length} stage buckets for project ${project_id}`);

    const createdBuckets = [];
    const errors = [];

    // Create bucket for each stage
    for (const stage of stagesToProcess) {
      try {
        const bucketName = `stage-${stage.id}`;

        // Create the storage bucket
        const { error: bucketError } = await supabase.storage
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
          console.error(`Error creating bucket ${bucketName}:`, bucketError);
          errors.push({ stage_id: stage.id, error: bucketError.message });
          continue;
        }

        // Store bucket info in database
        const { data: stageBucket, error: dbError } = await supabase
          .from('loopops_stage_buckets')
          .insert({
            project_stage_id: stage.id,
            bucket_name: bucketName
          })
          .select()
          .single();

        if (dbError) {
          console.error(`Error storing bucket info for ${bucketName}:`, dbError);
          // Try to delete the bucket we just created
          await supabase.storage.deleteBucket(bucketName);
          errors.push({ stage_id: stage.id, error: dbError.message });
          continue;
        }

        createdBuckets.push(stageBucket);
        console.log(`Successfully created stage bucket: ${bucketName}`);
      } catch (error) {
        console.error(`Error processing stage ${stage.id}:`, error);
        errors.push({ stage_id: stage.id, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    if (errors.length > 0 && createdBuckets.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create any stage buckets',
          errors
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        project_id,
        buckets: createdBuckets,
        count: createdBuckets.length,
        errors: errors.length > 0 ? errors : undefined,
        message: `Created ${createdBuckets.length} stage buckets${errors.length > 0 ? ` (${errors.length} errors)` : ''}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-stage-buckets function:', error);
    
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

