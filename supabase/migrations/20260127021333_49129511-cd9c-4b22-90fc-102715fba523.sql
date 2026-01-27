-- Upgrade Kim Chambers' book to premium tier
UPDATE public.books 
SET tier = 'premium'
WHERE user_id = (SELECT id FROM public.users WHERE email = 'kimsgotthebag@gmail.com');