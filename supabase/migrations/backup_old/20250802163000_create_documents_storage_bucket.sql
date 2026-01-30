-- Create RLS policies for workspace-specific document buckets
-- These policies will apply to buckets named 'workspace-{id}-documents'

CREATE POLICY "Users can upload documents to their workspace bucket"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id LIKE 'workspace-%-documents' AND
  bucket_id IN (
    SELECT 'workspace-' || workspace_id || '-documents' 
    FROM public.workspace_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can view documents in their workspace bucket"
ON storage.objects FOR SELECT
USING (
  bucket_id LIKE 'workspace-%-documents' AND
  bucket_id IN (
    SELECT 'workspace-' || workspace_id || '-documents' 
    FROM public.workspace_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can delete documents in their workspace bucket"
ON storage.objects FOR DELETE
USING (
  bucket_id LIKE 'workspace-%-documents' AND
  bucket_id IN (
    SELECT 'workspace-' || workspace_id || '-documents' 
    FROM public.workspace_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Service role can manage all workspace document buckets
CREATE POLICY "Service role can manage all workspace documents"
ON storage.objects FOR ALL
USING (current_setting('role') = 'service_role'); 