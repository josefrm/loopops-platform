-- Add service role access to session_contexts table for edge functions
-- This is needed for the chat-with-agents function to access session_contexts

CREATE POLICY "Service role can manage all session contexts"
ON public.session_contexts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true); 