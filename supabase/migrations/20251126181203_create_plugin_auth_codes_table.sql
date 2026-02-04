-- Migration: Create plugin_auth_codes table
-- Description: Table to store authentication codes for plugins linking users, projects, and workspaces
-- Schema: loopops (consistent with other project tables)

-- Create the table in the loopops schema
CREATE TABLE IF NOT EXISTS loopops.plugin_auth_codes (
    code VARCHAR(6) PRIMARY KEY,
    user_id UUID NOT NULL,
    project_id UUID NOT NULL,
    workspace_id UUID NOT NULL,
    plugin_type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add table and column comments for documentation
COMMENT ON TABLE loopops.plugin_auth_codes IS 'Stores temporary authentication codes for plugins to securely link users with specific projects and workspaces. These codes are used for one-time plugin integrations and expire automatically.';

COMMENT ON COLUMN loopops.plugin_auth_codes.code IS 'Unique 6-digit authentication code used by plugins for integration. Acts as the primary lookup key.';

COMMENT ON COLUMN loopops.plugin_auth_codes.user_id IS 'Reference to the user who requested the authentication code. Foreign key to auth.users table.';

COMMENT ON COLUMN loopops.plugin_auth_codes.project_id IS 'Reference to the project this auth code is linked to. Foreign key to loopops.projects table.';

COMMENT ON COLUMN loopops.plugin_auth_codes.workspace_id IS 'Reference to the workspace this auth code belongs to. Foreign key to loopops.workspaces table.';

COMMENT ON COLUMN loopops.plugin_auth_codes.plugin_type IS 'Type of plugin this auth code is for (FIGMA, SLACK, NOTION, LINEAR). Used to enforce one active code per plugin per user.';

COMMENT ON COLUMN loopops.plugin_auth_codes.expires_at IS 'Timestamp when this authentication code expires and becomes invalid. Codes have a 5-minute TTL.';

COMMENT ON COLUMN loopops.plugin_auth_codes.used IS 'Flag indicating if this code has been used/exchanged for a token. One-time use only.';

COMMENT ON COLUMN loopops.plugin_auth_codes.created_at IS 'Timestamp when this authentication code was created. Automatically set to current time.';

COMMENT ON COLUMN loopops.plugin_auth_codes.updated_at IS 'Timestamp when this authentication code was last updated. Automatically updated on modifications.';

-- Add foreign key constraints (idempotent)
DO $$ BEGIN
  ALTER TABLE loopops.plugin_auth_codes ADD CONSTRAINT fk_plugin_auth_codes_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
COMMENT ON CONSTRAINT fk_plugin_auth_codes_user_id ON loopops.plugin_auth_codes IS 'Ensures user_id references a valid user in the auth schema. Deletes auth codes when user is deleted.';

DO $$ BEGIN
  ALTER TABLE loopops.plugin_auth_codes ADD CONSTRAINT fk_plugin_auth_codes_project_id FOREIGN KEY (project_id) REFERENCES loopops.projects(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
COMMENT ON CONSTRAINT fk_plugin_auth_codes_project_id ON loopops.plugin_auth_codes IS 'Ensures project_id references a valid project. Deletes auth codes when project is deleted.';

DO $$ BEGIN
  ALTER TABLE loopops.plugin_auth_codes ADD CONSTRAINT fk_plugin_auth_codes_workspace_id FOREIGN KEY (workspace_id) REFERENCES loopops.workspaces(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
COMMENT ON CONSTRAINT fk_plugin_auth_codes_workspace_id ON loopops.plugin_auth_codes IS 'Ensures workspace_id references a valid workspace. Deletes auth codes when workspace is deleted.';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_plugin_auth_codes_user_id ON loopops.plugin_auth_codes(user_id);
COMMENT ON INDEX loopops.idx_plugin_auth_codes_user_id IS 'Index on user_id for efficient user-specific queries and RLS policy enforcement.';

CREATE INDEX IF NOT EXISTS idx_plugin_auth_codes_project_id ON loopops.plugin_auth_codes(project_id);
COMMENT ON INDEX loopops.idx_plugin_auth_codes_project_id IS 'Index on project_id for efficient project-specific queries.';

CREATE INDEX IF NOT EXISTS idx_plugin_auth_codes_workspace_id ON loopops.plugin_auth_codes(workspace_id);
COMMENT ON INDEX loopops.idx_plugin_auth_codes_workspace_id IS 'Index on workspace_id for efficient workspace-specific queries.';

CREATE INDEX IF NOT EXISTS idx_plugin_auth_codes_expires_at ON loopops.plugin_auth_codes(expires_at);
COMMENT ON INDEX loopops.idx_plugin_auth_codes_expires_at IS 'Index on expires_at for efficient cleanup of expired codes and expiration checks.';

CREATE INDEX IF NOT EXISTS idx_plugin_auth_codes_user_project_plugin ON loopops.plugin_auth_codes(user_id, project_id, plugin_type);
COMMENT ON INDEX loopops.idx_plugin_auth_codes_user_project_plugin IS 'Composite index for checking existing active codes per user, project, and plugin type.';

-- Add check constraints (idempotent)
DO $$ BEGIN
  ALTER TABLE loopops.plugin_auth_codes ADD CONSTRAINT chk_plugin_auth_codes_expires_at_future CHECK (expires_at > NOW());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE loopops.plugin_auth_codes ADD CONSTRAINT chk_plugin_auth_codes_plugin_type CHECK (plugin_type IN ('FIGMA', 'SLACK', 'NOTION', 'LINEAR'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON CONSTRAINT chk_plugin_auth_codes_expires_at_future ON loopops.plugin_auth_codes IS 'Ensures that authentication codes cannot be created with past expiration dates, preventing invalid codes.';

COMMENT ON CONSTRAINT chk_plugin_auth_codes_plugin_type ON loopops.plugin_auth_codes IS 'Ensures plugin_type is one of the supported plugin types: FIGMA, SLACK, NOTION, or LINEAR.';

-- Create a view in public schema for easier access (following the pattern of other views)
CREATE OR REPLACE VIEW public.loopops_plugin_auth_codes AS SELECT * FROM loopops.plugin_auth_codes;
GRANT ALL ON public.loopops_plugin_auth_codes TO authenticated, anon, service_role;

-- Enable RLS on views (views inherit RLS from underlying tables)
ALTER VIEW public.loopops_plugin_auth_codes SET (security_invoker = on);

-- Add comments
COMMENT ON VIEW public.loopops_plugin_auth_codes IS 'Public view for loopops.plugin_auth_codes table';

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE loopops.plugin_auth_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own plugin auth codes" ON loopops.plugin_auth_codes;
-- Policy: Users can only see their own auth codes
CREATE POLICY "Users can view their own plugin auth codes" ON loopops.plugin_auth_codes
FOR SELECT USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can view their own plugin auth codes" ON loopops.plugin_auth_codes IS 'RLS policy ensuring users can only query their own authentication codes based on user_id matching auth.uid().';

DROP POLICY IF EXISTS "Users can insert their own plugin auth codes" ON loopops.plugin_auth_codes;
-- Policy: Users can insert their own auth codes
CREATE POLICY "Users can insert their own plugin auth codes" ON loopops.plugin_auth_codes
FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Users can insert their own plugin auth codes" ON loopops.plugin_auth_codes IS 'RLS policy allowing users to create authentication codes only for themselves.';

DROP POLICY IF EXISTS "Users can update their own plugin auth codes" ON loopops.plugin_auth_codes;
-- Policy: Users can update their own auth codes
CREATE POLICY "Users can update their own plugin auth codes" ON loopops.plugin_auth_codes
FOR UPDATE USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can update their own plugin auth codes" ON loopops.plugin_auth_codes IS 'RLS policy allowing users to modify only their own authentication codes.';

DROP POLICY IF EXISTS "Users can delete their own plugin auth codes" ON loopops.plugin_auth_codes;
-- Policy: Users can delete their own auth codes
CREATE POLICY "Users can delete their own plugin auth codes" ON loopops.plugin_auth_codes
FOR DELETE USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can delete their own plugin auth codes" ON loopops.plugin_auth_codes IS 'RLS policy allowing users to delete only their own authentication codes.';

