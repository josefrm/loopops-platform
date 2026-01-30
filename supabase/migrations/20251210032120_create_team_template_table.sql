-- Migration: Create global_team_templates table and seed data
-- Description: Creates new table for team templates with minimal schema and populates with initial teams

-- Create table
CREATE TABLE loopops.global_team_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  stage_template_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_team_stage_template 
    FOREIGN KEY (stage_template_id) 
    REFERENCES loopops.global_stage_templates(id) 
    ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_global_team_templates_name ON loopops.global_team_templates(name);
CREATE INDEX idx_global_team_templates_stage ON loopops.global_team_templates(stage_template_id);

-- Add comment
COMMENT ON TABLE loopops.global_team_templates IS 'Stores minimal team template identifiers; full configuration lives in code';

-- Initial data seeding
INSERT INTO loopops.global_team_templates (id, name, stage_template_id, created_at, updated_at)
VALUES 
  ('b287302c-7c28-48a8-a0ea-f68635584e7e', 'Discovery and Define', '2a14fd2f-846f-4b5d-810d-3478a52cdbef', now(), now()),
  ('4d260b07-07ec-45bb-9a32-38aad4a5f5ef', 'Design strategy', '945d48da-c57f-419f-b0ca-288ae63ffaad', now(), now());