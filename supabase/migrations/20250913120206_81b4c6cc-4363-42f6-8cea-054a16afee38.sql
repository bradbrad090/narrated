-- Create email tracking table
CREATE TABLE public.chapter_email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chapter_id UUID NOT NULL,
  user_id UUID NOT NULL,
  email_type TEXT NOT NULL CHECK (email_type IN ('submission_confirmation', 'first_chapter_welcome')),
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_status TEXT NOT NULL DEFAULT 'sent' CHECK (email_status IN ('sent', 'failed', 'retrying')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on email tracking table
ALTER TABLE public.chapter_email_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for email logs
CREATE POLICY "Users can view their own email logs" 
ON public.chapter_email_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can create email logs" 
ON public.chapter_email_logs 
FOR INSERT 
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_chapter_email_logs_chapter_user ON public.chapter_email_logs(chapter_id, user_id);
CREATE INDEX idx_chapter_email_logs_user_type ON public.chapter_email_logs(user_id, email_type);

-- Create trigger function to send chapter submission emails
CREATE OR REPLACE FUNCTION public.send_chapter_submission_email()
RETURNS TRIGGER AS $$
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
        'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'token'
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
$$ LANGUAGE plpgsql SECURITY DEFINER;