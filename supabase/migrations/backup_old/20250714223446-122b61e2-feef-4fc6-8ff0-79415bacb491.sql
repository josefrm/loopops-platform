CREATE TABLE public.app_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Optional: Add a policy to restrict access
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin read access" ON public.app_config FOR SELECT USING (true);