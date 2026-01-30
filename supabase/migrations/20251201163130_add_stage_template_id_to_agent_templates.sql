-- Add stage_template_id column to global_agent_templates
-- This links agent templates to their corresponding stage templates
-- Each agent template should belong to exactly one stage template

ALTER TABLE loopops.global_agent_templates 
ADD COLUMN IF NOT EXISTS stage_template_id UUID REFERENCES loopops.global_stage_templates(id);

-- Add a comment explaining the relationship
COMMENT ON COLUMN loopops.global_agent_templates.stage_template_id IS 
'Links this agent template to a specific stage template. Each agent template belongs to exactly one stage template.';

