-- ============================================
-- FIX MISSING PROFILE FOR GOOGLE OAUTH USER
-- ============================================

-- Step 1: Check if profile exists
-- Replace 'your-email@gmail.com' with your actual email
SELECT 
    'Checking for profile...' as step,
    id,
    email,
    full_name
FROM public.profiles 
WHERE email = 'your-email@gmail.com';

-- Step 2: If profile doesn't exist, find your user ID from auth.users
SELECT 
    'Finding user ID from auth.users...' as step,
    id,
    email,
    raw_user_meta_data->>'full_name' as full_name,
    created_at
FROM auth.users
WHERE email = 'your-email@gmail.com';

-- Step 3: Create profile (update the VALUES with your actual data)
-- Get the ID from Step 2 and use it here
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone_number,
    country,
    city,
    kyc_status,
    account_status,
    created_at,
    updated_at
)
SELECT 
    id,
    email,
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'phone_number',
    'Zimbabwe',
    'Harare',
    'pending',
    'active',
    created_at,
    NOW()
FROM auth.users
WHERE email = 'your-email@gmail.com'
AND id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

-- Step 4: Verify profile was created
SELECT 
    '✅ Profile created/updated!' as status,
    id,
    email,
    full_name,
    created_at
FROM public.profiles 
WHERE email = 'your-email@gmail.com';

-- Step 5: Create default user_settings
INSERT INTO user_settings (user_id)
SELECT id FROM public.profiles
WHERE email = 'your-email@gmail.com'
AND id NOT IN (SELECT user_id FROM user_settings)
ON CONFLICT (user_id) DO NOTHING;

-- Step 6: Final verification
SELECT 
    '✅ Setup complete!' as status,
    p.id,
    p.email,
    p.full_name,
    CASE WHEN us.user_id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_settings
FROM public.profiles p
LEFT JOIN user_settings us ON p.id = us.user_id
WHERE p.email = 'your-email@gmail.com';
