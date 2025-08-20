-- Add support for self conversation mode
-- Add a is_self_conversation boolean column to track self-mode entries
ALTER TABLE public.chat_histories 
ADD COLUMN is_self_conversation BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX idx_chat_histories_self_conversation ON public.chat_histories(user_id, chapter_id, is_self_conversation);