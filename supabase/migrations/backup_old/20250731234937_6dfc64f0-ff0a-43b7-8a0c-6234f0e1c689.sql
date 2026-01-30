-- Enable RLS on missing tables that have policies but RLS disabled
-- Using DO block to conditionally enable RLS only if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'agents') THEN
        ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_config') THEN
        ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'destinations') THEN
        ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documents') THEN
        ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'knowledge_documents') THEN
        ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sessions') THEN
        ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;