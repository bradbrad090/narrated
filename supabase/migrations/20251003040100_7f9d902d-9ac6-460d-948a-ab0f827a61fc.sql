-- Fix chapter_email_logs INSERT policy to prevent users from creating logs for other users
DROP POLICY IF EXISTS "System can create email logs" ON public.chapter_email_logs;

CREATE POLICY "Users can create their own email logs" 
ON public.chapter_email_logs 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);