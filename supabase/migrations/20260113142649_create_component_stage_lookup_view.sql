-- Create view that combines global_agent_templates and global_team_templates
-- with global_stage_templates to enable efficient stage_name lookups
-- This view joins component_id (agent_id or team_id) with stage_name

-- Create the view in loopops schema
CREATE OR REPLACE VIEW loopops.component_stage_lookup AS
SELECT 
  gat.id as component_id,
  gat.stage_template_id,
  gst.name as stage_name
FROM loopops.global_agent_templates gat
LEFT JOIN loopops.global_stage_templates gst ON gat.stage_template_id = gst.id

UNION ALL

SELECT 
  gtt.id as component_id,
  gtt.stage_template_id,
  gst.name as stage_name
FROM loopops.global_team_templates gtt
LEFT JOIN loopops.global_stage_templates gst ON gtt.stage_template_id = gst.id;

-- Create public view following the existing pattern
CREATE OR REPLACE VIEW public.loopops_component_stage_lookup AS 
SELECT * FROM loopops.component_stage_lookup;

-- Grant permissions
GRANT ALL ON public.loopops_component_stage_lookup TO authenticated, anon, service_role;

-- Enable security invoker
ALTER VIEW public.loopops_component_stage_lookup SET (security_invoker = on);

-- Add comment
COMMENT ON VIEW loopops.component_stage_lookup IS 'Combines global_agent_templates and global_team_templates with global_stage_templates to enable efficient stage_name lookups by component_id';
COMMENT ON VIEW public.loopops_component_stage_lookup IS 'Public view for component_stage_lookup - enables stage_name lookups by component_id';

