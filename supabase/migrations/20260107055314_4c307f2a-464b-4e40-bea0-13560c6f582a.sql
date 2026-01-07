-- Remove the policy with public role that allows anonymous access
DROP POLICY IF EXISTS "Users can upload photos to their chapters" ON public.chapter_photos;