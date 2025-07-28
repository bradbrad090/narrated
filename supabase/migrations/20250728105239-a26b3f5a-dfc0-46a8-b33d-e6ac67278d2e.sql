-- Remove orphaned chapters that reference non-existent books
DELETE FROM public.chapters 
WHERE book_id NOT IN (SELECT id FROM public.books);

-- Add foreign key constraint between chapters and books tables
ALTER TABLE public.chapters 
ADD CONSTRAINT chapters_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES public.books(id) 
ON DELETE CASCADE;