-- Add summary column to chapters table
ALTER TABLE public.chapters 
ADD COLUMN summary text;