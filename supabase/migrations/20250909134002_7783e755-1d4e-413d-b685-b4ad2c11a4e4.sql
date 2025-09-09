-- Update existing conversation types to the new system
-- Keep 'interview' for regular conversations, allow 'self' for self-conversations
UPDATE public.chat_histories 
SET conversation_type = CASE 
  WHEN conversation_type = 'reflection' AND is_self_conversation = true THEN 'self'
  WHEN conversation_type = 'reflection' AND (is_self_conversation IS NULL OR is_self_conversation = false) THEN 'interview'
  WHEN conversation_type = 'interview' THEN 'interview'
  WHEN conversation_type = 'brainstorming' THEN 'interview'
  ELSE 'interview'
END;

-- Update conversation_questions table as well
UPDATE public.conversation_questions 
SET conversation_type = CASE 
  WHEN conversation_type IN ('reflection', 'brainstorming') THEN 'interview'
  WHEN conversation_type = 'interview' THEN 'interview'
  ELSE 'interview'
END;

-- Now add the constraints with 'self' and 'interview' types
ALTER TABLE public.chat_histories 
ADD CONSTRAINT chat_histories_conversation_type_check 
CHECK (conversation_type IN ('self', 'interview'));

ALTER TABLE public.conversation_questions 
ADD CONSTRAINT conversation_questions_conversation_type_check 
CHECK (conversation_type IN ('self', 'interview'));