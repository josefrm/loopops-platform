
-- Rename jira_connections table to workspace_credentials
ALTER TABLE public.jira_connections RENAME TO workspace_credentials;

-- Rename user_id column to workspace_id
ALTER TABLE public.workspace_credentials RENAME COLUMN user_id TO workspace_id;

-- Remove the api_key column
ALTER TABLE public.workspace_credentials DROP COLUMN api_key;

-- Add secret_id column to reference vault.secrets
ALTER TABLE public.workspace_credentials ADD COLUMN secret_id UUID;

-- Add service column to identify the type of credential
ALTER TABLE public.workspace_credentials ADD COLUMN service TEXT NOT NULL DEFAULT 'Jira';

-- Update the existing records to have the service value
UPDATE public.workspace_credentials SET service = 'Jira' WHERE service IS NULL;
