-- Create one simple test user to debug the issue
SELECT 
    '=== CREATING MINIMAL TEST USER ===' as info;

-- Create auth user first
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

-- Create profile with salary verification
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

-- Verify creation
SELECT 
    '=== VERIFICATION ===' as info;

SELECT 
    id,
    email,
    verified_net_salary,
    salary_verified_at,
    employer_type,
    ec_number,
    CASE 
        WHEN verified_net_salary IS NOT NULL AND salary_verified_at IS NOT NULL THEN '✅ Ready for testing'
        ELSE '❌ Missing data'
    END as status
FROM profiles 
WHERE id = '66666666-6666-6666-6666-666666666666';

-- Test the function
SELECT 
    '=== TESTING FUNCTION ===' as info;

SELECT * FROM calculate_dtni_from_verified_salary('66666666-6666-6666-6666-666666666666', 0);
