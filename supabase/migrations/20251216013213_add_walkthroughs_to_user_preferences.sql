-- Add walkthroughs column to v2.user_preferences
ALTER TABLE v2.user_preferences ADD COLUMN IF NOT EXISTS walkthroughs jsonb DEFAULT '{}'::jsonb;

-- Comment
COMMENT ON COLUMN v2.user_preferences.walkthroughs IS 'JSONB object tracking completed walkthroughs for different windows';

-- Refresh the public view to include the new column
CREATE OR REPLACE VIEW public.v2_user_preferences AS SELECT * FROM v2.user_preferences;
GRANT ALL ON public.v2_user_preferences TO authenticated, anon, service_role;
