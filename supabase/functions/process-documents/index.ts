import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Text splitter implementation for document chunking
class RecursiveCharacterTextSplitter {
  private chunkSize: number;
  private chunkOverlap: number;
  private separators: string[];

  constructor(chunkSize = 1000, chunkOverlap = 200) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
    this.separators = ['\n\n', '\n', ' ', ''];
  }

  splitText(text: string): string[] {
    const chunks: string[] = [];
    this.splitTextRecursive(text, chunks);
    return chunks;
  }

  private splitTextRecursive(text: string, chunks: string[], separatorIndex = 0): void {
    if (text.length <= this.chunkSize) {
      if (text.trim()) chunks.push(text.trim());
      return;
    }

    const separator = this.separators[separatorIndex];
    const splits = text.split(separator);

    if (splits.length === 1) {
      if (separatorIndex < this.separators.length - 1) {
        this.splitTextRecursive(text, chunks, separatorIndex + 1);
      } else {
        // Force split by character if no separators work
        for (let i = 0; i < text.length; i += this.chunkSize) {
          const chunk = text.slice(i, i + this.chunkSize);
          if (chunk.trim()) chunks.push(chunk.trim());
        }
      }
      return;
    }

    let currentChunk = '';
    for (const split of splits) {
      const testChunk = currentChunk + (currentChunk ? separator : '') + split;
      
      if (testChunk.length <= this.chunkSize) {
        currentChunk = testChunk;
      } else {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        
        if (split.length > this.chunkSize) {
          this.splitTextRecursive(split, chunks, separatorIndex + 1);
        } else {
          currentChunk = split;
        }
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
  }
}

async function generateEmbedding(text: string, openaiApiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { 
      content, 
      workspace_id, 
      document_id, 
      document_type, 
      title, 
      file_path, 
      file_size, 
      mime_type, 
      extraction_method = 'direct' 
    } = await req.json();

    if (!workspace_id || !document_id || !document_type) {
      throw new Error('Missing required fields: workspace_id, document_id, document_type');
    }

    // Validate file type and content
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json'
    ];

    if (mime_type && !allowedMimeTypes.includes(mime_type)) {
      throw new Error(`Unsupported file type: ${mime_type}`);
    }

    console.log(`Processing document: ${document_id} for workspace: ${workspace_id}`);

    // Create document metadata record with enhanced information
    const { error: metadataError } = await supabase
      .from('knowledge_metadata')
      .upsert({
        document_id,
        workspace_id,
        document_type,
        title: title || document_id,
        status: 'processing',
        file_path: file_path || null,
        file_size: file_size || null,
        mime_type: mime_type || null,
        extraction_method,
        processing_started_at: new Date().toISOString()
      });

    if (metadataError) {
      console.error('Error creating metadata:', metadataError);
      throw new Error(`Failed to create metadata: ${metadataError.message}`);
    }

    // Get content to process
    let contentToProcess = content;
    
    if (extraction_method === 'storage' && file_path) {
      // For storage extraction, we'll use a placeholder content for now
      // In a full implementation, you'd download and extract text from the file
      contentToProcess = `Document: ${title || document_id}\n\nThis document has been uploaded to storage and is available for processing.`;
      console.log(`Using storage extraction method for file: ${file_path}`);
    }

    // Split document into chunks
    const splitter = new RecursiveCharacterTextSplitter(1000, 200);
    const chunks = splitter.splitText(contentToProcess);
    
    console.log(`Document split into ${chunks.length} chunks`);

    // Process chunks in batches to avoid rate limits
    const batchSize = 5;
    const processedChunks = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchPromises = batch.map(async (chunk, batchIndex) => {
        const chunkIndex = i + batchIndex;
        
        try {
          // Generate embedding for chunk
          const embedding = await generateEmbedding(chunk, openaiApiKey);
          
          // Prepare metadata for Agno compatibility with enhanced fields
          const metadata = {
            workspace_id,
            document_id,
            chunk_index: chunkIndex,
            total_chunks: chunks.length,
            document_type,
            source: 'openai_edge_function',
            title: title || document_id,
            file_path: file_path || null,
            file_size: file_size || null,
            mime_type: mime_type || null,
            extraction_method,
            processed_at: new Date().toISOString()
          };

          return {
            content: chunk,
            metadata,
            meta_data: metadata, // PgVector compatibility
            name: title || document_id,
            usage: {
              created_at: new Date().toISOString(),
              access_count: 0,
              source: 'openai_edge_function'
            },
            workspace_id,
            embedding: `[${embedding.join(',')}]` // PostgreSQL vector format
          };
        } catch (error) {
          console.error(`Error processing chunk ${chunkIndex}:`, error);
          throw error;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      processedChunks.push(...batchResults);

      // Small delay between batches to respect rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Store all chunks in database
    const { error: insertError } = await supabase
      .from('knowledge_documents')
      .insert(processedChunks);

    if (insertError) {
      console.error('Error inserting chunks:', insertError);
      throw new Error(`Failed to store chunks: ${insertError.message}`);
    }

    // Update metadata with completion status
    const { error: updateError } = await supabase
      .from('knowledge_metadata')
      .update({
        total_chunks: chunks.length,
        status: 'completed',
        processing_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('document_id', document_id)
      .eq('workspace_id', workspace_id);

    if (updateError) {
      console.error('Error updating metadata:', updateError);
      // Don't throw here as the chunks were successfully stored
    }

    console.log(`Successfully processed document ${document_id}: ${chunks.length} chunks stored`);

    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        workspace_id,
        chunks_processed: chunks.length,
        message: 'Document processed and stored successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in process-documents function:', error);
    
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