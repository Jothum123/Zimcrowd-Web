/**
 * Create Missing Test User for ZimScore Testing
 * Directly create the government employee test user that's missing
 */

-- Check if user exists first
SELECT 
    '=== CHECKING IF TEST USER EXISTS ===' as info;

SELECT 
    id, 
    email, 
    verified_net_salary,
    employer_type,
    ec_number
FROM profiles 
WHERE id = '66666666-6666-6666-6666-666666666666';

-- If no results above, create the user
SELECT 
    '=== CREATING MISSING TEST USER ===' as info;

-- Insert into auth.users first (required for FK)
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    role
) VALUES (
    '66666666-6666-6666-6666-666666666666',
    'government-test@zimcrowd.com',
    'encrypted_password_placeholder',
    NOW(),
    NOW(),
    NOW(),
    'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Insert into profiles
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
) ON CONFLICT (id) DO UPDATE SET
    verified_net_salary = EXCLUDED.verified_net_salary,
    salary_verified_at = EXCLUDED.salary_verified_at,
    employer_type = EXCLUDED.employer_type,
    ec_number = EXCLUDED.ec_number;

-- Verify the user was created
SELECT 
    '=== VERIFICATION: TEST USER CREATED ===' as info;

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

SELECT 
    '=== TEST USER CREATION COMPLETE ===' as info,
       'Now run: \\i database/debug-zimscore-function.sql';
