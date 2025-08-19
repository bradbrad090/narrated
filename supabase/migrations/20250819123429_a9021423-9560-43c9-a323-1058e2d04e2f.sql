-- Add signup_id column to profiles table to link with signup records
ALTER TABLE public.profiles 
ADD COLUMN signup_id UUID REFERENCES public.signup(id);

-- Add index for better performance on lookups
CREATE INDEX idx_profiles_signup_id ON public.profiles(signup_id);