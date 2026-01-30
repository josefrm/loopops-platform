-- Create views in public schema that reference v2 schema tables
-- This allows the Supabase JS client to access v2 tables using standard syntax

-- Create view for v2.profile
CREATE OR REPLACE VIEW public.v2_profile AS SELECT * FROM v2.profile;
GRANT ALL ON public.v2_profile TO authenticated, anon, service_role;

-- Create view for v2.onboarding
CREATE OR REPLACE VIEW public.v2_onboarding AS SELECT * FROM v2.onboarding;
GRANT ALL ON public.v2_onboarding TO authenticated, anon, service_role;

-- Create view for v2.workspace
CREATE OR REPLACE VIEW public.v2_workspace AS SELECT * FROM v2.workspace;
GRANT ALL ON public.v2_workspace TO authenticated, anon, service_role;

-- Create view for v2.workspace_profile
CREATE OR REPLACE VIEW public.v2_workspace_profile AS SELECT * FROM v2.workspace_profile;
GRANT ALL ON public.v2_workspace_profile TO authenticated, anon, service_role;

-- Create view for v2.project
CREATE OR REPLACE VIEW public.v2_project AS SELECT * FROM v2.project;
GRANT ALL ON public.v2_project TO authenticated, anon, service_role;

-- Enable RLS on views (views inherit RLS from underlying tables)
ALTER VIEW public.v2_profile SET (security_invoker = on);
ALTER VIEW public.v2_onboarding SET (security_invoker = on);
ALTER VIEW public.v2_workspace SET (security_invoker = on);
ALTER VIEW public.v2_workspace_profile SET (security_invoker = on);
ALTER VIEW public.v2_project SET (security_invoker = on);

-- Add comments
COMMENT ON VIEW public.v2_profile IS 'Public view for v2.profile table';
COMMENT ON VIEW public.v2_onboarding IS 'Public view for v2.onboarding table';
COMMENT ON VIEW public.v2_workspace IS 'Public view for v2.workspace table';
COMMENT ON VIEW public.v2_workspace_profile IS 'Public view for v2.workspace_profile table';
COMMENT ON VIEW public.v2_project IS 'Public view for v2.project table';

