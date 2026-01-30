-- Insert seed data for agent templates (11 agents) - only if they don't already exist
-- Note: system_prompt is NOT NULL, using empty string for now
-- Note: global_agent_templates table does NOT have updated_at column
INSERT INTO loopops.global_agent_templates (id, role_name, system_prompt, stage_template_id, created_at)
VALUES 
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Ideation', '', NULL, now()),
  ('a3c8f0e4-2b9d-4e7a-9f1c-8d6e5b4a3c2b', 'Benchmarking', '', NULL, now()),
  ('b7d9e1c3-4f8a-4d6b-8e2a-7c5b4a3d2e1f', 'PRD', '', NULL, now()),
  ('c9e2f3d4-5a7b-4c8d-9e3f-6b5a4c3d2e1a', 'Prototyping', '', NULL, now()),
  ('e6d960a4-4918-417b-8817-dbb4225c649d', 'Onboarding', '', '5b8e2ca9-530b-4376-8ba0-a3330cee6a86', now()),
  ('d1f4e5b6-8c9a-4d7e-b2f3-9c8d7e6f5a4b', 'Moscow', '', NULL, now()),
  ('e3a6b7c8-9d0a-4e8f-a3b4-0d9e8f7a6b5c', 'User Stories', '', NULL, now()),
  ('f5a8b9c0-1e2b-4f9a-d4e5-2e0f9a8b7c6d', 'User Flows', '', NULL, now()),
  ('a7d0e1f2-3f4c-4a0b-e5c6-4f1a0b9c8d7e', 'Information Architecture', '', NULL, now()),
  ('7ba435a2-ac34-4814-baaa-056b626831b9', 'Smart Assistant', '', NULL, now()),
  ('852250a3-e8cc-491b-a15d-45d709a56f96', 'File Creation', '', NULL, now())
ON CONFLICT (id) DO NOTHING;