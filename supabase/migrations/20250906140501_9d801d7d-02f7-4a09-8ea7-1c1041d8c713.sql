-- Add summary column to chat_histories table
ALTER TABLE public.chat_histories 
ADD COLUMN summary TEXT NULL;

-- Add index for better performance when filtering by summary
CREATE INDEX idx_chat_histories_summary ON public.chat_histories(summary) WHERE summary IS NOT NULL;