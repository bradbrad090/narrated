-- Clean up duplicate book_profiles and add unique constraint
-- First, delete duplicates keeping only the most recent one with a full_name
DELETE FROM book_profiles 
WHERE id NOT IN (
  SELECT DISTINCT ON (book_id, user_id) id
  FROM book_profiles 
  WHERE full_name IS NOT NULL
  ORDER BY book_id, user_id, created_at DESC
);

-- Delete any remaining profiles without full_name if there's a newer one with full_name
DELETE FROM book_profiles a
WHERE full_name IS NULL 
AND EXISTS (
  SELECT 1 FROM book_profiles b 
  WHERE b.book_id = a.book_id 
  AND b.user_id = a.user_id 
  AND b.full_name IS NOT NULL
);

-- Add unique constraint to prevent future duplicates
ALTER TABLE book_profiles 
ADD CONSTRAINT unique_book_user_profile UNIQUE (book_id, user_id);