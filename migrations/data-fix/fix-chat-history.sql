-- Fix RLS policies for chat history
-- The issue is that sessions table has permissive policy but messages table needs to check session ownership

-- First, drop the permissive sessions policy
DROP POLICY IF EXISTS "Allow all access to sessions for external API" ON public.sessions;

-- Create proper RLS policies for sessions table
CREATE POLICY "Users can view their own sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own sessions"
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
ON public.sessions
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions"
ON public.sessions
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Service role access for sessions (needed for edge functions)
CREATE POLICY "Service role can manage all sessions"
ON public.sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Update messages RLS policy to be more explicit
DROP POLICY IF EXISTS "Users can view their own session messages" ON public.messages;

CREATE POLICY "Users can view their own session messages"
ON public.messages
FOR SELECT
TO authenticated
USING (
  session_id IN (
    SELECT id FROM public.sessions WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert messages for their own sessions"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  session_id IN (
    SELECT id FROM public.sessions WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update messages for their own sessions"
ON public.messages
FOR UPDATE
TO authenticated
USING (
  session_id IN (
    SELECT id FROM public.sessions WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  session_id IN (
    SELECT id FROM public.sessions WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete messages for their own sessions"
ON public.messages
FOR DELETE
TO authenticated
USING (
  session_id IN (
    SELECT id FROM public.sessions WHERE user_id = auth.uid()
  )
);

-- Service role access for messages (needed for edge functions)
CREATE POLICY "Service role can manage all messages"
ON public.messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true); 