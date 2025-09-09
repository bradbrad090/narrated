-- First, update existing conversation types to the new format
UPDATE public.chat_histories 
SET conversation_type = CASE 
  WHEN conversation_type IN ('interview', 'reflection', 'brainstorming') THEN 'text'
  WHEN conversation_type = 'self' THEN 'self'
  ELSE 'text'
END;

-- Update conversation_questions table as well
UPDATE public.conversation_questions 
SET conversation_type = CASE 
  WHEN conversation_type IN ('interview', 'reflection', 'brainstorming') THEN 'text'
  WHEN conversation_type = 'self' THEN 'self'
  ELSE 'text'
END;

-- Now add the constraints with only 'self' and 'text' types
ALTER TABLE public.chat_histories 
ADD CONSTRAINT chat_histories_conversation_type_check 
CHECK (conversation_type IN ('self', 'text'));

ALTER TABLE public.conversation_questions 
ADD CONSTRAINT conversation_questions_conversation_type_check 
CHECK (conversation_type IN ('self', 'text'));