-- Test and fix database issues for chat history

-- First, let's check the current table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- Check if RLS is enabled on messages table
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'messages';

-- Check current policies on messages table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'messages';

-- Check current policies on sessions table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'sessions';

-- Fix RLS policies for sessions table
DROP POLICY IF EXISTS "Allow all access to sessions for external API" ON public.sessions;

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

-- Service role access for sessions
CREATE POLICY "Service role can manage all sessions"
ON public.sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix RLS policies for messages table
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

-- Service role access for messages
CREATE POLICY "Service role can manage all messages"
ON public.messages
FOR ALL
TO service_role
USING (true)
WITH CHECK (true); 