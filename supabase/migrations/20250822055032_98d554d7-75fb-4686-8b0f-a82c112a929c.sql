-- Migration: Add stripe_purchase_id column to books table
-- This column will link books to Stripe payment sessions/transactions
-- Enabling payment verification and purchase tracking functionality

BEGIN;

-- Step 1: Add stripe_purchase_id column as nullable text
-- Nullable allows existing books to remain unaffected
ALTER TABLE public.books 
ADD COLUMN stripe_purchase_id TEXT;

-- Step 2: Create index for efficient payment lookups
-- Justified because we'll frequently query by stripe_purchase_id to:
-- - Verify payment status during book access
-- - Link books to specific Stripe transactions
-- - Support payment-related queries and reporting
CREATE INDEX idx_books_stripe_purchase_id ON public.books(stripe_purchase_id);

-- Step 3: Add descriptive comment for future developers
COMMENT ON COLUMN public.books.stripe_purchase_id IS 'Stripe Checkout Session ID or Payment Intent ID linking this book to a Stripe payment. Used for payment verification and purchase tracking. NULL for free books or books created before payment integration.';

COMMIT;