-- Add columns to v2.profile table
ALTER TABLE v2.profile ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id);
ALTER TABLE v2.profile ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE v2.profile ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE v2.profile ADD COLUMN IF NOT EXISTS email text;

-- Add columns to v2.onboarding table
ALTER TABLE v2.onboarding ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES v2.profile(id);
ALTER TABLE v2.onboarding ADD COLUMN IF NOT EXISTS stage int DEFAULT 0;
ALTER TABLE v2.onboarding ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;

-- Add columns to v2.project table
ALTER TABLE v2.project ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
ALTER TABLE v2.project ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES v2.workspace(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profile_user_id ON v2.profile(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_profile_id ON v2.onboarding(profile_id);
CREATE INDEX IF NOT EXISTS idx_project_workspace_id ON v2.project(workspace_id);

-- Trigger function to create profile and onboarding record after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile in v2.profile
  INSERT INTO v2.profile (id, user_id, email)
  VALUES (NEW.id, NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  
  -- Create onboarding record with stage 0
  INSERT INTO v2.onboarding (profile_id, stage, completed)
  VALUES (NEW.id, 0, false)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Attach trigger to auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add RLS policies for v2.profile
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON v2.profile;
DROP POLICY IF EXISTS "Users can update their own profile" ON v2.profile;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON v2.profile;

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON v2.profile
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON v2.profile
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role can manage all profiles
CREATE POLICY "Service role can manage all profiles"
ON v2.profile
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add RLS policies for v2.onboarding
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own onboarding" ON v2.onboarding;
DROP POLICY IF EXISTS "Service role can manage all onboarding" ON v2.onboarding;

-- Users can view their own onboarding
CREATE POLICY "Users can view their own onboarding"
ON v2.onboarding
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Service role can manage all onboarding records
CREATE POLICY "Service role can manage all onboarding"
ON v2.onboarding
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add RLS policies for v2.project
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view projects in their workspaces" ON v2.project;
DROP POLICY IF EXISTS "Service role can manage all projects" ON v2.project;

-- Users can view projects in their workspaces
CREATE POLICY "Users can view projects in their workspaces"
ON v2.project
FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT workspace_id FROM v2.workspace_profile WHERE profile_id = auth.uid()
  )
);

-- Service role can manage all projects
CREATE POLICY "Service role can manage all projects"
ON v2.project
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add comments
COMMENT ON COLUMN v2.profile.user_id IS 'Reference to auth.users';
COMMENT ON COLUMN v2.profile.name IS 'User full name';
COMMENT ON COLUMN v2.profile.role IS 'User role (optional)';
COMMENT ON COLUMN v2.profile.email IS 'User email address';
COMMENT ON COLUMN v2.onboarding.profile_id IS 'Reference to v2.profile';
COMMENT ON COLUMN v2.onboarding.stage IS 'Current onboarding stage (0-3)';
COMMENT ON COLUMN v2.onboarding.completed IS 'Whether onboarding is completed';
COMMENT ON COLUMN v2.project.name IS 'Project name';
COMMENT ON COLUMN v2.project.workspace_id IS 'Reference to v2.workspace';

