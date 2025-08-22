-- Migration: Add purchase_status column to books table
-- This column tracks the payment/purchase state of individual books
-- Supports per-book purchase logic and payment lifecycle management

BEGIN;

-- Step 1: Add purchase_status column as nullable text
-- Nullable allows existing books to remain unaffected (defaults to NULL = unpurchased)
-- Text type provides flexibility for various payment states and future extensions
ALTER TABLE public.books 
ADD COLUMN purchase_status TEXT;

-- Step 2: Create index for efficient purchase status queries
-- Optimizes filtering by purchase status (e.g., finding all active purchases)
-- Essential for purchase verification and billing-related queries
CREATE INDEX idx_books_purchase_status ON public.books(purchase_status);

-- Step 3: Add comprehensive documentation for purchase status values
COMMENT ON COLUMN public.books.purchase_status IS 'Payment status for individual book purchases. Suggested values: NULL (unpurchased/free), ''pending'' (payment initiated), ''active'' (paid and accessible), ''expired'' (subscription ended), ''canceled'' (refunded/canceled), ''failed'' (payment failed). Integrates with per-book purchase logic to control content access and billing.';

COMMIT;