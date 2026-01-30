-- Update get_agno_sessions function to support optional component_id
-- and add stage_name when component_id is not provided
-- This function now supports two modes:
-- 1. When p_component_id IS NOT NULL: filters by component_id (existing behavior, stage_name is NULL)
-- 2. When p_component_id IS NULL: returns all sessions matching other filters and adds stage_name

-- Drop the old function and create new one
DROP FUNCTION IF EXISTS public.get_agno_sessions(UUID, TEXT, TEXT, UUID);

-- Create function with optional component_id parameter
-- Since we need to add stage_name, we'll return TABLE type with JSONB for session data
-- This allows us to avoid listing all columns from ai.agno_sessions
CREATE OR REPLACE FUNCTION public.get_agno_sessions(
  p_user_id UUID,
  p_workspace_id TEXT,
  p_project_id TEXT,
  p_component_id UUID DEFAULT NULL
)
RETURNS TABLE (
  session_data JSONB,
  stage_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When component_id is provided, use existing logic (stage_name will be NULL)
  IF p_component_id IS NOT NULL THEN
    RETURN QUERY
    SELECT 
      to_jsonb(s.*) as session_data,
      NULL::TEXT as stage_name
    FROM ai.agno_sessions s
    WHERE s.user_id::TEXT = p_user_id::TEXT
      AND COALESCE(s.metadata->>'workspace_id', '') = COALESCE(p_workspace_id, '')
      AND COALESCE(s.metadata->>'project_id', '') = COALESCE(p_project_id, '')
      AND (
        (s.team_id IS NOT NULL AND s.team_id::TEXT = p_component_id::TEXT) OR 
        (s.agent_id IS NOT NULL AND s.agent_id::TEXT = p_component_id::TEXT)
      );
  ELSE
    -- When component_id is NULL, return all sessions with stage_name
    RETURN QUERY
    SELECT 
      to_jsonb(s.*) as session_data,
      csl.stage_name
    FROM ai.agno_sessions s
    LEFT JOIN loopops.component_stage_lookup csl ON (
      (s.agent_id IS NOT NULL AND csl.component_id::TEXT = s.agent_id::TEXT) OR
      (s.team_id IS NOT NULL AND csl.component_id::TEXT = s.team_id::TEXT)
    )
    WHERE s.user_id::TEXT = p_user_id::TEXT
      AND COALESCE(s.metadata->>'workspace_id', '') = COALESCE(p_workspace_id, '')
      AND COALESCE(s.metadata->>'project_id', '') = COALESCE(p_project_id, '');
  END IF;
END;
$$;

-- Grant execute permission to authenticated roles
GRANT EXECUTE ON FUNCTION public.get_agno_sessions(UUID, TEXT, TEXT, UUID) TO authenticated, anon, service_role;

-- Add comment
COMMENT ON FUNCTION public.get_agno_sessions IS 'Queries ai.agno_sessions table with filters for user_id, workspace_id, project_id, and optionally component_id. When component_id is NULL, returns all sessions with stage_name. Returns session_data as JSONB and stage_name as TEXT';

