-- ==============================================================================
-- MINDSPACE TABLES
-- 
-- Tables for tracking user-specific Mindspace buckets and files
-- Mindspace = workspace + project + user bucket
-- ==============================================================================

-- Mindspace buckets table
CREATE TABLE IF NOT EXISTS loopops.mindspace_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES loopops.workspaces(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES loopops.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Maps to auth.users.id
    bucket_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mindspace files table
CREATE TABLE IF NOT EXISTS loopops.mindspace_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mindspace_bucket_id UUID NOT NULL REFERENCES loopops.mindspace_buckets(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_mindspace_buckets_workspace_id ON loopops.mindspace_buckets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_mindspace_buckets_project_id ON loopops.mindspace_buckets(project_id);
CREATE INDEX IF NOT EXISTS idx_mindspace_buckets_user_id ON loopops.mindspace_buckets(user_id);
CREATE INDEX IF NOT EXISTS idx_mindspace_files_bucket_id ON loopops.mindspace_files(mindspace_bucket_id);

-- Add unique constraint for workspace+project+user combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_mindspace_buckets_unique ON loopops.mindspace_buckets(workspace_id, project_id, user_id);

-- Add comments
COMMENT ON TABLE loopops.mindspace_buckets IS 'Tracks user-specific Mindspace storage buckets (workspace+project+user)';
COMMENT ON TABLE loopops.mindspace_files IS 'Tracks files stored in Mindspace buckets';

-- Enable RLS
ALTER TABLE loopops.mindspace_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE loopops.mindspace_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mindspace_buckets
-- Users can view their own mindspace buckets
DROP POLICY IF EXISTS "Users can view their own mindspace buckets" ON loopops.mindspace_buckets;
CREATE POLICY "Users can view their own mindspace buckets"
ON loopops.mindspace_buckets
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Service role can manage all mindspace buckets
DROP POLICY IF EXISTS "Service role can manage all mindspace buckets" ON loopops.mindspace_buckets;
CREATE POLICY "Service role can manage all mindspace buckets"
ON loopops.mindspace_buckets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- RLS Policies for mindspace_files
-- Users can view files in their own mindspace buckets
DROP POLICY IF EXISTS "Users can view files in their own mindspace buckets" ON loopops.mindspace_files;
CREATE POLICY "Users can view files in their own mindspace buckets"
ON loopops.mindspace_files
FOR SELECT
TO authenticated
USING (
    mindspace_bucket_id IN (
        SELECT id FROM loopops.mindspace_buckets WHERE user_id = auth.uid()
    )
);

-- Service role can manage all mindspace files
DROP POLICY IF EXISTS "Service role can manage all mindspace files" ON loopops.mindspace_files;
CREATE POLICY "Service role can manage all mindspace files"
ON loopops.mindspace_files
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

