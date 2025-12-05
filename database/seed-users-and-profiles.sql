/**
 * Seed Users and Profiles - Complete Solution
 * Creates both auth.users and profiles records to satisfy foreign key constraints
 */

-- =====================================================
-- STEP 1: Create Auth Users First
-- =====================================================

-- Clear existing test users (optional)
-- DELETE FROM profiles WHERE id LIKE '11111111-%';
-- DELETE FROM auth.users WHERE id::TEXT LIKE '11111111-%';

-- Insert test users into auth.users table
INSERT INTO auth.users (
    id,
    email,
    email_confirmed_at,
    phone,
    phone_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data,
    is_sso_user
) VALUES 
-- User 1: Basic registration
(
    '11111111-1111-1111-1111-111111111111'::UUID,
    'new.user1@example.com',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    '+263712345678',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    '{"first_name": "James", "last_name": "Moyo"}',
    false
),
-- User 2: Government employee
(
    '66666666-6666-6666-6666-666666666666'::UUID,
    'gov.verified@example.com',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    '+263712345683',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    '{"first_name": "Grace", "last_name": "Mudzongo"}',
    false
),
-- User 3: Government employee missing EC number
(
    '88888888-8888-8888-8888-888888888888'::UUID,
    'gov.no.ec@example.com',
    CURRENT_TIMESTAMP - INTERVAL '40 days',
    '+263712345685',
    CURRENT_TIMESTAMP - INTERVAL '40 days',
    CURRENT_TIMESTAMP - INTERVAL '40 days',
    CURRENT_TIMESTAMP - INTERVAL '40 days',
    '{"first_name": "Tendai", "last_name": "Mudziri"}',
    false
),
-- User 4: Government employee below minimum salary
(
    '99999999-9999-9999-9999-999999999999'::UUID,
    'gov.low.salary@example.com',
    CURRENT_TIMESTAMP - INTERVAL '35 days',
    '+263712345686',
    CURRENT_TIMESTAMP - INTERVAL '35 days',
    CURRENT_TIMESTAMP - INTERVAL '35 days',
    CURRENT_TIMESTAMP - INTERVAL '35 days',
    '{"first_name": "Chipo", "last_name": "Dube"}',
    false
),
-- User 5: Private sector employee
(
    '55555555-5555-5555-5555-555555555555'::UUID,
    'fully.verified@example.com',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    '+263712345682',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    '{"first_name": "David", "last_name": "Katsande"}',
    false
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 2: Create Profiles (Now that users exist)
-- =====================================================

-- Insert profiles for the test users
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
    ocr_bank_salary,
    ocr_payslip_salary,
    bank_name,
    account_number,
    ec_number,
    created_at,
    updated_at
) VALUES 
-- User 1: Basic registration (no salary verification)
(
    '11111111-1111-1111-1111-111111111111'::UUID,
    'new.user1@example.com',
    'James',
    'Moyo',
    '+263712345678',
    '1990-05-15',
    '45-123456-A-12',
    '123 First Street, Avondale',
    'Harare',
    'Zimbabwe',
    'employed',
    'private',
    'Software Developer',
    'Tech Solutions Zimbabwe',
    2500.00,
    NULL,  -- No salary verification yet
    NULL,
    NULL,
    NULL,
    'CBZ Bank',
    '1234567890',
    NULL,
    CURRENT_TIMESTAMP - INTERVAL '2 days',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
),
-- User 2: Valid government employee
(
    '66666666-6666-6666-6666-666666666666'::UUID,
    'gov.verified@example.com',
    'Grace',
    'Mudzongo',
    '+263712345683',
    '1983-09-20',
    '71-567890-F-56',
    '888 Kuwadzana Extension, Kuwadzana',
    'Harare',
    'Zimbabwe',
    'employed',
    'government',
    'Department Director',
    'Ministry of Health',
    2500.00,
    2500.00,  -- Verified salary
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    2480.00,
    2500.00,
    'Agribank',
    '7777888899',
    'GOV2024001',  -- Has EC number
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    CURRENT_TIMESTAMP - INTERVAL '15 days'
),
-- User 3: Government employee missing EC number
(
    '88888888-8888-8888-8888-888888888888'::UUID,
    'gov.no.ec@example.com',
    'Tendai',
    'Mudziri',
    '+263712345685',
    '1986-04-18',
    '34-876543-H-23',
    '777 Mbare, Mbare',
    'Harare',
    'Zimbabwe',
    'employed',
    'government',
    'Administrative Officer',
    'Ministry of Education',
    1300.00,
    1300.00,  -- Verified salary
    CURRENT_TIMESTAMP - INTERVAL '40 days',
    1280.00,
    1300.00,
    'People''s Own Savings Bank',
    '6666777788',
    NULL,  -- Missing EC number - will cause validation failure
    CURRENT_TIMESTAMP - INTERVAL '40 days',
    CURRENT_TIMESTAMP - INTERVAL '40 days'
),
-- User 4: Government employee below minimum salary
(
    '99999999-9999-9999-9999-999999999999'::UUID,
    'gov.low.salary@example.com',
    'Chipo',
    'Dube',
    '+263712345686',
    '1993-06-25',
    '56-345678-J-67',
    '111 Highfield, Highfield',
    'Harare',
    'Zimbabwe',
    'employed',
    'government',
    'Junior Clerk',
    'Ministry of Transport',
    800.00,  -- Below $120 minimum
    800.00,  -- Verified salary
    CURRENT_TIMESTAMP - INTERVAL '35 days',
    780.00,
    800.00,
    'CBZ Bank',
    '1234567890',
    'GOV2024002',
    CURRENT_TIMESTAMP - INTERVAL '35 days',
    CURRENT_TIMESTAMP - INTERVAL '35 days'
),
-- User 5: Private sector employee (33% DTNI rule)
(
    '55555555-5555-5555-5555-555555555555'::UUID,
    'fully.verified@example.com',
    'David',
    'Katsande',
    '+263712345682',
    '1987-07-15',
    '12-789012-E-34',
    '555 Highlands, Greendale',
    'Harare',
    'Zimbabwe',
    'employed',
    'private',
    'Senior Engineer',
    'Engineering Solutions Ltd',
    3500.00,
    3500.00,  -- Verified salary
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    3450.00,
    3500.00,
    'Stanbic Bank',
    '1111222233',
    NULL,  -- No EC number needed for private
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    CURRENT_TIMESTAMP - INTERVAL '20 days'
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 3: Verify Data Created
-- =====================================================

SELECT 
    '=== USERS AND PROFILES CREATED SUCCESSFULLY ===' as info;

SELECT 
    u.id as user_id,
    u.email,
    p.first_name,
    p.last_name,
    p.employer_type,
    p.verified_net_salary,
    p.ec_number,
    CASE 
        WHEN p.employer_type = 'government' AND p.ec_number IS NULL THEN '❌ Missing EC Number'
        WHEN p.employer_type = 'government' AND p.verified_net_salary < 120 THEN '❌ Below Minimum Salary'
        WHEN p.verified_net_salary IS NULL THEN '⏰ No Salary Verification'
        ELSE '✅ Ready for Testing'
    END as test_status
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.id::TEXT LIKE '11111111-%' OR u.id::TEXT LIKE '66666666-%' OR u.id::TEXT LIKE '88888888-%' OR u.id::TEXT LIKE '99999999-%' OR u.id::TEXT LIKE '55555555-%'
ORDER BY p.employer_type, p.verified_net_salary DESC NULLS LAST;
