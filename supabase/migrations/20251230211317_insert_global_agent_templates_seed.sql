INSERT INTO loopops.global_agent_templates (id, role_name, system_prompt, stage_template_id, created_at)
VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Branding', '', NULL, now()),
('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Desirability', '', NULL, now()),
('12345678-1234-5678-9abc-def012345678', 'Feasibility', '', NULL, now()),
('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Viability', '', NULL, now()),
('f47ac10b-58cc-4372-a567-0e02b2c3d480', 'DVFB', '', NULL, now())
ON CONFLICT (id) DO NOTHING;