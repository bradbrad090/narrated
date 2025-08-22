-- Update existing books to have proper default values for new payment fields
-- This migration fixes books created before payment fields were added

UPDATE public.books 
SET purchase_status = NULL,
    stripe_purchase_id = NULL
WHERE tier IS NOT NULL AND tier = 'free' AND purchase_status IS NULL;

-- Also ensure any books without tier are set to free by default
UPDATE public.books 
SET tier = 'free',
    purchase_status = NULL,
    stripe_purchase_id = NULL
WHERE tier IS NULL;