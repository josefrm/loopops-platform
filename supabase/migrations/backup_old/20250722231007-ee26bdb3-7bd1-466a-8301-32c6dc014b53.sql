-- Create knowledge_documents table for Agno integration
CREATE TABLE IF NOT EXISTS public.knowledge_documents (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    workspace_id VARCHAR(255),
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create knowledge_metadata table for document tracking
CREATE TABLE IF NOT EXISTS public.knowledge_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id TEXT NOT NULL,
    workspace_id VARCHAR(255) NOT NULL,
    document_type TEXT NOT NULL,
    title TEXT,
    total_chunks INTEGER DEFAULT 0,
    status TEXT DEFAULT 'processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for knowledge_documents
CREATE POLICY "Users can view documents in their workspace" 
ON public.knowledge_documents 
FOR SELECT 
USING (workspace_id IN (
  SELECT workspace_id::text FROM public.workspace_members 
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Service role can manage all knowledge documents" 
ON public.knowledge_documents 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Create RLS policies for knowledge_metadata
CREATE POLICY "Users can view metadata in their workspace" 
ON public.knowledge_metadata 
FOR SELECT 
USING (workspace_id IN (
  SELECT workspace_id::text FROM public.workspace_members 
  WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Service role can manage all knowledge metadata" 
ON public.knowledge_metadata 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_workspace_id ON public.knowledge_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_embedding ON public.knowledge_documents USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_knowledge_metadata_workspace_id ON public.knowledge_metadata(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_metadata_document_id ON public.knowledge_metadata(document_id);