-- ============================================
-- SIMPLE FIX: Create Profile for Google OAuth User
-- ============================================

-- Step 1: Check what columns profiles table actually has
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 2: Check if your profile exists
-- Replace with your email
SELECT * FROM public.profiles 
WHERE email = 'jothumchitewe@gmail.com'
LIMIT 1;

-- Step 3: Get your user data from auth.users
SELECT 
    id,
    email,
    raw_user_meta_data,
    created_at
FROM auth.users
WHERE email = 'jothumchitewe@gmail.com';

-- Step 4: Create profile with correct columns
-- Adjust this based on what columns exist from Step 1
INSERT INTO public.profiles (
    id,
    email,
    created_at,
    updated_at
)
SELECT 
    id,
    email,
    created_at,
    NOW()
FROM auth.users
WHERE email = 'jothumchitewe@gmail.com'
AND id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- Step 5: Create user_settings
INSERT INTO user_settings (user_id)
SELECT id FROM public.profiles
WHERE email = 'jothumchitewe@gmail.com'
AND id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Step 6: Verify everything
SELECT 
    '✅ Profile check' as status,
    p.id,
    p.email,
    p.created_at,
    CASE WHEN us.user_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_settings
FROM public.profiles p
LEFT JOIN user_settings us ON p.id = us.user_id
WHERE p.email = 'jothumchitewe@gmail.com';
