
-- Add new columns to the workspaces table
ALTER TABLE public.workspaces 
ADD COLUMN is_private boolean DEFAULT false NOT NULL,
ADD COLUMN domain text;

-- Add a comment to clarify the purpose of the new columns
COMMENT ON COLUMN public.workspaces.is_private IS 'Indicates if the workspace is private or public';
COMMENT ON COLUMN public.workspaces.domain IS 'Domain associated with the workspace for organization email matching';
