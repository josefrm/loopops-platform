-- Add key and color columns to agents table (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agents') THEN
        -- Add columns if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'key') THEN
            ALTER TABLE public.agents ADD COLUMN key character varying(5) NULL;
        END IF;
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'agents' AND column_name = 'color') THEN
            ALTER TABLE public.agents ADD COLUMN color varchar(10) NULL;
        END IF;
        
        -- Update agents with key and color based on agent_name
        UPDATE public.agents SET key = 'DoD', color = '#9C3698' WHERE agent_name = 'DoDAgent';
        UPDATE public.agents SET key = 'DoR', color = '#8B5AD0' WHERE agent_name = 'DoRAgent';
        UPDATE public.agents SET key = 'AC', color = '#5D6DDE' WHERE agent_name = 'AcceptanceCriteriaAgent';
        UPDATE public.agents SET key = 'ES', color = '#347ECF' WHERE agent_name = 'ExecutiveSummaryAgent';
        UPDATE public.agents SET key = 'CS', color = '#3498AA' WHERE agent_name = 'CurrentSprintAnalystAgent';
        UPDATE public.agents SET key = 'RA', color = '#39AEAE' WHERE agent_name = 'RiskAnalysisAgent';
        UPDATE public.agents SET key = 'NS', color = '#49A97F' WHERE agent_name = 'NextSprintAgent';
        UPDATE public.agents SET key = 'KPI', color = '#EEAA37' WHERE agent_name = 'KPIAgent';
        UPDATE public.agents SET key = 'AI', color = '#BEB342' WHERE agent_name = 'AI Assistant';
    END IF;
END $$;