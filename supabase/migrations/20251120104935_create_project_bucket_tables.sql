-- ==============================================================================
-- PROJECT BUCKET TABLES
-- 
-- Tables for tracking project-specific storage buckets and files
-- ==============================================================================

-- Project buckets table
CREATE TABLE IF NOT EXISTS loopops.project_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES loopops.projects(id) ON DELETE CASCADE,
    bucket_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project files table
CREATE TABLE IF NOT EXISTS loopops.project_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_bucket_id UUID NOT NULL REFERENCES loopops.project_buckets(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_project_buckets_project_id ON loopops.project_buckets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_bucket_id ON loopops.project_files(project_bucket_id);

-- Add unique constraint for one bucket per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_buckets_unique ON loopops.project_buckets(project_id);

-- Add comments
COMMENT ON TABLE loopops.project_buckets IS 'Tracks project-specific storage buckets';
COMMENT ON TABLE loopops.project_files IS 'Tracks files stored in project buckets';

-- Enable RLS
ALTER TABLE loopops.project_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE loopops.project_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_buckets
-- Users can view project buckets for projects they have access to
CREATE POLICY "Users can view project buckets for accessible projects"
ON loopops.project_buckets
FOR SELECT
TO authenticated
USING (
    project_id IN (
        SELECT p.id 
        FROM loopops.projects p
        JOIN loopops.workspaces w ON p.workspace_id = w.id
        WHERE w.owner_id = auth.uid()
    )
);

-- Service role can manage all project buckets
CREATE POLICY "Service role can manage all project buckets"
ON loopops.project_buckets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- RLS Policies for project_files
-- Users can view files in project buckets for accessible projects
CREATE POLICY "Users can view files in accessible project buckets"
ON loopops.project_files
FOR SELECT
TO authenticated
USING (
    project_bucket_id IN (
        SELECT pb.id 
        FROM loopops.project_buckets pb
        JOIN loopops.projects p ON pb.project_id = p.id
        JOIN loopops.workspaces w ON p.workspace_id = w.id
        WHERE w.owner_id = auth.uid()
    )
);

-- Service role can manage all project files
CREATE POLICY "Service role can manage all project files"
ON loopops.project_files
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

