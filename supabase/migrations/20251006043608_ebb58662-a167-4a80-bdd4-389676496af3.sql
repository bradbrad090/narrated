-- Drop the country column from analytics_sessions table
ALTER TABLE public.analytics_sessions DROP COLUMN IF EXISTS country;