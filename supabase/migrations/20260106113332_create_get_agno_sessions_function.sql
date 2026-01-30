-- Create PostgreSQL function to query ai.agno_sessions table explicitly
-- This ensures the query explicitly references the ai schema
CREATE OR REPLACE FUNCTION public.get_agno_sessions(
  p_user_id UUID,
  p_workspace_id TEXT,
  p_project_id TEXT,
  p_component_id UUID
)
RETURNS SETOF ai.agno_sessions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.*
  FROM ai.agno_sessions s
  WHERE s.user_id::TEXT = p_user_id::TEXT
    AND COALESCE(s.metadata->>'workspace_id', '') = COALESCE(p_workspace_id, '')
    AND COALESCE(s.metadata->>'project_id', '') = COALESCE(p_project_id, '')
    AND (
      (s.team_id IS NOT NULL AND s.team_id::TEXT = p_component_id::TEXT) OR
      (s.agent_id IS NOT NULL AND s.agent_id::TEXT = p_component_id::TEXT)
    );
END;
$$;

-- Grant execute permission to authenticated roles
GRANT EXECUTE ON FUNCTION public.get_agno_sessions(UUID, TEXT, TEXT, UUID) TO authenticated, anon, service_role;

-- Add comment
COMMENT ON FUNCTION public.get_agno_sessions IS 'Queries ai.agno_sessions table explicitly with filters for user_id, workspace_id, project_id, and component_id';
