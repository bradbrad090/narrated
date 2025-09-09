-- Update conversation types based on is_self_conversation flag
UPDATE public.chat_histories 
SET conversation_type = CASE 
  WHEN is_self_conversation = true THEN 'self'
  ELSE 'interview'
END;

-- Add the constraint with 'self' and 'interview' types
ALTER TABLE public.chat_histories 
ADD CONSTRAINT chat_histories_conversation_type_check 
CHECK (conversation_type IN ('self', 'interview'));