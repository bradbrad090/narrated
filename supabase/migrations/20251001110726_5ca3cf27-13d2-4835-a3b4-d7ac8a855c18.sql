
-- First, clean up orphaned records that would violate the new foreign key constraints

-- Delete orphaned chapter_email_logs (chapters that no longer exist)
DELETE FROM public.chapter_email_logs
WHERE NOT EXISTS (
  SELECT 1 FROM public.chapters WHERE chapters.id = chapter_email_logs.chapter_id
);

-- Now add CASCADE delete foreign key constraints for chapter_id references
-- This ensures that when a chapter is deleted, all related records are automatically cleaned up

-- Add foreign key for chapter_email_logs.chapter_id
ALTER TABLE public.chapter_email_logs
DROP CONSTRAINT IF EXISTS chapter_email_logs_chapter_id_fkey;

ALTER TABLE public.chapter_email_logs
ADD CONSTRAINT chapter_email_logs_chapter_id_fkey
FOREIGN KEY (chapter_id)
REFERENCES public.chapters(id)
ON DELETE CASCADE;

-- Add foreign key for pdf_jobs.chapter_id
ALTER TABLE public.pdf_jobs
DROP CONSTRAINT IF EXISTS pdf_jobs_chapter_id_fkey;

ALTER TABLE public.pdf_jobs
ADD CONSTRAINT pdf_jobs_chapter_id_fkey
FOREIGN KEY (chapter_id)
REFERENCES public.chapters(id)
ON DELETE CASCADE;

-- Add foreign key for chat_histories.chapter_id (nullable, so only if not null)
ALTER TABLE public.chat_histories
DROP CONSTRAINT IF EXISTS chat_histories_chapter_id_fkey;

ALTER TABLE public.chat_histories
ADD CONSTRAINT chat_histories_chapter_id_fkey
FOREIGN KEY (chapter_id)
REFERENCES public.chapters(id)
ON DELETE CASCADE;

-- Add foreign key for ai_chapter_metadata.chapter_id
ALTER TABLE public.ai_chapter_metadata
DROP CONSTRAINT IF EXISTS ai_chapter_metadata_chapter_id_fkey;

ALTER TABLE public.ai_chapter_metadata
ADD CONSTRAINT ai_chapter_metadata_chapter_id_fkey
FOREIGN KEY (chapter_id)
REFERENCES public.chapters(id)
ON DELETE CASCADE;

-- Add foreign key for conversation_questions.chapter_id (nullable)
ALTER TABLE public.conversation_questions
DROP CONSTRAINT IF EXISTS conversation_questions_chapter_id_fkey;

ALTER TABLE public.conversation_questions
ADD CONSTRAINT conversation_questions_chapter_id_fkey
FOREIGN KEY (chapter_id)
REFERENCES public.chapters(id)
ON DELETE CASCADE;

-- Add foreign key for conversation_context_cache.chapter_id (nullable)
ALTER TABLE public.conversation_context_cache
DROP CONSTRAINT IF EXISTS conversation_context_cache_chapter_id_fkey;

ALTER TABLE public.conversation_context_cache
ADD CONSTRAINT conversation_context_cache_chapter_id_fkey
FOREIGN KEY (chapter_id)
REFERENCES public.chapters(id)
ON DELETE CASCADE;
