-- Debug: Create minimal test user and verify step by step
SELECT 
    '=== STEP 1: CHECK CURRENT STATE ===' as info;

-- Check if user already exists
SELECT 
    id,
    email,
    verified_net_salary,
    salary_verified_at,
    CASE 
        WHEN verified_net_salary IS NOT NULL AND salary_verified_at IS NOT NULL THEN '✅ Data exists'
        ELSE '❌ No data'
    END as current_status
FROM profiles 
WHERE id = '66666666-6666-6666-6666-666666666666';

SELECT 
    '=== STEP 2: CREATE AUTH USER ===' as info;

-- Create auth user (will skip if exists)
INSERT INTO auth.users (
    id,
    email,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_sso_user
) VALUES (
    '66666666-6666-6666-6666-666666666666'::UUID,
    'gov.test@example.com',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    '{"first_name": "Test", "last_name": "User"}',
    false
) ON CONFLICT (id) DO NOTHING;

SELECT 
    '=== STEP 3: CREATE PROFILE ===' as info;

-- Create profile with all required fields
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    id_number,
    address,
    city,
    country,
    employment_status,
    employer_type,
    job_title,
    employer_name,
    monthly_income,
    verified_net_salary,
    salary_verified_at,
    bank_name,
    account_number,
    ec_number,
    created_at,
    updated_at
) VALUES (
    '66666666-6666-6666-6666-666666666666'::UUID,
    'gov.test@example.com',
    'Test',
    'User',
    '+263712345600',
    '1980-01-01',
    'TEST-123456',
    '123 Test Street',
    'Harare',
    'Zimbabwe',
    'employed',
    'government',
    'Test Officer',
    'Test Ministry',
    2500.00,
    2500.00,
    CURRENT_TIMESTAMP,
    'Test Bank',
    '1234567890',
    'GOV123456',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;

SELECT 
    '=== STEP 4: VERIFY CREATION ===' as info;

-- Verify the profile was created correctly
SELECT 
    id,
    email,
    verified_net_salary,
    salary_verified_at,
    employer_type,
    ec_number,
    CASE 
        WHEN verified_net_salary IS NOT NULL AND salary_verified_at IS NOT NULL THEN '✅ Ready for testing'
        ELSE '❌ Missing salary verification data'
    END as verification_status
FROM profiles 
WHERE id = '66666666-6666-6666-6666-666666666666';

SELECT 
    '=== STEP 5: TEST FUNCTION ===' as info;

-- Test the function with our created user
SELECT * FROM calculate_dtni_from_verified_salary('66666666-6666-6666-6666-666666666666', 0);
