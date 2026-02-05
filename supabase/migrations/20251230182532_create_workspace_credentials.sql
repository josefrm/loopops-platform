-- Create workspace_credentials table
CREATE TABLE IF NOT EXISTS loopops.workspace_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  secret_id uuid,
  service text NOT NULL DEFAULT 'Jira'::text,
  CONSTRAINT workspace_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT fk_workspace_credentials_workspace FOREIGN KEY (workspace_id) REFERENCES loopops.workspaces(id)
);

-- Enable RLS
ALTER TABLE loopops.workspace_credentials ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workspace_credentials_workspace_id ON loopops.workspace_credentials(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_credentials_is_active ON loopops.workspace_credentials(is_active);
