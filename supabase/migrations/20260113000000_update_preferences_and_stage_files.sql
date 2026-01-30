-- Update mindspace_categories in v2.user_preferences
ALTER TABLE v2.user_preferences
ALTER COLUMN mindspace_categories
SET DEFAULT '[
  {
    "id": 1,
    "name": "All",
    "priority": 1
  }
]'::jsonb;

-- Update existing records to match the new default (optional, checks if we should reset existing users too)
-- Per request "Update the mindspace_categories column of user_preferences to have..." implies updating data too.
UPDATE v2.user_preferences
SET mindspace_categories = '[
  {
    "id": 1,
    "name": "All",
    "priority": 1
  }
]'::jsonb;

-- Refresh view for v2.user_preferences (just to be safe, though not strictly required if only data/default changed)
CREATE OR REPLACE VIEW public.v2_user_preferences AS SELECT * FROM v2.user_preferences;
GRANT ALL ON public.v2_user_preferences TO authenticated, anon, service_role;
ALTER VIEW public.v2_user_preferences SET (security_invoker = on);

-- Add is_key_deliverable to loopops.stage_files
ALTER TABLE loopops.stage_files
ADD COLUMN IF NOT EXISTS is_key_deliverable BOOLEAN DEFAULT FALSE;

-- Recreate view loopops_stage_files to include new column
-- We must drop it first because we want to update the schema definition of the view
DROP VIEW IF EXISTS public.loopops_stage_files;

CREATE OR REPLACE VIEW public.loopops_stage_files AS SELECT * FROM loopops.stage_files;

-- Grant permissions and set security invoker
GRANT ALL ON public.loopops_stage_files TO authenticated, anon, service_role;
ALTER VIEW public.loopops_stage_files SET (security_invoker = on);

-- Comments
COMMENT ON COLUMN loopops.stage_files.is_key_deliverable IS 'Indicates if the file is a key deliverable for the stage';
