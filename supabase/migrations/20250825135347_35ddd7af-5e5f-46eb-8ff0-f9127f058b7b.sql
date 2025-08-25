-- Create table to store individual profile question responses
CREATE TABLE public.profile_question_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  question_index INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint to prevent duplicate responses for same question
  UNIQUE(user_id, book_id, question_index)
);

-- Enable RLS
ALTER TABLE public.profile_question_responses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can create their own question responses" 
ON public.profile_question_responses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own question responses" 
ON public.profile_question_responses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own question responses" 
ON public.profile_question_responses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own question responses" 
ON public.profile_question_responses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add new fields to book_profiles table for the new questions
ALTER TABLE public.book_profiles 
ADD COLUMN nicknames TEXT[],
ADD COLUMN siblings_count INTEGER,
ADD COLUMN parents_occupations TEXT,
ADD COLUMN marital_status TEXT,
ADD COLUMN children_count INTEGER,
ADD COLUMN first_job TEXT,
ADD COLUMN birth_date DATE;

-- Create trigger for auto-updating updated_at on profile_question_responses
CREATE TRIGGER update_profile_question_responses_updated_at
BEFORE UPDATE ON public.profile_question_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();