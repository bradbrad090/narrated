-- Add explicit deny policy for anonymous users on users table
-- This prevents public scraping of email addresses and full names

CREATE POLICY "Deny anonymous access to users table"
ON public.users
FOR SELECT
TO anon
USING (false);

-- Add explicit deny policy for anonymous insert/update/delete as well
CREATE POLICY "Deny anonymous insert to users table"
ON public.users
FOR INSERT
TO anon
WITH CHECK (false);

CREATE POLICY "Deny anonymous update to users table"
ON public.users
FOR UPDATE
TO anon
USING (false);

CREATE POLICY "Deny anonymous delete to users table"
ON public.users
FOR DELETE
TO anon
USING (false);