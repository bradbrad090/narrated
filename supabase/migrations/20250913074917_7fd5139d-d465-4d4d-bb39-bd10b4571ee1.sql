-- Add is_submitted column to chapters table
ALTER TABLE public.chapters 
ADD COLUMN is_submitted BOOLEAN NOT NULL DEFAULT false;

-- Add index for better performance when querying by submission status
CREATE INDEX idx_chapters_is_submitted ON public.chapters(is_submitted);