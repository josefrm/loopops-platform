-- Optimize get_agno_sessions function with pagination, runs filtering, message filtering, and sorting
-- This migration adds:
-- 1. Pagination support (page, limit)
-- 2. Filters runs array to reduce memory usage (limits runs, strips fields)
-- 3. Filters messages by role ('user' or 'assistant') at database level
-- 4. Deduplicates messages by ID at database level
-- 5. Sorts by max created_at from runs array
-- 6. Returns total count for pagination metadata

-- Helper function to filter and process runs array
CREATE OR REPLACE FUNCTION public.filter_runs_array(runs_jsonb JSONB, max_runs INTEGER DEFAULT 100)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  filtered_runs JSONB := '[]'::jsonb;
  run_record JSONB;
  run_index INTEGER := 0;
  message_record JSONB;
  seen_message_ids TEXT[] := '{}';
  message_id TEXT;
  filtered_messages JSONB;
  processed_run JSONB;
  run_created_at BIGINT;
BEGIN
  IF runs_jsonb IS NULL OR runs_jsonb = 'null'::jsonb OR jsonb_typeof(runs_jsonb) != 'array' THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Process runs in order (most recent first) and rebuild with filtered/deduplicated messages
  FOR run_record IN 
    SELECT value 
    FROM jsonb_array_elements(runs_jsonb) 
    ORDER BY COALESCE((value->>'created_at')::bigint, 0) DESC 
    LIMIT max_runs
  LOOP
    run_created_at := COALESCE((run_record->>'created_at')::bigint, 0);
    
    -- Build filtered run with only essential fields
    processed_run := jsonb_build_object(
      'created_at', run_record->>'created_at'
    );
    
    -- Add input if it exists
    IF run_record->'input' IS NOT NULL AND run_record->'input'->>'input_content' IS NOT NULL THEN
      processed_run := processed_run || jsonb_build_object(
        'input', jsonb_build_object('input_content', run_record->'input'->>'input_content')
      );
    END IF;
    
    -- Add content if it exists
    IF run_record->'content' IS NOT NULL THEN
      processed_run := processed_run || jsonb_build_object('content', run_record->'content');
    END IF;
    
    -- Filter and deduplicate messages for this run
    IF run_record->'messages' IS NOT NULL AND jsonb_typeof(run_record->'messages') = 'array' THEN
      filtered_messages := '[]'::jsonb;
      FOR message_record IN SELECT * FROM jsonb_array_elements(run_record->'messages')
      LOOP
        IF COALESCE(message_record->>'role', 'user') IN ('user', 'assistant') THEN
          message_id := COALESCE(message_record->>'id', '');
          -- Deduplicate: only add if we haven't seen this ID
          IF message_id = '' OR NOT (message_id = ANY(seen_message_ids)) THEN
            filtered_messages := filtered_messages || jsonb_build_array(message_record);
            IF message_id != '' THEN
              seen_message_ids := array_append(seen_message_ids, message_id);
            END IF;
          END IF;
        END IF;
      END LOOP;
      
      IF filtered_messages != '[]'::jsonb THEN
        processed_run := processed_run || jsonb_build_object('messages', filtered_messages);
      END IF;
    END IF;
    
    filtered_runs := filtered_runs || jsonb_build_array(processed_run);
  END LOOP;

  RETURN filtered_runs;
END;
$$;

-- Drop old function
DROP FUNCTION IF EXISTS public.get_agno_sessions(UUID, TEXT, TEXT, UUID);

-- Create optimized function
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
GRANT EXECUTE ON FUNCTION public.filter_runs_array(JSONB, INTEGER) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_agno_sessions(UUID, TEXT, TEXT, UUID, INTEGER, INTEGER) TO authenticated, anon, service_role;