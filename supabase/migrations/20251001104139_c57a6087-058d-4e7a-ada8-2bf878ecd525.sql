-- Remove obsolete columns from users table
ALTER TABLE public.users 
DROP COLUMN IF EXISTS age,
DROP COLUMN IF EXISTS completed_signup;