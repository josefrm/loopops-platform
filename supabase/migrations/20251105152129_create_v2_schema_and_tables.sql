-- Create V2 schema for new edge functions architecture
CREATE SCHEMA IF NOT EXISTS v2;

-- Grant usage on v2 schema
GRANT USAGE ON SCHEMA v2 TO postgres, anon, authenticated, service_role;

-- Set default privileges for future tables in v2 schema
ALTER DEFAULT PRIVILEGES IN SCHEMA v2 GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA v2 GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA v2 GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- Create onboarding table
CREATE TABLE IF NOT EXISTS v2.onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create profile table
CREATE TABLE IF NOT EXISTS v2.profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create workspace table
CREATE TABLE IF NOT EXISTS v2.workspace (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create project table
CREATE TABLE IF NOT EXISTS v2.project (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all v2 tables
ALTER TABLE v2.onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2.profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2.workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2.project ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger function for v2 schema
CREATE OR REPLACE FUNCTION v2.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
DROP TRIGGER IF EXISTS update_onboarding_updated_at ON v2.onboarding;
CREATE TRIGGER update_onboarding_updated_at
  BEFORE UPDATE ON v2.onboarding
  FOR EACH ROW
  EXECUTE FUNCTION v2.update_updated_at_column();

DROP TRIGGER IF EXISTS update_profile_updated_at ON v2.profile;
CREATE TRIGGER update_profile_updated_at
  BEFORE UPDATE ON v2.profile
  FOR EACH ROW
  EXECUTE FUNCTION v2.update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspace_updated_at ON v2.workspace;
CREATE TRIGGER update_workspace_updated_at
  BEFORE UPDATE ON v2.workspace
  FOR EACH ROW
  EXECUTE FUNCTION v2.update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_updated_at ON v2.project;
CREATE TRIGGER update_project_updated_at
  BEFORE UPDATE ON v2.project
  FOR EACH ROW
  EXECUTE FUNCTION v2.update_updated_at_column();

-- Add comments to tables
COMMENT ON SCHEMA v2 IS 'V2 schema for new edge functions architecture';
COMMENT ON TABLE v2.onboarding IS 'User onboarding data and progress tracking';
COMMENT ON TABLE v2.profile IS 'User profile information';
COMMENT ON TABLE v2.workspace IS 'Workspace management and configuration';
COMMENT ON TABLE v2.project IS 'Project management within workspaces';

