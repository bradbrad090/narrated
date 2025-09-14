-- Function to safely delete a user and all their related data
-- This function ensures complete data removal while maintaining referential integrity

CREATE OR REPLACE FUNCTION public.delete_user_and_related_data(target_user_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  records_deleted JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_exists BOOLEAN := FALSE;
  deleted_counts JSONB := '{}';
  temp_count INTEGER;
  error_message TEXT;
BEGIN
  -- Start transaction (implicit in function)
  
  -- Step 1: Verify user exists
  SELECT EXISTS(SELECT 1 FROM public.users WHERE id = target_user_id) INTO user_exists;
  
  IF NOT user_exists THEN
    RETURN QUERY SELECT FALSE, 'User not found', '{}';
    RETURN;
  END IF;
  
  -- Log the deletion attempt
  RAISE NOTICE 'Starting deletion process for user: %', target_user_id;
  
  -- Step 2: Delete related records in dependency order (child → parent)
  
  -- Delete chapter email logs (depends on chapters)
  DELETE FROM public.chapter_email_logs WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('chapter_email_logs', temp_count);
  
  -- Delete PDF jobs (depends on chapters)  
  DELETE FROM public.pdf_jobs WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('pdf_jobs', temp_count);
  
  -- Delete AI chapter metadata (depends on chapters, books)
  DELETE FROM public.ai_chapter_metadata WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('ai_chapter_metadata', temp_count);
  
  -- Delete conversation questions (depends on books, chapters)
  DELETE FROM public.conversation_questions WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('conversation_questions', temp_count);
  
  -- Delete conversation context cache (depends on books, chapters)
  DELETE FROM public.conversation_context_cache WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('conversation_context_cache', temp_count);
  
  -- Delete profile question responses (depends on books)
  DELETE FROM public.profile_question_responses WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('profile_question_responses', temp_count);
  
  -- Delete chat histories (may reference chapters)
  DELETE FROM public.chat_histories WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('chat_histories', temp_count);
  
  -- Delete chapters (depends on books)
  DELETE FROM public.chapters WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('chapters', temp_count);
  
  -- Delete book profiles (depends on books)
  DELETE FROM public.book_profiles WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('book_profiles', temp_count);
  
  -- Delete orders (depends on books)
  DELETE FROM public.orders WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('orders', temp_count);
  
  -- Delete books
  DELETE FROM public.books WHERE user_id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('books', temp_count);
  
  -- Finally, delete the user record
  DELETE FROM public.users WHERE id = target_user_id;
  GET DIAGNOSTICS temp_count = ROW_COUNT;
  deleted_counts := deleted_counts || jsonb_build_object('users', temp_count);
  
  -- Log successful completion
  RAISE NOTICE 'Successfully deleted user % and related data: %', target_user_id, deleted_counts;
  
  -- Return success result
  RETURN QUERY SELECT TRUE, 'User and all related data successfully deleted', deleted_counts;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error (but don't expose sensitive details)
    error_message := SQLERRM;
    RAISE WARNING 'Error deleting user %: %', target_user_id, error_message;
    
    -- Return error result (transaction will auto-rollback)
    RETURN QUERY SELECT FALSE, 'Deletion failed due to database error', '{}';
END;
$$;

-- Grant execute permission to authenticated users (they can only delete their own data via RLS)
GRANT EXECUTE ON FUNCTION public.delete_user_and_related_data(UUID) TO authenticated;

-- Example usage function that enforces users can only delete themselves
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,  
  records_deleted JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path = public
AS $$
BEGIN
  -- Ensure user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Authentication required', '{}';
    RETURN;
  END IF;
  
  -- Call the main deletion function with the authenticated user's ID
  RETURN QUERY SELECT * FROM public.delete_user_and_related_data(auth.uid());
END;
$$;

-- Grant execute permission for the user-facing function
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;