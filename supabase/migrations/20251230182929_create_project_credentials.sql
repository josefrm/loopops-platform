-- Create project_credentials table (pivot table)
CREATE TABLE IF NOT EXISTS loopops.project_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  workspace_credentials_id uuid NOT NULL,
  project_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT project_credentials_pkey PRIMARY KEY (id),
  CONSTRAINT fk_project_credentials_project FOREIGN KEY (project_id) REFERENCES loopops.projects(id),
  CONSTRAINT fk_project_credentials_workspace_credentials FOREIGN KEY (workspace_credentials_id) REFERENCES loopops.workspace_credentials(id),
  CONSTRAINT unique_project_workspace_credentials UNIQUE (project_id, workspace_credentials_id)
);

-- Enable RLS
ALTER TABLE loopops.project_credentials ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_credentials_project_id ON loopops.project_credentials(project_id);
CREATE INDEX IF NOT EXISTS idx_project_credentials_workspace_credentials_id ON loopops.project_credentials(workspace_credentials_id);
