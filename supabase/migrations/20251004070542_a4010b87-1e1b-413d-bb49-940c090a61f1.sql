-- SECURITY FIX: Replace ALL policies with explicit SELECT/INSERT/UPDATE/DELETE policies
-- This makes access control crystal clear and prevents any ambiguity about who can read data

-- ============================================================================
-- FIX 1: users table - Replace ALL policy with explicit policies
-- ============================================================================

-- Drop the existing ALL policy
DROP POLICY IF EXISTS "Authenticated users can manage their own record" ON public.users;

-- Create explicit SELECT policy - users can only view their own record
CREATE POLICY "Users can view their own record"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create explicit INSERT policy - users can only create their own record
CREATE POLICY "Users can create their own record"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Create explicit UPDATE policy - users can only update their own record
CREATE POLICY "Users can update their own record"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create explicit DELETE policy - users can only delete their own record
CREATE POLICY "Users can delete their own record"
ON public.users
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- ============================================================================
-- FIX 2: chat_histories table - Replace ALL policy with explicit policies
-- ============================================================================

-- Drop the existing ALL policy
DROP POLICY IF EXISTS "Authenticated users can manage their own chat histories" ON public.chat_histories;

-- Create explicit SELECT policy
CREATE POLICY "Users can view their own chat histories"
ON public.chat_histories
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create explicit INSERT policy
CREATE POLICY "Users can create their own chat histories"
ON public.chat_histories
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create explicit UPDATE policy
CREATE POLICY "Users can update their own chat histories"
ON public.chat_histories
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create explicit DELETE policy
CREATE POLICY "Users can delete their own chat histories"
ON public.chat_histories
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================================
-- FIX 3: pdf_jobs table - Add missing UPDATE and DELETE policies
-- ============================================================================

-- Add UPDATE policy (was missing)
CREATE POLICY "Users can update their own PDF jobs"
ON public.pdf_jobs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add DELETE policy (was missing)
CREATE POLICY "Users can delete their own PDF jobs"
ON public.pdf_jobs
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add security comments
COMMENT ON TABLE public.users IS 'User profiles - access strictly limited to authenticated users viewing their own data only';
COMMENT ON TABLE public.chat_histories IS 'Private conversation data - access strictly limited to authenticated users viewing their own conversations only';
COMMENT ON TABLE public.pdf_jobs IS 'PDF generation jobs - access strictly limited to authenticated users managing their own jobs only';