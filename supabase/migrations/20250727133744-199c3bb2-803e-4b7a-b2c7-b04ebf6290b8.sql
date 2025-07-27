-- Ensure signup table exists and is accessible
-- This table should already exist but let's make sure it's properly configured
CREATE TABLE IF NOT EXISTS public.signup (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS but allow public access for signups
ALTER TABLE public.signup ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists and create a new one
DROP POLICY IF EXISTS "Allow public signup insertions" ON public.signup;

-- Create a policy that allows anyone to insert into signup table
CREATE POLICY "Allow public signup insertions" 
ON public.signup 
FOR INSERT 
TO anon 
WITH CHECK (true);