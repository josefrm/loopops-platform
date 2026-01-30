-- Fix storage RLS policies for document uploads

-- Create storage policies for buckets
CREATE POLICY "Allow authenticated users to create buckets" 
ON storage.buckets 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view buckets" 
ON storage.buckets 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow service role to manage all buckets" 
ON storage.buckets 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Create storage policies for objects
CREATE POLICY "Allow authenticated users to upload files" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view files" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to update files" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete files" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (true);

CREATE POLICY "Allow service role to manage all objects" 
ON storage.objects 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);