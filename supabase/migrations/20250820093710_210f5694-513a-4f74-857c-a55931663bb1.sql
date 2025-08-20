-- Drop the trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Rename profiles table to users (without foreign key constraints first)
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

-- Recreate the trigger function with the new table name
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

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Clean up orphaned data - delete books that don't have corresponding users
DELETE FROM public.books WHERE user_id NOT IN (SELECT id FROM public.users);
DELETE FROM public.chapters WHERE user_id NOT IN (SELECT id FROM public.users);
DELETE FROM public.chat_histories WHERE user_id NOT IN (SELECT id FROM public.users);
DELETE FROM public.orders WHERE user_id NOT IN (SELECT id FROM public.users);
DELETE FROM public.book_profiles WHERE user_id NOT IN (SELECT id FROM public.users);

-- Now add the foreign key constraints
ALTER TABLE public.users 
ADD CONSTRAINT users_id_fkey 
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.books 
ADD CONSTRAINT books_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.chapters 
ADD CONSTRAINT chapters_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.chat_histories 
ADD CONSTRAINT chat_histories_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.book_profiles 
ADD CONSTRAINT book_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;