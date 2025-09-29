-- Remove conversation_goals column from chat_histories table
ALTER TABLE public.chat_histories 
DROP COLUMN IF EXISTS conversation_goals;