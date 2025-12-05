-- Quick diagnosis of what exists
SELECT 
    '=== CHECKING PROFILES TABLE ===' as info;

-- Check if any profiles exist at all
SELECT COUNT(*) as total_profiles FROM profiles;

-- Check if our test user exists specifically
SELECT 
    id,
    email,
    verified_net_salary IS NOT NULL as has_salary,
    salary_verified_at IS NOT NULL as has_timestamp,
    employer_type,
    ec_number
FROM profiles 
WHERE id = '66666666-6666-6666-6666-666666666666';

-- Check if auth.users exists
SELECT 
    '=== CHECKING AUTH USERS ===' as info;

SELECT COUNT(*) as total_auth_users FROM auth.users;

SELECT 
    id,
    email,
    email_confirmed_at IS NOT NULL as is_confirmed
FROM auth.users 
WHERE id = '66666666-6666-6666-6666-666666666666';

-- If no data exists, create one simple test user
SELECT 
    '=== CREATING SIMPLE TEST USER ===' as info;

-- This will only run if the user doesn't exist
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

-- Create corresponding profile
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

-- Verify the test user was created
SELECT 
    '=== VERIFYING TEST USER CREATED ===' as info;

SELECT 
    id,
    email,
    verified_net_salary,
    salary_verified_at,
    employer_type,
    ec_number
FROM profiles 
WHERE id = '66666666-6666-6666-6666-666666666666';
