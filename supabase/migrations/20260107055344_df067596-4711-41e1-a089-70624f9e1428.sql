-- Fix pdf_jobs policies to use authenticated role only
DROP POLICY IF EXISTS "Users can view their own PDF jobs" ON public.pdf_jobs;
DROP POLICY IF EXISTS "Users can create their own PDF jobs" ON public.pdf_jobs;
DROP POLICY IF EXISTS "Users can manage their own pdf jobs" ON public.pdf_jobs;

CREATE POLICY "Users can manage their own pdf jobs" ON public.pdf_jobs 
FOR ALL TO authenticated 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Remove redundant deny policies for anon role on users table (they're not needed when using TO authenticated)
DROP POLICY IF EXISTS "Deny anonymous access to users table" ON public.users;
DROP POLICY IF EXISTS "Deny anonymous insert to users table" ON public.users;
DROP POLICY IF EXISTS "Deny anonymous update to users table" ON public.users;
DROP POLICY IF EXISTS "Deny anonymous delete to users table" ON public.users;