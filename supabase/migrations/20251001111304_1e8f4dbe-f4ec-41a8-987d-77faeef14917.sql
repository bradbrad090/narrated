-- Remove obsolete conversation_questions table
-- This table is not being used by any application code or edge functions

-- Drop the table (CASCADE will drop the foreign key constraint too)
DROP TABLE IF EXISTS public.conversation_questions CASCADE;
