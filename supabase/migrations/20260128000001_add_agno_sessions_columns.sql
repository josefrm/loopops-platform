-- Add missing columns to ai.agno_sessions table

DO $$
BEGIN
  -- session_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ai' AND table_name = 'agno_sessions' AND column_name = 'session_type') THEN
    ALTER TABLE ai.agno_sessions ADD COLUMN session_type TEXT;
  END IF;

  -- team_data
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ai' AND table_name = 'agno_sessions' AND column_name = 'team_data') THEN
    ALTER TABLE ai.agno_sessions ADD COLUMN team_data JSONB;
  END IF;

  -- session_data
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ai' AND table_name = 'agno_sessions' AND column_name = 'session_data') THEN
    ALTER TABLE ai.agno_sessions ADD COLUMN session_data JSONB;
  END IF;

  -- summary
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ai' AND table_name = 'agno_sessions' AND column_name = 'summary') THEN
    ALTER TABLE ai.agno_sessions ADD COLUMN summary TEXT;
  END IF;

  -- workflow_data
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ai' AND table_name = 'agno_sessions' AND column_name = 'workflow_data') THEN
    ALTER TABLE ai.agno_sessions ADD COLUMN workflow_data JSONB;
  END IF;

  -- agent_data
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ai' AND table_name = 'agno_sessions' AND column_name = 'agent_data') THEN
    ALTER TABLE ai.agno_sessions ADD COLUMN agent_data JSONB;
  END IF;

  -- workflow_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'ai' AND table_name = 'agno_sessions' AND column_name = 'workflow_id') THEN
    ALTER TABLE ai.agno_sessions ADD COLUMN workflow_id TEXT;
  END IF;

END
$$;
