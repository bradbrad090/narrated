-- First, drop any existing constraints
ALTER TABLE public.chat_histories 
DROP CONSTRAINT IF EXISTS chat_histories_conversation_type_check;

ALTER TABLE public.conversation_questions 
DROP CONSTRAINT IF EXISTS conversation_questions_conversation_type_check;

-- Check what values currently exist
SELECT DISTINCT conversation_type, is_self_conversation FROM public.chat_histories;