-- ============================================
-- CREATE PROFILE FOR GOOGLE OAUTH USER (CORRECT VERSION)
-- ============================================
-- Uses actual column names from profiles table

-- Step 1: Check if profile exists
SELECT 
    'Checking for existing profile...' as step,
    id,
    email,
    first_name,
    last_name
FROM public.profiles 
WHERE email = 'jothumchitewe@gmail.com';  -- REPLACE WITH YOUR EMAIL

-- Step 2: Create profile from auth.users data
INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    country,
    city,
    role,
    onboarding_completed,
    profile_completed,
    created_at,
    updated_at
)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'given_name', split_part(raw_user_meta_data->>'full_name', ' ', 1), 'User'),
    COALESCE(raw_user_meta_data->>'family_name', split_part(raw_user_meta_data->>'full_name', ' ', 2), 'Name'),
    raw_user_meta_data->>'phone',
    'Zimbabwe',
    'Harare',
    'borrower',
    false,
    false,
    created_at,
    NOW()
FROM auth.users
WHERE email = 'jothumchitewe@gmail.com'  -- REPLACE WITH YOUR EMAIL
AND id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    updated_at = NOW();

-- Step 3: Create user_settings
INSERT INTO user_settings (user_id)
SELECT id FROM public.profiles
WHERE email = 'jothumchitewe@gmail.com'  -- REPLACE WITH YOUR EMAIL
AND id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Step 4: Verify everything is set up
SELECT 
    '✅ SETUP COMPLETE!' as status,
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    p.country,
    p.city,
    CASE WHEN us.user_id IS NOT NULL THEN '✅ Yes' ELSE '❌ No' END as has_settings
FROM public.profiles p
LEFT JOIN user_settings us ON p.id = us.user_id
WHERE p.email = 'jothumchitewe@gmail.com';  -- REPLACE WITH YOUR EMAIL
