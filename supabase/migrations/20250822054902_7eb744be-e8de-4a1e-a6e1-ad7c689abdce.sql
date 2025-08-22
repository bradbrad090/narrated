-- Migration: Convert trial_words_used integer column to usage_metrics jsonb column
-- This migration safely converts the integer trial_words_used field to a jsonb usage_metrics field
-- Preserving all existing data by wrapping values in a structured jsonb object

BEGIN;

-- Step 1: Add the new usage_metrics column as nullable jsonb first
ALTER TABLE public.books 
ADD COLUMN usage_metrics JSONB;

-- Step 2: Populate the new usage_metrics column with converted data
-- Convert existing trial_words_used values to structured jsonb format
UPDATE public.books 
SET usage_metrics = jsonb_build_object(
    'words_generated', COALESCE(trial_words_used, 0),
    'chapters_created', 0,
    'conversations', 0,
    'last_updated', EXTRACT(epoch FROM NOW())::integer
);

-- Step 3: Verify all records have valid jsonb (safety check)
-- This will fail the transaction if any invalid jsonb exists
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count 
    FROM public.books 
    WHERE usage_metrics IS NULL OR NOT (usage_metrics ? 'words_generated');
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Found % records with invalid usage_metrics data', invalid_count;
    END IF;
END $$;

-- Step 4: Now make the usage_metrics column NOT NULL with default value
ALTER TABLE public.books 
ALTER COLUMN usage_metrics SET NOT NULL,
ALTER COLUMN usage_metrics SET DEFAULT '{"words_generated": 0, "chapters_created": 0, "conversations": 0}'::jsonb;

-- Step 5: Drop the old trial_words_used column
ALTER TABLE public.books 
DROP COLUMN trial_words_used;

-- Step 6: Add jsonb validation constraint to ensure required fields exist
ALTER TABLE public.books 
ADD CONSTRAINT books_usage_metrics_valid 
CHECK (
    usage_metrics ? 'words_generated' AND 
    jsonb_typeof(usage_metrics->'words_generated') = 'number'
);

-- Step 7: Create GIN index on usage_metrics for efficient jsonb queries
CREATE INDEX idx_books_usage_metrics_gin ON public.books USING GIN (usage_metrics);

-- Step 8: Create specific index for words_generated queries (most common lookup)
CREATE INDEX idx_books_words_generated ON public.books USING BTREE ((usage_metrics->>'words_generated')::integer);

-- Step 9: Add helpful comment for future developers
COMMENT ON COLUMN public.books.usage_metrics IS 'JSONB object tracking user usage metrics. Structure: {"words_generated": int, "chapters_created": int, "conversations": int, "last_updated": epoch}. Note: Replaces former trial_words_used integer column.';

COMMIT;