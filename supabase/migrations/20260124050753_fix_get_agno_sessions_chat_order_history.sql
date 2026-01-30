-- Fix: Chat history ordering issue where messages within the same second were returned in random order.
-- Problem: The 'created_at' timestamp in Agno messages has only second-level precision (Unix timestamp).
--          When multiple messages (e.g., tool cals and responses) occur in the same second,
--          sorting by 'created_at' alone is non-deterministic.

-- Drop the old function with UUID arguments if it exists to avoid ambiguity
DROP FUNCTION IF EXISTS public.get_agno_sessions(UUID, TEXT, TEXT, UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.get_agno_sessions(
    p_user_id TEXT,
    p_workspace_id TEXT,
    p_project_id TEXT,
    p_component_id TEXT,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    runs JSONB,
    stage_name TEXT,
    total_count BIGINT,
    session_id TEXT,
    is_plugin BOOLEAN,
    chip_name TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * GREATEST(p_limit, 1);

  RETURN QUERY
  WITH base_sessions AS (
    SELECT
      s.*,
      csl.stage_name as stage_name_val,
      COALESCE(s.metadata->>'plugin' = 'figma', FALSE) as is_plugin_val,
      s.metadata->>'plugin' as chip_name_val
    FROM ai.agno_sessions s
    LEFT JOIN LATERAL (
        SELECT lookup.stage_name
        FROM loopops.component_stage_lookup lookup
        WHERE (p_component_id IS NOT NULL AND lookup.component_id::TEXT = p_component_id)
           OR (s.agent_id IS NOT NULL AND lookup.component_id::TEXT = s.agent_id::TEXT)
           OR (s.team_id IS NOT NULL AND lookup.component_id::TEXT = s.team_id::TEXT)
        LIMIT 1
    ) csl ON TRUE
    WHERE s.user_id::TEXT = p_user_id::TEXT
      AND COALESCE(s.metadata->>'workspace_id', '') = COALESCE(p_workspace_id, '')
      AND COALESCE(s.metadata->>'project_id', '') = COALESCE(p_project_id, '')
      AND (
        p_component_id IS NULL OR
        (s.team_id IS NOT NULL AND s.team_id::TEXT = p_component_id) OR
        (s.agent_id IS NOT NULL AND s.agent_id::TEXT = p_component_id)
      )
  ),
  total_cte AS (
    SELECT COUNT(*)::BIGINT as total_count FROM base_sessions
  ),
  paginated_sessions AS (
    SELECT
      bs.*,
      tc.total_count
    FROM base_sessions bs
    CROSS JOIN total_cte tc
    LIMIT GREATEST(p_limit, 1)
    OFFSET v_offset
  )
  SELECT
    (
      SELECT jsonb_agg(cleaned_msg ORDER BY (cleaned_msg->>'created_at')::bigint ASC, msg_ordinality ASC) -- SE AGREGO msg_ordinality
      FROM (
        SELECT DISTINCT ON (m_elem.val->>'id')
          (
            CASE
              WHEN m_elem.val ? 'files' AND jsonb_typeof(m_elem.val->'files') = 'array' THEN
                m_elem.val || jsonb_build_object(
                  'files', (
                    SELECT COALESCE(jsonb_agg(f_obj - 'content'), '[]'::jsonb)
                    FROM jsonb_array_elements(m_elem.val->'files') f_obj
                  )
                )
              ELSE m_elem.val
            END
          ) || jsonb_build_object('session_id', ps.session_id) as cleaned_msg,
          m_elem.msg_ordinality
        FROM jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(ps.runs::jsonb) = 'array' THEN ps.runs::jsonb
            ELSE '[]'::jsonb
          END
        ) r_obj
             -- WITH ORDINALITY para capturar el orden original
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN jsonb_typeof(r_obj->'messages') = 'array' THEN r_obj->'messages'
            ELSE '[]'::jsonb
          END
        ) WITH ORDINALITY AS m_elem(val, msg_ordinality)
        WHERE m_elem.val->>'role' IN ('user', 'assistant')
          AND m_elem.val->>'id' IS NOT NULL
          AND m_elem.val->>'content' IS NOT NULL
        ORDER BY m_elem.val->>'id'
      ) sub
    ) as runs,
    ps.stage_name_val as stage_name,
    ps.total_count,
    ps.session_id::TEXT as session_id,
    ps.is_plugin_val,
    ps.chip_name_val as chip_name
  FROM paginated_sessions ps;
END;
$$;

-- Grant execute permission
GRANT
EXECUTE ON FUNCTION public.get_agno_sessions (
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    INTEGER,
    INTEGER
) TO authenticated,
anon,
service_role;

-- Add comment
COMMENT ON FUNCTION public.get_agno_sessions(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER) IS 'Queries ai.agno_sessions table with filters for user_id, workspace_id, project_id, and optionally component_id. When component_id is NULL, returns all sessions with stage_name. Returns session_data as JSONB and stage_name as TEXT. Includes pagination and safely handles scalar runs values.';
