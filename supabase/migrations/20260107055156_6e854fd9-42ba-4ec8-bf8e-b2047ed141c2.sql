-- Fix storage policies to only allow authenticated users (not anonymous)
-- Drop the existing policies that allow anonymous access
DROP POLICY IF EXISTS "Users can view photos in their folders" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete photos from their folders" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload photos to their folders" ON storage.objects;
DROP POLICY IF EXISTS "Users can update photos in their folders" ON storage.objects;

-- Recreate policies that explicitly require authenticated role only
CREATE POLICY "Authenticated users can view photos in their folders" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can upload photos to their folders" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can update photos in their folders" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can delete photos from their folders" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);