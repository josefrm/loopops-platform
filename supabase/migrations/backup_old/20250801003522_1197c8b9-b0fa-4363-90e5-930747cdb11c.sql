-- Add constraint to ensure either custom_agent_id or agent_id is not null (but not both null)
-- Using DO block to check if constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_team_agents_agent_reference'
    ) THEN
        ALTER TABLE public.team_agents 
        ADD CONSTRAINT chk_team_agents_agent_reference 
        CHECK (custom_agent_id IS NOT NULL OR agent_id IS NOT NULL);
    END IF;
END $$;