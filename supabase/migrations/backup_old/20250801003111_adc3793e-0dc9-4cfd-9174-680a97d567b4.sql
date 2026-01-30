-- Add composite index for efficient queries (drop if exists with old column order)
DO $$
BEGIN
    -- Drop old index if it exists
    DROP INDEX IF EXISTS public.idx_team_agents_composite;
    -- Create new index with optimized column order
    CREATE INDEX idx_team_agents_composite ON public.team_agents(workspace_id, team_id, agent_id, custom_agent_id);
END $$;

-- Add unique constraint to prevent duplicate team agent assignments (excluding soft deleted)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_team_agents_unique'
    ) THEN
        CREATE UNIQUE INDEX idx_team_agents_unique ON public.team_agents(team_id, custom_agent_id, agent_id) WHERE deleted_at IS NULL;
    END IF;
END $$;

-- Add constraint to ensure either custom_agent_id or agent_id is not null (but not both null)
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