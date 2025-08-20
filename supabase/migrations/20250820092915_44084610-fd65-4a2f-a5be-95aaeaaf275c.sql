-- First, let's check what foreign keys exist and drop them if they're incorrect
DO $$ 
BEGIN
  -- Drop existing foreign keys that may be incorrect
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'books_user_id_fkey') THEN
    ALTER TABLE books DROP CONSTRAINT books_user_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chat_histories_id_fkey') THEN
    ALTER TABLE chat_histories DROP CONSTRAINT chat_histories_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'orders_id_fkey') THEN
    ALTER TABLE orders DROP CONSTRAINT orders_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chapters_book_id_fkey') THEN
    ALTER TABLE chapters DROP CONSTRAINT chapters_book_id_fkey;
  END IF;
END $$;

-- Restructure profiles table to be a simple users table
-- First save any existing data by renaming the current table
ALTER TABLE profiles RENAME TO profiles_backup;

-- Create new simple profiles table for user accounts
CREATE TABLE public.profiles (
  id uuid not null default gen_random_uuid() primary key,
  created_at timestamp with time zone not null default now(),
  email text,
  full_name text,
  age integer,
  completed_signup boolean default false
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles (user account data)
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Update the books table to properly reference auth users
ALTER TABLE books 
ALTER COLUMN user_id SET NOT NULL;

-- Add proper foreign key for books
ALTER TABLE books 
ADD CONSTRAINT books_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add proper foreign key for chapters
ALTER TABLE chapters 
ADD CONSTRAINT chapters_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;

-- Update chat_histories to reference auth users properly
ALTER TABLE chat_histories 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE chat_histories 
ADD CONSTRAINT chat_histories_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update orders to reference auth users properly  
ALTER TABLE orders 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE orders 
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE orders 
ADD CONSTRAINT orders_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL;

-- Create book_profiles table for biographical data (separate from user profiles)
CREATE TABLE public.book_profiles (
  id uuid not null default gen_random_uuid() primary key,
  book_id uuid not null,
  user_id uuid not null,
  full_name text,
  birth_year integer,
  birthplace text,
  current_location text,
  occupation text,
  education text,
  career_highlights text[],
  family_background text,
  relationships_family text,
  personality_traits text[],
  values_beliefs text,
  life_philosophy text,
  key_life_events text[],
  challenges_overcome text[],
  hobbies_interests text[],
  cultural_background text,
  languages_spoken text[],
  life_themes text[],
  writing_style_preference text,
  memorable_quotes text[],
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Enable RLS on book_profiles
ALTER TABLE public.book_profiles ENABLE ROW LEVEL SECURITY;

-- Add foreign keys for book_profiles
ALTER TABLE book_profiles 
ADD CONSTRAINT book_profiles_book_id_fkey 
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;

ALTER TABLE book_profiles 
ADD CONSTRAINT book_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create policies for book_profiles
CREATE POLICY "Users can view their own book profiles" 
ON public.book_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create book profiles for their own books" 
ON public.book_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM books WHERE books.id = book_profiles.book_id AND books.user_id = auth.uid()
));

CREATE POLICY "Users can update their own book profiles" 
ON public.book_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own book profiles" 
ON public.book_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for book_profiles updated_at
CREATE TRIGGER update_book_profiles_updated_at
BEFORE UPDATE ON public.book_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing data from profiles_backup to book_profiles if it exists
INSERT INTO book_profiles (
  book_id, user_id, full_name, birth_year, birthplace, current_location,
  occupation, education, career_highlights, family_background, relationships_family,
  personality_traits, values_beliefs, life_philosophy, key_life_events,
  challenges_overcome, hobbies_interests, cultural_background, languages_spoken,
  life_themes, writing_style_preference, memorable_quotes, created_at, updated_at
)
SELECT 
  book_id, user_id, full_name, birth_year, birthplace, current_location,
  occupation, education, career_highlights, family_background, relationships_family,
  personality_traits, values_beliefs, life_philosophy, key_life_events,
  challenges_overcome, hobbies_interests, cultural_background, languages_spoken,
  life_themes, writing_style_preference, memorable_quotes, created_at, updated_at
FROM profiles_backup
WHERE book_id IS NOT NULL AND user_id IS NOT NULL;

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );
  RETURN new;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Clean up backup table
DROP TABLE IF EXISTS profiles_backup;