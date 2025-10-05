-- Fix security issue: Prevent public access to users table
-- Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their own record" ON public.users;
DROP POLICY IF EXISTS "Users can create their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
DROP POLICY IF EXISTS "Users can delete their own record" ON public.users;

-- Recreate policies with explicit authenticated user checks
CREATE POLICY "Users can view their own record" 
ON public.users 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can create their own record" 
ON public.users 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own record" 
ON public.users 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own record" 
ON public.users 
FOR DELETE 
TO authenticated
USING (auth.uid() = id);