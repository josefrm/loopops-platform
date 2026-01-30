-- Ensure ai schema and table exist for this function to work
CREATE SCHEMA IF NOT EXISTS ai;

CREATE TABLE IF NOT EXISTS ai.agno_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    user_id UUID,
    team_id TEXT, -- usage shows cast to text: s.team_id::TEXT
    agent_id TEXT, -- usage shows cast to text: s.agent_id::TEXT
    session_state JSONB,
    metrics JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    runs JSONB,
    total_tokens INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Grant usage on schema
GRANT USAGE ON SCHEMA ai TO authenticated, anon, service_role;
GRANT ALL ON TABLE ai.agno_sessions TO authenticated, anon, service_role;
