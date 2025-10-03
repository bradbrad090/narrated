-- Fix delete_book_and_related_data function by removing reference to dropped conversation_questions table
CREATE OR REPLACE FUNCTION public.delete_book_and_related_data(target_book_id uuid)
RETURNS TABLE(success boolean, message text, records_deleted jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  book_exists BOOLEAN := FALSE;
  book_user_id uuid;
  deleted_counts JSONB := '{}';
  temp_count INTEGER;
  error_message TEXT;
BEGIN
  -- Verify user owns this book
  SELECT EXISTS(
    SELECT 1 FROM public.books 
    WHERE id = target_book_id AND user_id = auth.uid()
  ) INTO book_exists;
  
  IF NOT book_exists THEN
    RETURN QUERY SELECT FALSE, 'Book not found or access denied'::text, '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Get the book's user_id for filtering
  SELECT user_id INTO book_user_id FROM public.books WHERE id = target_book_id;
  
  -- Delete related records in dependency order (child → parent)
  
  -- Delete chapter email logs (depends on chapters)
  DELETE FROM public.chapter_email_logs 
  WHERE chapter_id IN (SELECT id FROM public.chapters WHERE book_id = target_book_id);
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('chapter_email_logs', temp_count);
  
  -- Delete PDF jobs (depends on chapters)
  DELETE FROM public.pdf_jobs 
  WHERE chapter_id IN (SELECT id FROM public.chapters WHERE book_id = target_book_id);
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('pdf_jobs', temp_count);
  
  -- Delete AI chapter metadata
  DELETE FROM public.ai_chapter_metadata WHERE book_id = target_book_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('ai_chapter_metadata', temp_count);
  
  -- Delete conversation context cache
  DELETE FROM public.conversation_context_cache WHERE book_id = target_book_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('conversation_context_cache', temp_count);
  
  -- Delete profile question responses
  DELETE FROM public.profile_question_responses WHERE book_id = target_book_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('profile_question_responses', temp_count);
  
  -- Delete chat histories
  DELETE FROM public.chat_histories 
  WHERE chapter_id IN (SELECT id FROM public.chapters WHERE book_id = target_book_id);
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('chat_histories', temp_count);
  
  -- Delete chapter photos
  DELETE FROM public.chapter_photos WHERE book_id = target_book_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('chapter_photos', temp_count);
  
  -- Delete chapters
  DELETE FROM public.chapters WHERE book_id = target_book_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('chapters', temp_count);
  
  -- Delete book profiles
  DELETE FROM public.book_profiles WHERE book_id = target_book_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('book_profiles', temp_count);
  
  -- Delete orders
  DELETE FROM public.orders WHERE book_id = target_book_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('orders', temp_count);
  
  -- Delete the book
  DELETE FROM public.books WHERE id = target_book_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('books', temp_count);
  
  RETURN QUERY SELECT TRUE, 'Book and all related data successfully deleted'::text, deleted_counts;
  
EXCEPTION
  WHEN OTHERS THEN
    error_message := SQLERRM;
    RAISE WARNING 'Error deleting book %: %', target_book_id, error_message;
    RETURN QUERY SELECT FALSE, 'Deletion failed due to database error'::text, '{}'::jsonb;
END;
$$;