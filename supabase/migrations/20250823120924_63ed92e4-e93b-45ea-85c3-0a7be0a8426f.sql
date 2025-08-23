-- First, check and insert missing user records from auth.users to public.users
-- This handles accounts created before the users table was set up properly

INSERT INTO public.users (id, email, full_name, created_at, completed_signup)
SELECT 
    au.id,
    au.email,
    COALESCE(
        au.raw_user_meta_data->>'full_name', 
        au.raw_user_meta_data->>'name', 
        split_part(au.email, '@', 1)
    ) as full_name,
    au.created_at,
    true as completed_signup
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.users)
ON CONFLICT (id) DO NOTHING;