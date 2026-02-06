DROP FUNCTION IF EXISTS public.get_agno_memories_by_user (TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_agno_memories_by_user(
    p_user_id TEXT,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  memory_id UUID,   
  memory TEXT,
  feedback TEXT,
  input TEXT,
  agent_id TEXT,
  team_id TEXT,
  user_id TEXT,
  topics JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * GREATEST(p_limit, 1);

  RETURN QUERY
  WITH total_cte AS (
    SELECT COUNT(*)::BIGINT as total_val
    FROM ai.agno_memories mem
    WHERE mem.user_id::TEXT = p_user_id
  )
  SELECT
    m.memory_id::UUID,
    m.memory::TEXT,
    m.feedback::TEXT,
    m.input::TEXT,
    m.agent_id::TEXT,
    m.team_id::TEXT,
    m.user_id::TEXT,
    m.topics::JSONB,
    tc.total_val
  FROM ai.agno_memories m
  CROSS JOIN total_cte tc
  WHERE m.user_id::TEXT = p_user_id
  ORDER BY m.created_at DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET v_offset;
END;
$$;