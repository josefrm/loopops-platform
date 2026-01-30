-- Enable RLS on remaining tables that need it
-- Using DO block to conditionally enable RLS only if tables exist
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'document_processing_queue') THEN
        ALTER TABLE public.document_processing_queue ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'n8n_chat_histories') THEN
        ALTER TABLE public.n8n_chat_histories ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'llm_models') THEN
        ALTER TABLE public.llm_models ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;