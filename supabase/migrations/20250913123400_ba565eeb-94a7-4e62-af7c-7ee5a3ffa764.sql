-- Fix the trigger by removing the net.http_post call and making send-chapter-email public
CREATE OR REPLACE FUNCTION public.send_chapter_submission_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_email TEXT;
  user_name TEXT;
  is_first_submission BOOLEAN := FALSE;
BEGIN
  -- Only process when is_submitted changes from false to true
  IF OLD.is_submitted = FALSE AND NEW.is_submitted = TRUE THEN
    
    -- Get user details
    SELECT email, full_name INTO user_email, user_name
    FROM public.users 
    WHERE id = NEW.user_id;
    
    -- Check if this is the user's first submitted chapter using EXISTS
    SELECT NOT EXISTS (
      SELECT 1 FROM public.chapters 
      WHERE user_id = NEW.user_id 
      AND is_submitted = TRUE 
      AND id != NEW.id
    ) INTO is_first_submission;
    
    -- Log the submission (instead of HTTP call)
    INSERT INTO public.chapter_email_logs (
      chapter_id,
      user_id,
      email_type,
      email_status
    ) VALUES (
      NEW.id,
      NEW.user_id,
      'chapter_submission',
      'pending'
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;