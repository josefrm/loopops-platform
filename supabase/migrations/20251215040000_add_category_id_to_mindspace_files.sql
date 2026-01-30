-- Add category_id to mindspace_files table
ALTER TABLE loopops.mindspace_files
ADD COLUMN IF NOT EXISTS category_id INTEGER DEFAULT 1;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_mindspace_files_category_id ON loopops.mindspace_files(category_id);

-- Add comment
COMMENT ON COLUMN loopops.mindspace_files.category_id IS 'ID of the category this file belongs to (maps to IDs in user preferences)';

-- Update the public view to include the new column
-- Postgres views created with SELECT * are not automatically updated when columns are added to the underlying table
CREATE OR REPLACE VIEW public.loopops_mindspace_files AS SELECT * FROM loopops.mindspace_files;
GRANT ALL ON public.loopops_mindspace_files TO authenticated, anon, service_role;
ALTER VIEW public.loopops_mindspace_files SET (security_invoker = on);
