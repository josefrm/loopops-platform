-- Remove existing restrictive RLS policies from session_contexts table
DROP POLICY IF EXISTS "Users can create their own session contexts" ON public.session_contexts;
DROP POLICY IF EXISTS "Users can view their own session contexts" ON public.session_contexts;
DROP POLICY IF EXISTS "Users can update their own session contexts" ON public.session_contexts;
DROP POLICY IF EXISTS "Users can delete their own session contexts" ON public.session_contexts;

-- Create permissive policies for external API access
CREATE POLICY "Allow all access to session contexts for external API"
ON public.session_contexts
FOR ALL
USING (true)
WITH CHECK (true);