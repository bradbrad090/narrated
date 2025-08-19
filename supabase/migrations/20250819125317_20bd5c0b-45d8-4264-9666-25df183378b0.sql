-- Add trial tracking and payment status to books table
ALTER TABLE public.books 
ADD COLUMN trial_words_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN is_paid BOOLEAN NOT NULL DEFAULT false;