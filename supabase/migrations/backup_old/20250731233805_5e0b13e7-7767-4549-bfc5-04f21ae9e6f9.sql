-- Create teams table
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    key VARCHAR(5),
    role VARCHAR(100),
    model VARCHAR(255),
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- Create custom_agents table
CREATE TABLE public.custom_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    key VARCHAR(5),
    color VARCHAR(7),
    model VARCHAR(255),
    prompt TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- Create team_agents table
CREATE TABLE public.team_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    team_id UUID NOT NULL REFERENCES public.teams(id),
    custom_agent_id UUID REFERENCES public.custom_agents(id),
    agent_id UUID, -- Made nullable, no foreign key since public.agents doesn't exist
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    deleted_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    deleted_by UUID
);

-- Add indexes and constraints
CREATE INDEX idx_team_agents_composite ON public.team_agents(team_id, workspace_id, custom_agent_id, agent_id);
CREATE UNIQUE INDEX idx_team_agents_unique ON public.team_agents(team_id, custom_agent_id, agent_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_custom_agents_key_workspace ON public.custom_agents(key, workspace_id) WHERE key IS NOT NULL AND deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_agents ENABLE ROW LEVEL SECURITY;

-- RLS policies for teams
-- NOTE: Commented out because they reference v2.workspace_profile which doesn't exist yet
-- These need to be recreated after the v2 schema migration (20251106000000) runs
-- Uncomment and adjust as needed after v2.workspace_profile is created

-- CREATE POLICY "Users can view teams in their workspaces" ON public.teams
--     FOR SELECT USING (
--         workspace_id IN (
--             SELECT workspace_id FROM v2.workspace_profile 
--             WHERE profile_id = auth.uid()
--         )
--     );

-- CREATE POLICY "Users can create teams in their workspaces" ON public.teams
--     FOR INSERT WITH CHECK (
--         workspace_id IN (
--             SELECT workspace_id FROM v2.workspace_profile 
--             WHERE profile_id = auth.uid()
--         )
--     );

-- CREATE POLICY "Users can update teams in their workspaces" ON public.teams
--     FOR UPDATE USING (
--         workspace_id IN (
--             SELECT workspace_id FROM v2.workspace_profile 
--             WHERE profile_id = auth.uid()
--         )
--     );

-- -- RLS policies for custom_agents
-- CREATE POLICY "Users can view custom agents in their workspaces" ON public.custom_agents
--     FOR SELECT USING (
--         workspace_id IN (
--             SELECT workspace_id FROM v2.workspace_profile 
--             WHERE profile_id = auth.uid()
--         )
--     );

-- CREATE POLICY "Users can create custom agents in their workspaces" ON public.custom_agents
--     FOR INSERT WITH CHECK (
--         workspace_id IN (
--             SELECT workspace_id FROM v2.workspace_profile 
--             WHERE profile_id = auth.uid()
--         )
--     );

-- CREATE POLICY "Users can update custom agents in their workspaces" ON public.custom_agents
--     FOR UPDATE USING (
--         workspace_id IN (
--             SELECT workspace_id FROM v2.workspace_profile 
--             WHERE profile_id = auth.uid()
--         )
--     );

-- -- RLS policies for team_agents
-- CREATE POLICY "Users can view team agents in their workspaces" ON public.team_agents
--     FOR SELECT USING (
--         workspace_id IN (
--             SELECT workspace_id FROM v2.workspace_profile 
--             WHERE profile_id = auth.uid()
--         )
--     );

-- CREATE POLICY "Users can create team agents in their workspaces" ON public.team_agents
--     FOR INSERT WITH CHECK (
--         workspace_id IN (
--             SELECT workspace_id FROM v2.workspace_profile 
--             WHERE profile_id = auth.uid()
--         )
--     );

-- CREATE POLICY "Users can update team agents in their workspaces" ON public.team_agents
--     FOR UPDATE USING (
--         workspace_id IN (
--             SELECT workspace_id FROM v2.workspace_profile 
--             WHERE profile_id = auth.uid()
--         )
--     );

-- Service role policies
CREATE POLICY "Service role can manage all teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all custom agents" ON public.custom_agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role can manage all team agents" ON public.team_agents FOR ALL USING (true) WITH CHECK (true);

-- NOTE: Data migration from old public.agents table commented out
-- The public.agents table doesn't exist in this migration setup
-- If migrating from an existing database, uncomment and adjust as needed

-- -- Migrate data from agents table to teams (agent_mode = 'team')
-- INSERT INTO public.teams (workspace_id, name, key, role, model, instructions, created_at)
-- SELECT 
--     workspace_id,
--     agent_name,
--     NULL, -- key set to null
--     agent_role,
--     model,
--     agent_prompt,
--     created_at
-- FROM public.agents 
-- WHERE agent_mode = 'team';

-- -- Migrate data from agents table to custom_agents (agent_mode = 'individual')
-- INSERT INTO public.custom_agents (workspace_id, name, key, color, model, prompt, created_at)
-- SELECT 
--     workspace_id,
--     agent_name,
--     NULL, -- key set to null
--     NULL, -- color not available in agents table
--     model,
--     agent_prompt,
--     created_at
-- FROM public.agents 
-- WHERE agent_mode = 'individual';

-- -- Migrate data from agents table to team_agents (agent_mode = 'coordinator')
-- INSERT INTO public.team_agents (workspace_id, team_id, custom_agent_id, agent_id, created_at)
-- SELECT DISTINCT
--     a.workspace_id,
--     t.id as team_id,
--     ca.id as custom_agent_id,
--     orig_a.id as agent_id,
--     a.created_at
-- FROM public.agents a
-- CROSS JOIN LATERAL unnest(a.members) AS member_id
-- LEFT JOIN public.teams t ON t.workspace_id = a.workspace_id AND t.name = a.agent_name
-- LEFT JOIN public.custom_agents ca ON ca.workspace_id = a.workspace_id AND ca.name = (
--     SELECT agent_name FROM public.agents WHERE id::text = member_id AND agent_mode = 'individual'
-- )
-- LEFT JOIN public.agents orig_a ON orig_a.id::text = member_id AND orig_a.agent_mode NOT IN ('team', 'individual')
-- WHERE a.agent_mode = 'coordinator' 
-- AND a.members IS NOT NULL 
-- AND array_length(a.members, 1) > 0
-- AND (ca.id IS NOT NULL OR orig_a.id IS NOT NULL);