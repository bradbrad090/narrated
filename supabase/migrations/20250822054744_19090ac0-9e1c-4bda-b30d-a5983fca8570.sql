-- Migration: Repurpose is_paid column to tier column in books table
-- This migration safely converts the boolean is_paid field to a text tier field
-- Preserving all existing data by mapping true -> 'paid', false -> 'free'

BEGIN;

-- Step 1: Add the new tier column as nullable first to avoid constraints during migration
ALTER TABLE public.books 
ADD COLUMN tier TEXT;

-- Step 2: Populate the new tier column based on existing is_paid values
-- Map true -> 'paid', false -> 'free'
UPDATE public.books 
SET tier = CASE 
    WHEN is_paid = true THEN 'paid'
    WHEN is_paid = false THEN 'free'
    ELSE 'free'  -- Handle any potential null values (though column is not nullable)
END;

-- Step 3: Now make the tier column NOT NULL with default value
ALTER TABLE public.books 
ALTER COLUMN tier SET NOT NULL,
ALTER COLUMN tier SET DEFAULT 'free';

-- Step 4: Drop the old is_paid column
ALTER TABLE public.books 
DROP COLUMN is_paid;

-- Step 5: Add a check constraint to ensure only valid tier values
ALTER TABLE public.books 
ADD CONSTRAINT books_tier_check 
CHECK (tier IN ('free', 'paid'));

-- Step 6: Create an index on tier for better query performance
CREATE INDEX idx_books_tier ON public.books(tier);

COMMIT;