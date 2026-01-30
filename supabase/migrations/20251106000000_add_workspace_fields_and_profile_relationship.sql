-- Add name field to v2.workspace table
ALTER TABLE v2.workspace 
ADD COLUMN name text NOT NULL DEFAULT '';

-- Create workspace_profile junction table
CREATE TABLE IF NOT EXISTS v2.workspace_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES v2.workspace(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES v2.profile(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, profile_id)
);

-- Enable Row Level Security
ALTER TABLE v2.workspace_profile ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger to workspace_profile
CREATE TRIGGER update_workspace_profile_updated_at
  BEFORE UPDATE ON v2.workspace_profile
  FOR EACH ROW
  EXECUTE FUNCTION v2.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_workspace_profile_workspace_id ON v2.workspace_profile(workspace_id);
CREATE INDEX idx_workspace_profile_profile_id ON v2.workspace_profile(profile_id);

-- Add comments
COMMENT ON TABLE v2.workspace_profile IS 'Junction table linking workspaces to profiles (users)';
COMMENT ON COLUMN v2.workspace.name IS 'Name of the workspace';
COMMENT ON COLUMN v2.workspace_profile.role IS 'User role within the workspace (e.g., admin, member)';

-- Create RLS policies for workspace_profile
-- Users can view their own workspace memberships
CREATE POLICY "Users can view their own workspace memberships"
ON v2.workspace_profile
FOR SELECT
TO authenticated
USING (
  profile_id IN (
    SELECT id FROM v2.profile WHERE id = auth.uid()
  )
);

-- Service role can manage all workspace profiles
CREATE POLICY "Service role can manage all workspace profiles"
ON v2.workspace_profile
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create RLS policies for v2.workspace
-- Users can view workspaces they are members of
CREATE POLICY "Users can view their workspaces"
ON v2.workspace
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT workspace_id FROM v2.workspace_profile WHERE profile_id = auth.uid()
  )
);

-- Service role can manage all workspaces
CREATE POLICY "Service role can manage all workspaces"
ON v2.workspace
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);





