-- Fix "cannot extract elements from a scalar" error in get_agno_sessions function
-- The issue occurs when s.runs contains a scalar JSONB value instead of an array
-- This migration adds proper type checking before using jsonb_array_elements()

CREATE OR REPLACE FUNCTION public.get_agno_sessions(
  p_user_id UUID,
  p_workspace_id TEXT,
  p_project_id TEXT,
  p_component_id UUID DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  session_data JSONB,
  stage_name TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_max_runs_per_session INTEGER := 100;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * GREATEST(p_limit, 1);

  IF p_component_id IS NOT NULL THEN
    RETURN QUERY
    WITH base_sessions AS (
      SELECT 
        s.*,
        NULL::TEXT as stage_name,
        (
          SELECT MAX(COALESCE((run->>'created_at')::bigint, 0))
          FROM jsonb_array_elements(
            CASE 
              WHEN s.runs IS NULL THEN '[]'::jsonb
              WHEN jsonb_typeof(s.runs::jsonb) = 'array' THEN s.runs::jsonb
              ELSE '[]'::jsonb
            END
          ) run
        ) as max_created_at
      FROM ai.agno_sessions s
      WHERE s.user_id::TEXT = p_user_id::TEXT
        AND COALESCE(s.metadata->>'workspace_id', '') = COALESCE(p_workspace_id, '')
        AND COALESCE(s.metadata->>'project_id', '') = COALESCE(p_project_id, '')
        AND (
          (s.team_id IS NOT NULL AND s.team_id::TEXT = p_component_id::TEXT) OR 
          (s.agent_id IS NOT NULL AND s.agent_id::TEXT = p_component_id::TEXT)
        )
    ),
    total_cte AS (
      SELECT COUNT(*)::BIGINT as total_count FROM base_sessions
    ),
    paginated_sessions AS (
      SELECT 
        bs.*,
        tc.total_count,
        public.filter_runs_array(
          CASE 
            WHEN bs.runs IS NULL THEN '[]'::jsonb
            WHEN jsonb_typeof(bs.runs::jsonb) = 'array' THEN bs.runs::jsonb
            ELSE '[]'::jsonb
          END,
          v_max_runs_per_session
        ) as filtered_runs
      FROM base_sessions bs
      CROSS JOIN total_cte tc
      ORDER BY COALESCE(bs.max_created_at, 0) DESC
      LIMIT GREATEST(p_limit, 1)
      OFFSET v_offset
    )
    SELECT 
      (to_jsonb(ps) - 'runs' - 'max_created_at' - 'total_count' - 'stage_name' - 'filtered_runs') 
        || jsonb_build_object('runs', ps.filtered_runs) as session_data,
      ps.stage_name,
      ps.total_count
    FROM paginated_sessions ps;
  ELSE
    RETURN QUERY
    WITH base_sessions AS (
      SELECT 
        s.*,
        csl.stage_name,
        (
          SELECT MAX(COALESCE((run->>'created_at')::bigint, 0))
          FROM jsonb_array_elements(
            CASE 
              WHEN s.runs IS NULL THEN '[]'::jsonb
              WHEN jsonb_typeof(s.runs::jsonb) = 'array' THEN s.runs::jsonb
              ELSE '[]'::jsonb
            END
          ) run
        ) as max_created_at
      FROM ai.agno_sessions s
      LEFT JOIN loopops.component_stage_lookup csl ON (
        (s.agent_id IS NOT NULL AND csl.component_id::TEXT = s.agent_id::TEXT) OR
        (s.team_id IS NOT NULL AND csl.component_id::TEXT = s.team_id::TEXT)
      )
      WHERE s.user_id::TEXT = p_user_id::TEXT
        AND COALESCE(s.metadata->>'workspace_id', '') = COALESCE(p_workspace_id, '')
        AND COALESCE(s.metadata->>'project_id', '') = COALESCE(p_project_id, '')
    ),
    total_cte AS (
      SELECT COUNT(*)::BIGINT as total_count FROM base_sessions
    ),
    paginated_sessions AS (
      SELECT 
        bs.*,
        tc.total_count,
        public.filter_runs_array(
          CASE 
            WHEN bs.runs IS NULL THEN '[]'::jsonb
            WHEN jsonb_typeof(bs.runs::jsonb) = 'array' THEN bs.runs::jsonb
            ELSE '[]'::jsonb
          END,
          v_max_runs_per_session
        ) as filtered_runs
      FROM base_sessions bs
      CROSS JOIN total_cte tc
      ORDER BY COALESCE(bs.max_created_at, 0) DESC
      LIMIT GREATEST(p_limit, 1)
      OFFSET v_offset
    )
    SELECT 
      (to_jsonb(ps) - 'runs' - 'max_created_at' - 'total_count' - 'stage_name' - 'filtered_runs') 
        || jsonb_build_object('runs', ps.filtered_runs) as session_data,
      ps.stage_name,
      ps.total_count
    FROM paginated_sessions ps;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_agno_sessions(UUID, TEXT, TEXT, UUID, INTEGER, INTEGER) TO authenticated, anon, service_role;

-- Add comment
COMMENT ON FUNCTION public.get_agno_sessions IS 'Queries ai.agno_sessions table with filters for user_id, workspace_id, project_id, and optionally component_id. When component_id is NULL, returns all sessions with stage_name. Returns session_data as JSONB and stage_name as TEXT. Includes pagination and safely handles scalar runs values.';

