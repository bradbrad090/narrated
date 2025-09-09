-- Update chat_histories table to allow 'self' conversation type and remove outdated types
ALTER TABLE public.chat_histories 
DROP CONSTRAINT IF EXISTS chat_histories_conversation_type_check;

-- Add new constraint with only 'self' and 'text' types (assuming text is for regular conversations)
ALTER TABLE public.chat_histories 
ADD CONSTRAINT chat_histories_conversation_type_check 
CHECK (conversation_type IN ('self', 'text'));

-- Also update conversation_questions table if it has similar constraint
ALTER TABLE public.conversation_questions 
DROP CONSTRAINT IF EXISTS conversation_questions_conversation_type_check;

ALTER TABLE public.conversation_questions 
ADD CONSTRAINT conversation_questions_conversation_type_check 
CHECK (conversation_type IN ('self', 'text'));