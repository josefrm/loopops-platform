
-- Add foreign key constraint between workspace_credentials and workspaces
ALTER TABLE public.workspace_credentials 
ADD CONSTRAINT fk_workspace_credentials_workspace 
FOREIGN KEY (workspace_id) 
REFERENCES public.workspaces (id) 
ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_workspace_credentials_workspace_id 
ON public.workspace_credentials (workspace_id);
