-- Refresh the loopops_global_agent_templates view to include new columns
-- This ensures the view includes stage_template_id and type columns that were added after the view was created

-- Recreate the view to include all current columns from the base table
CREATE OR REPLACE VIEW public.loopops_global_agent_templates AS
SELECT * FROM loopops.global_agent_templates;

-- Re-grant permissions
GRANT ALL ON public.loopops_global_agent_templates TO authenticated, anon, service_role;

-- Re-enable security invoker
ALTER VIEW public.loopops_global_agent_templates SET (security_invoker = on);

