-- Drop existing foreign key constraints and recreate with CASCADE deletion
ALTER TABLE chat_histories DROP CONSTRAINT IF EXISTS chat_histories_chapter_id_fkey;

-- Add the foreign key constraint back with CASCADE deletion
ALTER TABLE chat_histories 
ADD CONSTRAINT chat_histories_chapter_id_fkey 
FOREIGN KEY (chapter_id) 
REFERENCES chapters(id) 
ON DELETE CASCADE;