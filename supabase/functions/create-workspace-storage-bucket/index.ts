import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

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

    const { workspace_id } = await req.json();

    if (!workspace_id) {
      throw new Error('Missing required field: workspace_id');
    }

    const bucketName = `workspace-${workspace_id}-documents`;

    console.log(`Creating storage bucket: ${bucketName}`);

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
          'application/json'
        ]
      });

    if (bucketError) {
      console.error('Error creating bucket:', bucketError);
      throw new Error(`Failed to create bucket: ${bucketError.message}`);
    }

    console.log(`Successfully created storage bucket: ${bucketName}`);

    return new Response(
      JSON.stringify({
        success: true,
        bucket_name: bucketName,
        workspace_id,
        message: 'Storage bucket created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in create-workspace-storage-bucket function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}); 