-- Remove restrictive RLS policies from sessions table
DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can create their own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON public.sessions;

-- Create permissive policy for external API access
CREATE POLICY "Allow all access to sessions for external API"
ON public.sessions
FOR ALL
USING (true)
WITH CHECK (true);