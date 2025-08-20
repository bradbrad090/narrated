-- Add conversation_medium column to distinguish between voice and text conversations
ALTER TABLE chat_histories 
ADD COLUMN conversation_medium text DEFAULT 'text' CHECK (conversation_medium IN ('text', 'voice'));

-- Update existing records to be marked as text
UPDATE chat_histories SET conversation_medium = 'text' WHERE conversation_medium IS NULL;