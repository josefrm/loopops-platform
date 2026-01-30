import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface GetDeliverablesRequest {
  workspace_id: string;
  project_id: string;
  stage_id: string; // UUID of the project stage
}

interface Deliverable {
  id: string; // Changed from number to string to support UUID
  title: string;
  description: string;
  fileSize: number;
  isKeyDeliverable: boolean;
  isDeliverable: boolean;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

interface GetDeliverablesResponse {
  items: Deliverable[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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

    const { workspace_id, project_id, stage_id } =
      (await req.json()) as GetDeliverablesRequest;

    if (!workspace_id || !project_id || !stage_id) {
      throw new Error(
        'Missing required fields: workspace_id, project_id, stage_id',
      );
    }

    console.log(
      `Fetching deliverables for workspace: ${workspace_id}, project: ${project_id}, stage: ${stage_id}`,
    );

    // Step 1: Verify the project stage exists and belongs to the project
    const { data: projectStage, error: stageError } = await supabase
      .from('loopops_project_stages')
      .select('id, project_id')
      .eq('id', stage_id)
      .eq('project_id', project_id)
      .maybeSingle();

    if (stageError) {
      console.error('Error fetching project stage:', stageError);
      throw new Error(`Failed to fetch project stage: ${stageError.message}`);
    }

    if (!projectStage) {
      console.log(
        `No stage found with id ${stage_id} for project ${project_id}`,
      );
      return new Response(
        JSON.stringify({
          items: [],
        } as GetDeliverablesResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    console.log(`Found project stage: ${projectStage.id}`);

    // Step 2: Get the stage bucket for this project stage
    const { data: stageBucket, error: bucketError } = await supabase
      .from('loopops_stage_buckets')
      .select('id')
      .eq('project_stage_id', projectStage.id)
      .maybeSingle();

    if (bucketError) {
      console.error('Error fetching stage bucket:', bucketError);
      throw new Error(`Failed to fetch stage bucket: ${bucketError.message}`);
    }

    if (!stageBucket) {
      console.log(`No stage bucket found for stage ${projectStage.id}`);
      return new Response(
        JSON.stringify({
          items: [],
        } as GetDeliverablesResponse),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    // Step 3: Query stage files that are linked to deliverable templates
    const { data: stageFiles, error: filesError } = await supabase
      .from('loopops_stage_files')
      .select(
        `
        id,
        file_name,
        file_size,
        mime_type,
        is_deliverable,
        is_key_deliverable,
        created_at,
        updated_at
      `,
      )
      .eq('stage_bucket_id', stageBucket.id)
      .eq('is_deliverable', true)
      .order('created_at', { ascending: false });

    if (filesError) {
      console.error('Error fetching stage files:', filesError);
      throw new Error(`Failed to fetch stage files: ${filesError.message}`);
    }

    console.log(`Found ${stageFiles?.length || 0} files in stage bucket`);

    // Step 4: Transform the data to match the expected response format
    const items: Deliverable[] = (stageFiles || []).map((file, index) => {
      return {
        id: file.id, // Use UUID from file
        title: file.file_name,
        description: `${(file.file_size / 1024).toFixed(1)} KB • ${
          file.mime_type
        }`,
        fileSize: file.file_size,
        isDeliverable: file.is_deliverable,
        isKeyDeliverable: file.is_key_deliverable,
        created_at: file.created_at,
        updated_at: file.updated_at,
      };
    });

    const response: GetDeliverablesResponse = {
      items,
    };

    console.log(`Successfully fetched ${items.length} deliverables`);

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control':
          'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Error in get-deliverables-v2 function:', error);

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
