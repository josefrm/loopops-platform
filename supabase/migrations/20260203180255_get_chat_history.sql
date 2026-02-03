-- ============================================
-- MIGRATION: public.get_chat_history function
-- ============================================

-- Drop función si existe
DROP FUNCTION IF EXISTS public.get_chat_history (
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    TEXT,
    INTEGER,
    INTEGER
);

-- Crear función public.get_chat_history
CREATE OR REPLACE FUNCTION public.get_chat_history(
  p_user_id TEXT DEFAULT NULL,
  p_workspace_id TEXT DEFAULT NULL,
  p_project_id TEXT DEFAULT NULL,
  p_component_id TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  message_id TEXT,
  session_id TEXT,
  session_name TEXT,
  stage_name TEXT,
  role TEXT,
  content TEXT,
  created_at BIGINT,
  files JSONB,
  metrics JSONB,
  provider_data JSONB,
  is_plugin BOOLEAN,
  chip_name TEXT,
  total_count BIGINT,
  row_num BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  -- Calcular offset para paginación
  v_offset := (GREATEST(p_page, 1) - 1) * GREATEST(p_limit, 1);
  
  RETURN QUERY
  WITH base_sessions AS (
    -- Obtener todas las sesiones que coincidan con los filtros
    SELECT 
      s.session_id,
      s.runs,
      s.session_data,
      s.agent_id,
      s.team_id,
      s.created_at as session_created_at,
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
    WHERE (p_session_id IS NULL OR s.session_id::TEXT = p_session_id)
      AND (p_user_id IS NULL OR s.user_id::TEXT = p_user_id::TEXT)
      AND (p_workspace_id IS NULL OR COALESCE(s.metadata->>'workspace_id', '') = p_workspace_id)
      AND (p_project_id IS NULL OR COALESCE(s.metadata->>'project_id', '') = p_project_id)
      AND (
        p_component_id IS NULL OR 
        (s.team_id IS NOT NULL AND s.team_id::TEXT = p_component_id) OR 
        (s.agent_id IS NOT NULL AND s.agent_id::TEXT = p_component_id)
      )
  ),
  all_messages AS (
    SELECT DISTINCT ON (m_elem.val->>'id')
      m_elem.val->>'id' as message_id,
      bs.session_id::TEXT as msg_session_id,
      bs.session_data->>'session_name' as session_name,
      bs.stage_name_val,
      m_elem.val->>'role' as role,
      m_elem.val->>'content' as content,
      (m_elem.val->>'created_at')::BIGINT as msg_created_at,
      CASE 
        WHEN m_elem.val ? 'files' AND jsonb_typeof(m_elem.val->'files') = 'array' THEN 
          (
            SELECT COALESCE(jsonb_agg(f_obj - 'content'), '[]'::jsonb)
            FROM jsonb_array_elements(m_elem.val->'files') f_obj
          )
        ELSE NULL
      END as files,
      m_elem.val->'metrics' as metrics,
      m_elem.val->'provider_data' as provider_data,
      bs.is_plugin_val,
      bs.chip_name_val,
      m_elem.msg_ordinality
    FROM base_sessions bs
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE 
        WHEN jsonb_typeof(bs.runs::jsonb) = 'array' THEN bs.runs::jsonb 
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
  ),
  ordered_messages AS (
    SELECT 
      am.message_id,
      am.msg_session_id,
      am.session_name,
      am.stage_name_val,
      am.role,
      am.content,
      am.msg_created_at,
      am.files,
      am.metrics,
      am.provider_data,
      am.is_plugin_val,
      am.chip_name_val,
      am.msg_ordinality,
      ROW_NUMBER() OVER (ORDER BY am.msg_created_at ASC, am.msg_ordinality ASC) as global_row_num
    FROM all_messages am
  ),
  total_cte AS (
    SELECT COUNT(*)::BIGINT as total_count FROM ordered_messages
  ),
  paginated_messages AS (
    SELECT 
      om.message_id,
      om.msg_session_id,
      om.session_name,
      om.stage_name_val,
      om.role,
      om.content,
      om.msg_created_at,
      om.files,
      om.metrics,
      om.provider_data,
      om.is_plugin_val,
      om.chip_name_val,
      om.msg_ordinality,
      om.global_row_num,
      tc.total_count
    FROM ordered_messages om
    CROSS JOIN total_cte tc
    WHERE om.global_row_num > v_offset
      AND om.global_row_num <= v_offset + GREATEST(p_limit, 1)
  )
  SELECT 
    pm.message_id,
    pm.msg_session_id as session_id,
    pm.session_name,
    pm.stage_name_val as stage_name,
    pm.role,
    pm.content,
    pm.msg_created_at as created_at,
    pm.files,
    pm.metrics,
    pm.provider_data,
    pm.is_plugin_val as is_plugin,
    pm.chip_name_val as chip_name,
    pm.total_count,
    pm.global_row_num as row_num
  FROM paginated_messages pm
  ORDER BY pm.msg_created_at ASC, pm.msg_ordinality ASC;
END;
$$;

COMMENT ON FUNCTION public.get_chat_history IS 'Obtiene el historial de mensajes de chat con paginación. Soporta filtrado por session_id o por user_id+workspace_id+project_id. Mantiene el orden original usando msg_ordinality.';