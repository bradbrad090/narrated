-- Rename profiles table to users
ALTER TABLE public.profiles RENAME TO users;

-- Update the RLS policies to reference the new table name
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Create new RLS policies for users table
CREATE POLICY "Users can insert their own record" ON public.users
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own record" ON public.users
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own record" ON public.users
FOR SELECT USING (auth.uid() = id);

-- Add proper foreign key constraint from users to auth.users
ALTER TABLE public.users 
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update the trigger function to use the new table name
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );
  RETURN new;
END;
$function$;

-- Ensure all other tables properly reference users table where needed
-- Books table should reference users
ALTER TABLE public.books 
DROP CONSTRAINT IF EXISTS books_user_id_fkey;

ALTER TABLE public.books 
ADD CONSTRAINT books_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Chapters table should reference users
ALTER TABLE public.chapters 
DROP CONSTRAINT IF EXISTS chapters_user_id_fkey;

ALTER TABLE public.chapters 
ADD CONSTRAINT chapters_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Chat histories table should reference users
ALTER TABLE public.chat_histories 
DROP CONSTRAINT IF EXISTS chat_histories_user_id_fkey;

ALTER TABLE public.chat_histories 
ADD CONSTRAINT chat_histories_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Orders table should reference users
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Book profiles table should reference users
ALTER TABLE public.book_profiles 
DROP CONSTRAINT IF EXISTS book_profiles_user_id_fkey;

ALTER TABLE public.book_profiles 
ADD CONSTRAINT book_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;