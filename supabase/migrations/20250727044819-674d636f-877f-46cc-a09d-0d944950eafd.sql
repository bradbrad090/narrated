-- Create a chapters table for better organization
CREATE TABLE public.chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL,
  user_id UUID NOT NULL,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Chapter',
  content TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own chapters" 
ON public.chapters 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chapters" 
ON public.chapters 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chapters" 
ON public.chapters 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chapters" 
ON public.chapters 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_chapters_updated_at
BEFORE UPDATE ON public.chapters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraint to prevent duplicate chapter numbers per book
ALTER TABLE public.chapters 
ADD CONSTRAINT unique_chapter_per_book 
UNIQUE (book_id, chapter_number);