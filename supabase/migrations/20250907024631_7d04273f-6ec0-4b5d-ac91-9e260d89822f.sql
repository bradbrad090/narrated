-- Tighten RLS policies to require authentication

-- Update books table policies
DROP POLICY IF EXISTS "User own data" ON public.books;
DROP POLICY IF EXISTS "Users can view their own books" ON public.books;

CREATE POLICY "Authenticated users can manage their own books" 
ON public.books 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update chapters table policies
DROP POLICY IF EXISTS "Users can create their own chapters" ON public.chapters;
DROP POLICY IF EXISTS "Users can delete their own chapters" ON public.chapters;
DROP POLICY IF EXISTS "Users can update their own chapters" ON public.chapters;
DROP POLICY IF EXISTS "Users can view their own chapters" ON public.chapters;

CREATE POLICY "Authenticated users can manage their own chapters" 
ON public.chapters 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update chat_histories table policies
DROP POLICY IF EXISTS "User own data" ON public.chat_histories;

CREATE POLICY "Authenticated users can manage their own chat histories" 
ON public.chat_histories 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update conversation_context_cache table policies
DROP POLICY IF EXISTS "Users can manage their own context cache" ON public.conversation_context_cache;

CREATE POLICY "Authenticated users can manage their own context cache" 
ON public.conversation_context_cache 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update ai_chapter_metadata table policies
DROP POLICY IF EXISTS "Users can create their own metadata" ON public.ai_chapter_metadata;
DROP POLICY IF EXISTS "Users can delete their own metadata" ON public.ai_chapter_metadata;
DROP POLICY IF EXISTS "Users can update their own metadata" ON public.ai_chapter_metadata;
DROP POLICY IF EXISTS "Users can view their own metadata" ON public.ai_chapter_metadata;

CREATE POLICY "Authenticated users can manage their own metadata" 
ON public.ai_chapter_metadata 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update book_profiles table policies
DROP POLICY IF EXISTS "Users can create book profiles for their own books" ON public.book_profiles;
DROP POLICY IF EXISTS "Users can delete their own book profiles" ON public.book_profiles;
DROP POLICY IF EXISTS "Users can update their own book profiles" ON public.book_profiles;
DROP POLICY IF EXISTS "Users can view their own book profiles" ON public.book_profiles;

CREATE POLICY "Authenticated users can manage their own book profiles" 
ON public.book_profiles 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM books WHERE books.id = book_profiles.book_id AND books.user_id = auth.uid()
));

-- Update orders table policies
DROP POLICY IF EXISTS "User own data" ON public.orders;

CREATE POLICY "Authenticated users can manage their own orders" 
ON public.orders 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update users table policies
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
DROP POLICY IF EXISTS "Users can view their own record" ON public.users;

CREATE POLICY "Authenticated users can manage their own record" 
ON public.users 
FOR ALL 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Update profile_question_responses table policies
DROP POLICY IF EXISTS "Users can create their own question responses" ON public.profile_question_responses;
DROP POLICY IF EXISTS "Users can delete their own question responses" ON public.profile_question_responses;
DROP POLICY IF EXISTS "Users can update their own question responses" ON public.profile_question_responses;
DROP POLICY IF EXISTS "Users can view their own question responses" ON public.profile_question_responses;

CREATE POLICY "Authenticated users can manage their own question responses" 
ON public.profile_question_responses 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Update conversation_questions table policies
DROP POLICY IF EXISTS "Users can create their own conversation questions" ON public.conversation_questions;
DROP POLICY IF EXISTS "Users can delete their own conversation questions" ON public.conversation_questions;
DROP POLICY IF EXISTS "Users can update their own conversation questions" ON public.conversation_questions;
DROP POLICY IF EXISTS "Users can view their own conversation questions" ON public.conversation_questions;

CREATE POLICY "Authenticated users can manage their own conversation questions" 
ON public.conversation_questions 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);