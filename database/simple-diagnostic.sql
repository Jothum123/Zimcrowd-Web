/**
 * Simple Diagnostic for Supabase SQL Editor
 * Uses SELECT statements (not RAISE NOTICE) to show actual results
 */

-- Check if profiles table exists and its structure
SELECT 
    '=== PROFILES TABLE INFO ===' as info;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY column_name;

-- Count existing profiles
SELECT 
    '=== PROFILES COUNT ===' as info,
    COUNT(*) as total_profiles;

-- Show any existing profiles
SELECT 
    '=== EXISTING PROFILES ===' as info;

SELECT 
    id,
    email,
    employment_status,
    employer_type,
    verified_net_salary,
    ec_number
FROM profiles 
LIMIT 5;

-- Check if our test user exists
SELECT 
    '=== TEST USER CHECK ===' as info,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Test user exists'
        ELSE '❌ Test user missing'
    END as test_user_status
FROM profiles 
WHERE id = '66666666-6666-6666-6666-666666666666';

-- Try to create test user with simple INSERT (no auth.users dependency)
SELECT 
    '=== CREATING TEST USER ===' as info;

INSERT INTO profiles (
    id,
    email,
    employment_status,
    employer_type,
    verified_net_salary,
    salary_verified_at,
    ec_number,
    id_number,
    phone,
    account_number,
    bank_name,
    created_at,
    updated_at
) VALUES (
    '66666666-6666-6666-6666-666666666666',
    'government-test@zimcrowd.com',
    'employed',
    'government',
    2500.00,
    NOW(),
    '0123258J',
    '12-345678-A-12',
    '+263712345678',
    '1234567890',
    'People''s Own Savings Bank',
    NOW(),
    NOW()
);

-- Verify creation worked
SELECT 
    '=== VERIFICATION ===' as info,
    CASE 
        WHEN verified_net_salary >= 120 THEN '✅ Ready for ZimScore'
        ELSE '❌ Salary insufficient'
    END as status
FROM profiles 
WHERE id = '66666666-6666-6666-6666-666666666666';

-- Test ZimScore calculation
SELECT 
    '=== ZIMSCORE TEST ===' as info,
    calculate_enhanced_cold_start_rating(
        '66666666-6666-6666-6666-666666666666',
        'employed',
        'government',
        ARRAY['ec_number', 'id', 'payslip', 'selfie'],
        2500.00,
        0
    ) as zimscore_result;
