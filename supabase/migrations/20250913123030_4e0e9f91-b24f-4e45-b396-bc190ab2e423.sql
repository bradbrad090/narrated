-- Fix the operator precedence issue in the trigger
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
    
    -- Call edge function to send email asynchronously
    PERFORM net.http_post(
      url := 'https://keadkwromhlyvoyxvcmi.supabase.co/functions/v1/send-chapter-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (current_setting('request.jwt.claims', true)::json->>'token')
      ),
      body := jsonb_build_object(
        'chapter_id', NEW.id,
        'user_id', NEW.user_id,
        'user_email', user_email,
        'user_name', user_name,
        'chapter_title', NEW.title,
        'chapter_number', NEW.chapter_number,
        'is_first_submission', is_first_submission,
        'submitted_at', NEW.updated_at
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;