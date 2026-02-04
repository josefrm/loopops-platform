BEGIN;

DROP FUNCTION IF EXISTS public.get_agno_sessions (
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    INTEGER,
    INTEGER
);

DROP FUNCTION IF EXISTS public.get_agno_sessions (
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    INTEGER,
    INTEGER,
    INTEGER,
    INTEGER
);

CREATE OR REPLACE FUNCTION public.get_agno_sessions(
    p_user_id TEXT,
    p_workspace_id TEXT,
    p_project_id TEXT,
    p_component_id TEXT,
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
  updated_at BIGINT 
)
LANGUAGE plpgsql
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
    ORDER BY bs.updated_at DESC
    LIMIT GREATEST(p_limit, 1)
    OFFSET v_offset
  )
  SELECT 
    (
      SELECT COALESCE(jsonb_agg(sub_ordered.cleaned_msg ORDER BY (sub_ordered.cleaned_msg->>'created_at')::bigint ASC), '[]'::jsonb)
      FROM (
        SELECT cleaned_msg
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
            ) || jsonb_build_object('session_id', ps.session_id) as cleaned_msg
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
        ORDER BY (cleaned_msg->>'created_at')::bigint DESC
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
    ps.updated_at
  FROM paginated_sessions ps;
END;
$$;

COMMENT ON FUNCTION public.get_agno_sessions(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER, INTEGER) IS 'Returns paginated sessions with internal message pagination (msg_page 1 = most recent messages)';

COMMIT;