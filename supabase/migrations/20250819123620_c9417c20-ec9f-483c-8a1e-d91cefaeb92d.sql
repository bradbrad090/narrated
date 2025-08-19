-- First, remove the foreign key constraint from profiles table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_signup_id_fkey;

-- Drop the index on signup_id since we're changing its type
DROP INDEX IF EXISTS idx_profiles_signup_id;

-- Change signup_id column from UUID to boolean
ALTER TABLE public.profiles ALTER COLUMN signup_id DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN signup_id TYPE BOOLEAN USING (signup_id IS NOT NULL);
ALTER TABLE public.profiles ALTER COLUMN signup_id SET DEFAULT false;

-- Rename the column to be more descriptive
ALTER TABLE public.profiles RENAME COLUMN signup_id TO completed_signup;

-- Drop the signup table entirely
DROP TABLE IF EXISTS public.signup;