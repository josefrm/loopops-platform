-- Update the existing knowledge_documents table to match PgVector expectations
-- This script adds the missing columns that PgVector expects

-- Add the 'name' column (PgVector expects this)
ALTER TABLE public.knowledge_documents 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Add the 'usage' column (PgVector expects this)
ALTER TABLE public.knowledge_documents 
ADD COLUMN IF NOT EXISTS usage JSONB;

-- Add the 'meta_data' column (PgVector expects this, different from 'metadata')
ALTER TABLE public.knowledge_documents 
ADD COLUMN IF NOT EXISTS meta_data JSONB;

-- Copy data from 'metadata' to 'meta_data' if meta_data is empty
UPDATE public.knowledge_documents 
SET meta_data = metadata 
WHERE meta_data IS NULL AND metadata IS NOT NULL;

-- Set default values for existing rows
UPDATE public.knowledge_documents 
SET name = COALESCE(name, 'document_' || id::text)
WHERE name IS NULL;

-- Set usage with proper JSON formatting
UPDATE public.knowledge_documents 
SET usage = COALESCE(usage, jsonb_build_object(
  'created_at', created_at::text,
  'access_count', 0
))
WHERE usage IS NULL;