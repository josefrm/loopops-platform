-- Add is_deliverable column to stage_files table
ALTER TABLE loopops.stage_files
ADD COLUMN IF NOT EXISTS is_deliverable BOOLEAN DEFAULT FALSE;

-- Recreate view loopops_stage_files to include new column
DROP VIEW IF EXISTS public.loopops_stage_files;

CREATE OR REPLACE VIEW public.loopops_stage_files AS SELECT * FROM loopops.stage_files;

-- Grant permissions
GRANT ALL ON public.loopops_stage_files TO authenticated, anon, service_role;
ALTER VIEW public.loopops_stage_files SET (security_invoker = on);

COMMENT ON VIEW public.loopops_stage_files IS 'Public view for loopops.stage_files table';
