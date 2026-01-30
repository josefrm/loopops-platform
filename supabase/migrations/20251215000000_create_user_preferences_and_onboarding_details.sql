-- Create v2.user_preferences table
CREATE TABLE IF NOT EXISTS v2.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES v2.profile(id) NOT NULL UNIQUE,
  mindspace_categories jsonb DEFAULT '[
    {"id": 1, "name": "All", "priority": 1},
    {"id": 2, "name": "Client", "priority": 2},
    {"id": 3, "name": "Snippets", "priority": 3},
    {"id": 4, "name": "Notes", "priority": 4}
  ]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add onboarding_details to v2.onboarding
ALTER TABLE v2.onboarding ADD COLUMN IF NOT EXISTS onboarding_details jsonb DEFAULT '{}'::jsonb;

-- Enable RLS on v2.user_preferences
ALTER TABLE v2.user_preferences ENABLE ROW LEVEL SECURITY;

-- Add updated_at trigger for user_preferences
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON v2.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION v2.update_updated_at_column();

-- RLS Policies for v2.user_preferences

-- Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
ON v2.user_preferences
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
ON v2.user_preferences
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Service role can manage all preferences
CREATE POLICY "Service role can manage all preferences"
ON v2.user_preferences
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Update handle_new_user function to create user_preferences
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

  -- Create default user preferences
  INSERT INTO v2.user_preferences (profile_id)
  VALUES (NEW.id)
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill user_preferences for existing profiles (optional but good for consistency)
INSERT INTO v2.user_preferences (profile_id)
SELECT id FROM v2.profile
ON CONFLICT (profile_id) DO NOTHING;

-- Comments
COMMENT ON TABLE v2.user_preferences IS 'Stores user specific settings and preferences';
COMMENT ON COLUMN v2.user_preferences.mindspace_categories IS 'JSONB array of user defined mindspace categories';
COMMENT ON COLUMN v2.onboarding.onboarding_details IS 'Detailed tracking of onboarding steps completion';
