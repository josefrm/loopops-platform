-- ==============================================================================
-- STAGE BUCKET TABLES
-- 
-- Tables for tracking stage-specific storage buckets and files
-- ==============================================================================

-- Stage buckets table
CREATE TABLE IF NOT EXISTS loopops.stage_buckets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_stage_id UUID NOT NULL REFERENCES loopops.project_stages(id) ON DELETE CASCADE,
    bucket_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stage files table
CREATE TABLE IF NOT EXISTS loopops.stage_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_bucket_id UUID NOT NULL REFERENCES loopops.stage_buckets(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stage_buckets_stage_id ON loopops.stage_buckets(project_stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_files_bucket_id ON loopops.stage_files(stage_bucket_id);

-- Add unique constraint for one bucket per stage
CREATE UNIQUE INDEX IF NOT EXISTS idx_stage_buckets_unique ON loopops.stage_buckets(project_stage_id);

-- Add comments
COMMENT ON TABLE loopops.stage_buckets IS 'Tracks stage-specific storage buckets';
COMMENT ON TABLE loopops.stage_files IS 'Tracks files stored in stage buckets';

-- Enable RLS
ALTER TABLE loopops.stage_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE loopops.stage_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stage_buckets
DROP POLICY IF EXISTS "Users can view stage buckets for accessible projects" ON loopops.stage_buckets;
-- Users can view stage buckets for projects they have access to
CREATE POLICY "Users can view stage buckets for accessible projects"
ON loopops.stage_buckets
FOR SELECT
TO authenticated
USING (
    project_stage_id IN (
        SELECT ps.id 
        FROM loopops.project_stages ps
        JOIN loopops.projects p ON ps.project_id = p.id
        JOIN loopops.workspaces w ON p.workspace_id = w.id
        WHERE w.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Service role can manage all stage buckets" ON loopops.stage_buckets;
-- Service role can manage all stage buckets
CREATE POLICY "Service role can manage all stage buckets"
ON loopops.stage_buckets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- RLS Policies for stage_files
DROP POLICY IF EXISTS "Users can view files in accessible stage buckets" ON loopops.stage_files;
-- Users can view files in stage buckets for accessible projects
CREATE POLICY "Users can view files in accessible stage buckets"
ON loopops.stage_files
FOR SELECT
TO authenticated
USING (
    stage_bucket_id IN (
        SELECT sb.id 
        FROM loopops.stage_buckets sb
        JOIN loopops.project_stages ps ON sb.project_stage_id = ps.id
        JOIN loopops.projects p ON ps.project_id = p.id
        JOIN loopops.workspaces w ON p.workspace_id = w.id
        WHERE w.owner_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Service role can manage all stage files" ON loopops.stage_files;
-- Service role can manage all stage files
CREATE POLICY "Service role can manage all stage files"
ON loopops.stage_files
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

