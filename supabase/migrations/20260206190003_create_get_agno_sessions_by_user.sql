-- Create simplified version of get_agno_sessions that only requires user_id
-- Useful for admin panel to get all sessions for a specific user

CREATE OR REPLACE FUNCTION public.get_agno_sessions_by_user(
    p_user_id TEXT,
    p_page INTEGER DEFAULT 1,
    p_limit INTEGER DEFAULT 10,
    p_msg_page INTEGER DEFAULT 1,
    p_msg_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  runs JSONB,
  stage_name TEXT,
  total_count BIGINT,
  session_id TEXT,
  is_plugin_val BOOLEAN,
  chip_name TEXT,
  session_data JSONB,
  updated_at BIGINT,
  workspace_id TEXT,
  project_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
  v_msg_offset INTEGER;
BEGIN
  v_offset := (GREATEST(p_page, 1) - 1) * GREATEST(p_limit, 1);
  v_msg_offset := (GREATEST(p_msg_page, 1) - 1) * GREATEST(COALESCE(p_msg_limit, 100000), 1);

  RETURN QUERY
  WITH base_sessions AS (
    SELECT
      s.*,
      csl.stage_name as stage_name_val,
      COALESCE(s.metadata->>'plugin' = 'figma', FALSE) as is_plugin_val,
      s.metadata->>'plugin' as chip_name_val,
      s.metadata->>'workspace_id' as workspace_id_val,
      s.metadata->>'project_id' as project_id_val
    FROM ai.agno_sessions s
    LEFT JOIN LATERAL (
      SELECT lookup.stage_name
      FROM loopops.component_stage_lookup lookup
      WHERE (s.agent_id IS NOT NULL AND lookup.component_id::TEXT = s.agent_id::TEXT)
        OR (s.team_id IS NOT NULL AND lookup.component_id::TEXT = s.team_id::TEXT)
      LIMIT 1
    ) csl ON TRUE
    WHERE s.user_id::TEXT = p_user_id::TEXT
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
    ORDER BY bs.updated_at DESC
    LIMIT GREATEST(p_limit, 1)
    OFFSET v_offset
  )
  SELECT
    (
      SELECT COALESCE(jsonb_agg(sub_ordered.cleaned_msg ORDER BY sub_ordered.created_at_num ASC, sub_ordered.msg_ordinality ASC), '[]'::jsonb)
      FROM (
        SELECT
          cleaned_msg,
          created_at_num,
          msg_ordinality
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
            (m_elem.val->>'created_at')::bigint as created_at_num,
            m_elem.msg_ordinality
          FROM jsonb_array_elements(
            CASE
              WHEN jsonb_typeof(ps.runs::jsonb) = 'array' THEN ps.runs::jsonb
              ELSE '[]'::jsonb
            END
          ) r_obj
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
        ) extraction
        ORDER BY created_at_num DESC, msg_ordinality DESC
        LIMIT p_msg_limit
        OFFSET v_msg_offset
      ) sub_ordered
    ) as runs,
    ps.stage_name_val as stage_name,
    ps.total_count,
    ps.session_id::TEXT as session_id,
    ps.is_plugin_val,
    ps.chip_name_val as chip_name,
    ps.session_data::JSONB,
    ps.updated_at,
    ps.workspace_id_val as workspace_id,
    ps.project_id_val as project_id
  FROM paginated_sessions ps;
END;
$$;

-- -- Grant execute permission to service_role only (admin function)
-- GRANT EXECUTE ON FUNCTION public.get_agno_sessions_by_user(TEXT, INTEGER, INTEGER, INTEGER, INTEGER) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.get_agno_sessions_by_user (
    TEXT,
    INTEGER,
    INTEGER,
    INTEGER,
    INTEGER
) IS 'Returns paginated agno sessions for a specific user (admin function). Only requires user_id. Messages with same created_at timestamp are ordered by msg_ordinality to ensure deterministic ordering.';