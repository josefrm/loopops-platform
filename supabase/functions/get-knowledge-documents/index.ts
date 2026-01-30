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

    console.log(`Fetching knowledge documents for workspace: ${workspace_id}`);

    // Get the bucket name for this workspace
    const bucketName = `workspace-${workspace_id}-documents`;

    // List all folders in the root of the bucket (these are the document folders)
    console.log(`Attempting to list contents of bucket: ${bucketName}`);
    const { data: folders, error: storageError } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (storageError) {
      console.error('Error fetching from storage:', storageError);
      throw new Error(`Failed to fetch from storage: ${storageError.message}`);
    }

    console.log(`Found ${folders?.length || 0} folders in storage bucket: ${bucketName}`);
    console.log('Folders:', folders);

    // Get files from each document folder
    let allFiles: any[] = [];
    if (folders && folders.length > 0) {
      for (const folder of folders) {
        if (folder.name && folder.name.startsWith('doc-')) {
          console.log(`Listing files in folder: ${folder.name}`);
          const { data: folderFiles, error: folderError } = await supabase.storage
            .from(bucketName)
            .list(folder.name, {
              limit: 1000,
              offset: 0
            });
          
          if (folderError) {
            console.error(`Error listing folder ${folder.name}:`, folderError);
          } else if (folderFiles) {
            allFiles = allFiles.concat(folderFiles.map(file => ({
              ...file,
              folder: folder.name
            })));
            console.log(`Found ${folderFiles.length} files in folder ${folder.name}`);
          }
        }
      }
    }

    const files = allFiles;
    console.log(`Total files found: ${files.length}`);

    // Transform the storage files to match the frontend interface
    const documents = files.map((file) => {
      // Extract document name from filename (remove timestamp prefix)
      const fileName = file.name;
      const nameMatch = fileName.match(/^\d+-(.+)$/);
      const displayName = nameMatch ? nameMatch[1] : fileName;
      
      // Determine file type based on extension
      const extension = fileName.split('.').pop()?.toLowerCase();
      let type: 'policy' | 'guideline' | 'template' | 'process' = 'guideline';
      
      if (extension === 'pdf') type = 'policy';
      else if (extension === 'doc' || extension === 'docx') type = 'template';
      else if (extension === 'txt' || extension === 'md') type = 'guideline';

      return {
        id: fileName,
        name: displayName,
        type: type,
        description: `Document: ${displayName}`,
        content: 'Content available in storage',
        uploadedAt: new Date(file.created_at),
        tags: [type, extension || 'file'],
        status: 'completed',
        totalChunks: 1,
        filePath: `${file.folder}/${fileName}`,
        fileSize: file.metadata?.size || 0,
        mimeType: file.metadata?.mimetype || 'application/octet-stream'
      };
    });

    console.log(`Successfully fetched ${documents.length} documents for workspace ${workspace_id}`);

    console.log(`Successfully fetched ${documents.length} documents for workspace ${workspace_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        documents,
        workspace_id,
        message: 'Knowledge documents fetched successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in get-knowledge-documents function:', error);
    
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