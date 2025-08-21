-- Add updated_at column to chat_histories table
ALTER TABLE public.chat_histories 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;

-- Set default value for existing records
UPDATE public.chat_histories 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Set up trigger to automatically update the updated_at column
CREATE TRIGGER update_chat_histories_updated_at
    BEFORE UPDATE ON public.chat_histories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();