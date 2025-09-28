-- Remove obsolete writing_style_preference field from book_profiles
ALTER TABLE public.book_profiles DROP COLUMN IF EXISTS writing_style_preference;