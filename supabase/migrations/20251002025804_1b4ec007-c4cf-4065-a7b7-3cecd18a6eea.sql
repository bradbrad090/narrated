-- Create chapter_photos table
CREATE TABLE public.chapter_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL,
  book_id UUID NOT NULL,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chapter_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for chapter_photos
CREATE POLICY "Users can view their own chapter photos"
ON public.chapter_photos
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can upload photos to their chapters"
ON public.chapter_photos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chapter photos"
ON public.chapter_photos
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_chapter_photos_updated_at
BEFORE UPDATE ON public.chapter_photos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update storage bucket to be public (for easier photo access)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'photos';

-- Storage policies for photos bucket
CREATE POLICY "Users can view photos in their folders"
ON storage.objects
FOR SELECT
USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload photos to their folders"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete photos from their folders"
ON storage.objects
FOR DELETE
USING (bucket_id = 'photos' AND (storage.foldername(name))[1] = auth.uid()::text);