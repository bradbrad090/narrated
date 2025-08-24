-- Create ai_chapter_metadata table for tracking chapter generation
CREATE TABLE public.ai_chapter_metadata (
  id SERIAL PRIMARY KEY,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.chat_histories(id),
  profile_id UUID REFERENCES public.book_profiles(id),
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  model_used VARCHAR(50) NOT NULL,
  prompt_version VARCHAR(50) NOT NULL,
  source_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.ai_chapter_metadata ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_chapter_metadata
CREATE POLICY "Users can view their own metadata" 
ON public.ai_chapter_metadata 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own metadata" 
ON public.ai_chapter_metadata 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own metadata" 
ON public.ai_chapter_metadata 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own metadata" 
ON public.ai_chapter_metadata 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ai_chapter_metadata_updated_at
BEFORE UPDATE ON public.ai_chapter_metadata
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();