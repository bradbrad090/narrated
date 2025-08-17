-- Fix signup table security vulnerability
-- Ensure RLS is enabled on signup table
ALTER TABLE public.signup ENABLE ROW LEVEL SECURITY;

-- Add a restrictive SELECT policy that only allows authenticated administrators
-- For now, we'll restrict to authenticated users only since there's no role system
-- You may want to further restrict this to admin users only in the future
CREATE POLICY "Only authenticated users can view signups" 
ON public.signup 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Optional: Add a policy comment explaining the security reasoning
COMMENT ON POLICY "Only authenticated users can view signups" ON public.signup IS 
'Prevents public access to email addresses to avoid spam harvesting. Only authenticated users can view signup records.';