-- Part 1: Add new question answer columns to book_profiles table
-- This is purely additive - no data loss, no breaking changes

ALTER TABLE public.book_profiles 
ADD COLUMN IF NOT EXISTS question_1_answer TEXT,
ADD COLUMN IF NOT EXISTS question_2_answer TEXT,
ADD COLUMN IF NOT EXISTS question_3_answer TEXT,
ADD COLUMN IF NOT EXISTS question_4_answer TEXT,
ADD COLUMN IF NOT EXISTS question_5_answer TEXT,
ADD COLUMN IF NOT EXISTS question_6_answer TEXT,
ADD COLUMN IF NOT EXISTS question_7_answer TEXT,
ADD COLUMN IF NOT EXISTS question_8_answer TEXT,
ADD COLUMN IF NOT EXISTS question_9_answer TEXT,
ADD COLUMN IF NOT EXISTS question_10_answer TEXT;

COMMENT ON COLUMN public.book_profiles.question_1_answer IS 'Raw answer to profile question 1';
COMMENT ON COLUMN public.book_profiles.question_2_answer IS 'Raw answer to profile question 2';
COMMENT ON COLUMN public.book_profiles.question_3_answer IS 'Raw answer to profile question 3';
COMMENT ON COLUMN public.book_profiles.question_4_answer IS 'Raw answer to profile question 4';
COMMENT ON COLUMN public.book_profiles.question_5_answer IS 'Raw answer to profile question 5';
COMMENT ON COLUMN public.book_profiles.question_6_answer IS 'Raw answer to profile question 6';
COMMENT ON COLUMN public.book_profiles.question_7_answer IS 'Raw answer to profile question 7';
COMMENT ON COLUMN public.book_profiles.question_8_answer IS 'Raw answer to profile question 8';
COMMENT ON COLUMN public.book_profiles.question_9_answer IS 'Raw answer to profile question 9';
COMMENT ON COLUMN public.book_profiles.question_10_answer IS 'Raw answer to profile question 10';