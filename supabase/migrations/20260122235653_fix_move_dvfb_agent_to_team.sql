-- Migration: Move DVFB from agent template to team template
-- Description: Transfers DVFB from global_agent_templates to global_team_templates

-- Insert DVFB into global_team_templates
INSERT INTO loopops.global_team_templates (id, name, stage_template_id, created_at, updated_at)
VALUES ('f47ac10b-58cc-4372-a567-0e02b2c3d480', 'DVFB', NULL, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Delete DVFB from global_agent_templates
DELETE FROM loopops.global_agent_templates
WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d480';
