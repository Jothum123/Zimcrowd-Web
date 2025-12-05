/**
 * Create Test User with RLS Bypass
 * Use service_role or disable RLS temporarily to create test data
 */

-- First, let's check what actually exists
SELECT 
    '=== CURRENT PROFILE DATA ===' as info;

SELECT COUNT(*) as profile_count FROM profiles;
SELECT COUNT(*) as auth_users_count FROM auth.users;

-- Try a simple approach - check if we can insert at all
SELECT 
    '=== TESTING INSERT CAPABILITY ===' as info;

-- Test with a simple profiles insert (no FK dependency first)
DO $$
BEGIN
    -- Try to insert a test profile
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
    
    RAISE NOTICE '✅ Profile insert successful';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Profile insert failed: %', SQLERRM;
END $$;

-- Check if the insert worked
SELECT 
    '=== VERIFYING INSERT RESULT ===' as info;

SELECT 
    id, 
    email, 
    verified_net_salary,
    employer_type,
    ec_number,
    CASE 
        WHEN verified_net_salary >= 120 THEN '✅ Ready for ZimScore testing'
        ELSE '❌ Insufficient salary'
    END as status
FROM profiles 
WHERE id = '66666666-6666-6666-6666-666666666666';

-- If profile exists but auth.users doesn't, we can still test ZimScore
SELECT 
    '=== TESTING ZIMSCORE WITH PROFILE ONLY ===' as info;

-- Test basic ZimScore calculation without auth.users dependency
SELECT calculate_enhanced_cold_start_rating(
    '66666666-6666-6666-6666-666666666666',
    'employed',
    'government',
    ARRAY['ec_number', 'id', 'payslip', 'selfie'],
    2500.00,
    0
) as zimscore_result;

SELECT 
    '=== RLS BYPASS TEST COMPLETE ===' as info;
