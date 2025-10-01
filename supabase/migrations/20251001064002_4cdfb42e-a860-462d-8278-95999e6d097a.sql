-- Migration: Fix legacy payment data and prevent future issues

-- Step 1: Drop the old constraint first
ALTER TABLE books DROP CONSTRAINT IF EXISTS books_tier_check;

-- Step 2: Migrate legacy 'paid' tier to 'basic' and add placeholder Stripe IDs
UPDATE books
SET 
  tier = 'basic',
  stripe_purchase_id = 'test_migration_' || id::text
WHERE tier = 'paid' 
  AND purchase_status = 'active'
  AND stripe_purchase_id IS NULL;

-- Step 3: Create missing orders for books with active purchase status but no order
INSERT INTO orders (user_id, book_id, status, total_price, quantity)
SELECT 
  b.user_id,
  b.id,
  b.purchase_status,
  CASE 
    WHEN b.tier = 'basic' THEN 49
    WHEN b.tier = 'standard' THEN 199
    WHEN b.tier = 'premium' THEN 399
    ELSE 0
  END as total_price,
  1 as quantity
FROM books b
LEFT JOIN orders o ON b.id = o.book_id
WHERE b.purchase_status = 'active'
  AND o.id IS NULL;

-- Step 4: Now add the new constraint with only valid tier values
ALTER TABLE books ADD CONSTRAINT books_tier_check 
  CHECK (tier IN ('free', 'basic', 'standard', 'premium'));

-- Step 5: Add documentation comments
COMMENT ON COLUMN books.tier IS 'Book tier: free (default), basic ($49), standard ($199), premium ($399). Legacy "paid" tier has been migrated to "basic".';
COMMENT ON COLUMN books.stripe_purchase_id IS 'Stripe checkout session ID. Test/migrated books may have placeholder IDs starting with "test_migration_".';
