-- Create views in public schema that reference loopops schema tables
-- This allows the Supabase JS client to access loopops tables using standard syntax
-- PostgREST doesn't support dot notation in table names, so we need views

-- Create view for loopops.workspaces
CREATE OR REPLACE VIEW public.loopops_workspaces AS SELECT * FROM loopops.workspaces;
GRANT ALL ON public.loopops_workspaces TO authenticated, anon, service_role;

-- Create view for loopops.projects
CREATE OR REPLACE VIEW public.loopops_projects AS SELECT * FROM loopops.projects;
GRANT ALL ON public.loopops_projects TO authenticated, anon, service_role;

-- Create view for loopops.project_stages
CREATE OR REPLACE VIEW public.loopops_project_stages AS SELECT * FROM loopops.project_stages;
GRANT ALL ON public.loopops_project_stages TO authenticated, anon, service_role;

-- Create view for loopops.project_agents
CREATE OR REPLACE VIEW public.loopops_project_agents AS SELECT * FROM loopops.project_agents;
GRANT ALL ON public.loopops_project_agents TO authenticated, anon, service_role;

-- Create view for loopops.threads
CREATE OR REPLACE VIEW public.loopops_threads AS SELECT * FROM loopops.threads;
GRANT ALL ON public.loopops_threads TO authenticated, anon, service_role;

-- Create view for loopops.sessions
CREATE OR REPLACE VIEW public.loopops_sessions AS SELECT * FROM loopops.sessions;
GRANT ALL ON public.loopops_sessions TO authenticated, anon, service_role;

-- Create view for loopops.session_messages
CREATE OR REPLACE VIEW public.loopops_session_messages AS SELECT * FROM loopops.session_messages;
GRANT ALL ON public.loopops_session_messages TO authenticated, anon, service_role;

-- Create view for loopops.documents
CREATE OR REPLACE VIEW public.loopops_documents AS SELECT * FROM loopops.documents;
GRANT ALL ON public.loopops_documents TO authenticated, anon, service_role;

-- Create view for loopops.global_stage_templates
CREATE OR REPLACE VIEW public.loopops_global_stage_templates AS SELECT * FROM loopops.global_stage_templates;
GRANT ALL ON public.loopops_global_stage_templates TO authenticated, anon, service_role;

-- Create view for loopops.global_agent_templates
CREATE OR REPLACE VIEW public.loopops_global_agent_templates AS SELECT * FROM loopops.global_agent_templates;
GRANT ALL ON public.loopops_global_agent_templates TO authenticated, anon, service_role;

-- Create view for loopops.global_deliverable_templates
CREATE OR REPLACE VIEW public.loopops_global_deliverable_templates AS SELECT * FROM loopops.global_deliverable_templates;
GRANT ALL ON public.loopops_global_deliverable_templates TO authenticated, anon, service_role;

-- Create view for loopops.mindspace_buckets
CREATE OR REPLACE VIEW public.loopops_mindspace_buckets AS SELECT * FROM loopops.mindspace_buckets;
GRANT ALL ON public.loopops_mindspace_buckets TO authenticated, anon, service_role;

-- Create view for loopops.mindspace_files
CREATE OR REPLACE VIEW public.loopops_mindspace_files AS SELECT * FROM loopops.mindspace_files;
GRANT ALL ON public.loopops_mindspace_files TO authenticated, anon, service_role;

-- Create view for loopops.stage_buckets
CREATE OR REPLACE VIEW public.loopops_stage_buckets AS SELECT * FROM loopops.stage_buckets;
GRANT ALL ON public.loopops_stage_buckets TO authenticated, anon, service_role;

-- Create view for loopops.stage_files
CREATE OR REPLACE VIEW public.loopops_stage_files AS SELECT * FROM loopops.stage_files;
GRANT ALL ON public.loopops_stage_files TO authenticated, anon, service_role;

-- Create view for loopops.project_buckets
CREATE OR REPLACE VIEW public.loopops_project_buckets AS SELECT * FROM loopops.project_buckets;
GRANT ALL ON public.loopops_project_buckets TO authenticated, anon, service_role;

-- Create view for loopops.project_files
CREATE OR REPLACE VIEW public.loopops_project_files AS SELECT * FROM loopops.project_files;
GRANT ALL ON public.loopops_project_files TO authenticated, anon, service_role;

-- Enable RLS on views (views inherit RLS from underlying tables)
ALTER VIEW public.loopops_workspaces SET (security_invoker = on);
ALTER VIEW public.loopops_projects SET (security_invoker = on);
ALTER VIEW public.loopops_project_stages SET (security_invoker = on);
ALTER VIEW public.loopops_project_agents SET (security_invoker = on);
ALTER VIEW public.loopops_threads SET (security_invoker = on);
ALTER VIEW public.loopops_sessions SET (security_invoker = on);
ALTER VIEW public.loopops_session_messages SET (security_invoker = on);
ALTER VIEW public.loopops_documents SET (security_invoker = on);
ALTER VIEW public.loopops_global_stage_templates SET (security_invoker = on);
ALTER VIEW public.loopops_global_agent_templates SET (security_invoker = on);
ALTER VIEW public.loopops_global_deliverable_templates SET (security_invoker = on);
ALTER VIEW public.loopops_mindspace_buckets SET (security_invoker = on);
ALTER VIEW public.loopops_mindspace_files SET (security_invoker = on);
ALTER VIEW public.loopops_stage_buckets SET (security_invoker = on);
ALTER VIEW public.loopops_stage_files SET (security_invoker = on);
ALTER VIEW public.loopops_project_buckets SET (security_invoker = on);
ALTER VIEW public.loopops_project_files SET (security_invoker = on);

-- Add comments
COMMENT ON VIEW public.loopops_workspaces IS 'Public view for loopops.workspaces table';
COMMENT ON VIEW public.loopops_projects IS 'Public view for loopops.projects table';
COMMENT ON VIEW public.loopops_project_stages IS 'Public view for loopops.project_stages table';
COMMENT ON VIEW public.loopops_project_agents IS 'Public view for loopops.project_agents table';
COMMENT ON VIEW public.loopops_threads IS 'Public view for loopops.threads table';
COMMENT ON VIEW public.loopops_sessions IS 'Public view for loopops.sessions table';
COMMENT ON VIEW public.loopops_session_messages IS 'Public view for loopops.session_messages table';
COMMENT ON VIEW public.loopops_documents IS 'Public view for loopops.documents table';

