-- Remove the existing profiles table structure and recreate it as book-specific
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create book-specific profiles table for AI context
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, -- For RLS, but not a foreign key to auth.users
  
  -- Basic Information
  full_name text,
  birth_year integer,
  birthplace text,
  current_location text,
  
  -- Professional Background
  occupation text,
  education text,
  career_highlights text[],
  
  -- Personal Context
  family_background text,
  relationships_family text,
  personality_traits text[],
  values_beliefs text,
  life_philosophy text,
  
  -- Life Experience
  key_life_events text[],
  challenges_overcome text[],
  hobbies_interests text[],
  cultural_background text,
  languages_spoken text[],
  
  -- Writing Context
  life_themes text[],
  writing_style_preference text,
  memorable_quotes text[],
  
  -- Timestamps
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Ensure one profile per book
  UNIQUE(book_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own book profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create profiles for their own books" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (SELECT 1 FROM public.books WHERE id = book_id AND user_id = auth.uid())
);

CREATE POLICY "Users can update their own book profiles" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own book profiles" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Remove the old trigger that was creating user profiles on signup since we don't need it anymore
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();