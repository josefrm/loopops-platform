-- Step 1: Alter the requirements_prompt column to be optional (nullable)
ALTER TABLE loopops.global_deliverable_templates 
ALTER COLUMN requirements_prompt DROP NOT NULL;

-- Step 2: Insert the deliverable templates (id auto-generates)
INSERT INTO loopops.global_deliverable_templates (stage_template_id, name, requirements_prompt, created_at)
VALUES
  ('5b8e2ca9-530b-4376-8ba0-a3330cee6a86', 'Product Hypothesis', NULL, now()),
  ('2a14fd2f-846f-4b5d-810d-3478a52cdbef', 'Competitive Benchmark Report', NULL, now()),
  ('2a14fd2f-846f-4b5d-810d-3478a52cdbef', 'Idea Seeds', NULL, now()),
  ('2a14fd2f-846f-4b5d-810d-3478a52cdbef', 'Top 3 Recommendations', NULL, now()),
  ('2a14fd2f-846f-4b5d-810d-3478a52cdbef', 'Figma Make Prompt', NULL, now()),
  ('2a14fd2f-846f-4b5d-810d-3478a52cdbef', 'Product Requirements Document', NULL, now()),
  ('945d48da-c57f-419f-b0ca-288ae63ffaad', 'MoSCoW Prioritization Matrix', NULL, now()),
  ('945d48da-c57f-419f-b0ca-288ae63ffaad', 'User Stories and Epics', NULL, now()),
  ('945d48da-c57f-419f-b0ca-288ae63ffaad', 'User Flows', NULL, now()),
  ('945d48da-c57f-419f-b0ca-288ae63ffaad', 'Information Architecture Document', NULL, now());