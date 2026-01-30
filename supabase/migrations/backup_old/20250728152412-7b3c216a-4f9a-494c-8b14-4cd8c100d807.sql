-- Fix RLS policies for knowledge_metadata table

-- Drop existing service role policy if it exists and recreate with correct permissions
DROP POLICY IF EXISTS "Service role can manage all knowledge metadata" ON knowledge_metadata;

-- Create comprehensive service role policy for all operations
CREATE POLICY "Service role can manage all knowledge metadata"
ON knowledge_metadata
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure users can insert metadata for their workspaces too (for client-side operations)
DROP POLICY IF EXISTS "Users can create metadata in their workspace" ON knowledge_metadata;

CREATE POLICY "Users can create metadata in their workspace"
ON knowledge_metadata
FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id::text IN (
    SELECT workspace_members.workspace_id::text
    FROM workspace_members
    WHERE workspace_members.user_id = auth.uid()
    AND workspace_members.is_active = true
  )
);

-- Similarly for knowledge_documents table
DROP POLICY IF EXISTS "Service role can manage all knowledge documents" ON knowledge_documents;

CREATE POLICY "Service role can manage all knowledge documents"
ON knowledge_documents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure users can insert documents for their workspaces
DROP POLICY IF EXISTS "Users can create documents in their workspace" ON knowledge_documents;

CREATE POLICY "Users can create documents in their workspace"
ON knowledge_documents
FOR INSERT
TO authenticated
WITH CHECK (
  workspace_id::text IN (
    SELECT workspace_members.workspace_id::text
    FROM workspace_members
    WHERE workspace_members.user_id = auth.uid()
    AND workspace_members.is_active = true
  )
);