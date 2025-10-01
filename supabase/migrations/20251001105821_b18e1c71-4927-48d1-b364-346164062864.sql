
-- Clean up orphaned profile_question_responses records
-- These records reference books that no longer exist

DELETE FROM public.profile_question_responses
WHERE NOT EXISTS (
  SELECT 1 FROM public.books WHERE books.id = profile_question_responses.book_id
);
