import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-attempt, x-max-retries',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface GetLoopsRequest {
  workspace_id: string;
  project_id: string;
  stage_id: number; // 1-5 (Onboard, Define, Design, Refine, Develop)
  category_id: number; // subcategory ID (13, 23, 33, 43, 53)
}

interface ProjectCategoryItem {
  id: number;
  title: string;
  description: string;
  created_at: string; // ISO string
  updated_at: string; // ISO string
  enableNextStage: boolean;
}

interface GetLoopsResponse {
  category_id: number;
  items: ProjectCategoryItem[];
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
        persistSession: false
      }
    });

    const { workspace_id, project_id, stage_id, category_id } = await req.json() as GetLoopsRequest;

    if (!workspace_id || !project_id || !stage_id || !category_id) {
      throw new Error('Missing required fields: workspace_id, project_id, stage_id, category_id');
    }

    console.log(`Fetching loops for workspace: ${workspace_id}, project: ${project_id}, stage: ${stage_id}`);

    // TODO: Replace with actual database query when data source is implemented
    // For now, return empty array as placeholder
    const items: ProjectCategoryItem[] = [];

    const response: GetLoopsResponse = {
      category_id,
      items,
    };

    console.log(`Successfully fetched ${items.length} loops`);

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in get-loops-v2 function:', error);
    
    return new Response(
      JSON.stringify({
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
