-- Remove the summary column and index from chat_histories table
DROP INDEX IF EXISTS idx_chat_histories_summary;
ALTER TABLE public.chat_histories DROP COLUMN IF EXISTS summary;