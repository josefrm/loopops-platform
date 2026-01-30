-- ==============================================================================
-- PERFORMANCE INDEXES FOR PROJECT ASSETS QUERY
--
-- The get-project-assets Edge Function queries stage_buckets via project_stages
-- filtering by project_id. This index significantly speeds up that lookup.
-- ==============================================================================

-- Index on project_stages.project_id for faster filtering by project
-- This is the main bottleneck in get-project-assets query
CREATE INDEX IF NOT EXISTS idx_project_stages_project_id
ON loopops.project_stages(project_id);

-- Composite index for stage_files covering common query columns
-- Avoids table lookups for the most frequently accessed columns
CREATE INDEX IF NOT EXISTS idx_stage_files_bucket_covering
ON loopops.stage_files(stage_bucket_id)
INCLUDE (file_name, file_size, mime_type, file_path, created_at, is_deliverable, is_key_deliverable);

-- Index on projects for workspace lookups (used in RLS policies)
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id
ON loopops.projects(workspace_id);
