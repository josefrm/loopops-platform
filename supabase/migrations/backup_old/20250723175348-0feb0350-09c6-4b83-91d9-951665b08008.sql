-- Add UPDATE policy for agents table
CREATE POLICY "Allow authenticated users to update agents" 
ON public.agents 
FOR UPDATE 
TO authenticated 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);