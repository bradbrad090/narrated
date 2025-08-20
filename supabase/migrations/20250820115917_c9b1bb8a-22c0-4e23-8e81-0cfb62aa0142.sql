-- Create a basic book profile for the existing book to enable AI conversations
INSERT INTO public.book_profiles (
    book_id,
    user_id,
    full_name,
    writing_style_preference,
    life_themes,
    created_at
) VALUES (
    '181f640e-d6ab-4f01-900f-7e624cd86405',
    '77d3044b-bc7d-423e-9776-8b6ecad1caaf',
    'Axel Kitscha',
    'conversational',
    ARRAY['personal growth', 'life experiences', 'memories'],
    now()
);