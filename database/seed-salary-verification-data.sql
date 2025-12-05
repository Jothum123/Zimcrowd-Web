/**
 * Database Seeding Script for Salary Verification Testing
 * Creates realistic test users with salary verification data
 */

-- =====================================================
-- CLEAN UP EXISTING TEST DATA
-- =====================================================

-- Clean up existing test users (optional - comment out if you want to keep data)
-- DELETE FROM profile_flags WHERE user_id LIKE 'test-%';
-- DELETE FROM loan_applications WHERE user_id LIKE 'test-%';
-- DELETE FROM profiles WHERE id LIKE 'test-%';

-- =====================================================
-- CREATE TEST USERS WITH SALARY VERIFICATION DATA
-- =====================================================

-- Test User 1: Government Employee with Fresh Salary
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    employer_type,
    employment_status,
    job_title,
    employer_name,
    ec_number,
    monthly_income,
    verified_net_salary,
    salary_verified_at,
    ocr_bank_salary,
    ocr_payslip_salary,
    created_at,
    updated_at
) VALUES (
    'test-11111111-1111-1111-1111-111111111111'::UUID,
    'gov.employee@test.com',
    'John',
    'Smith',
    'government',
    'full_time_salaried',
    'Senior Administrator',
    'Ministry of Finance',
    'GOV2024001',
    1500.00,
    1500.00,
    CURRENT_TIMESTAMP - INTERVAL '15 days',  -- Fresh salary (15 days ago)
    1480.00,  -- Bank statement OCR (slightly different)
    1500.00,  -- Payslip OCR (matches exactly)
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    verified_net_salary = EXCLUDED.verified_net_salary,
    salary_verified_at = EXCLUDED.salary_verified_at,
    ocr_bank_salary = EXCLUDED.ocr_bank_salary,
    ocr_payslip_salary = EXCLUDED.ocr_payslip_salary,
    updated_at = CURRENT_TIMESTAMP;

-- Test User 2: Government Employee with Stale Salary
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    employer_type,
    employment_status,
    job_title,
    employer_name,
    ec_number,
    monthly_income,
    verified_net_salary,
    salary_verified_at,
    ocr_bank_salary,
    ocr_payslip_salary,
    created_at,
    updated_at
) VALUES (
    'test-22222222-2222-2222-2222-222222222222'::UUID,
    'gov.stale@test.com',
    'Sarah',
    'Johnson',
    'government',
    'full_time_salaried',
    'Department Manager',
    'Ministry of Health',
    'GOV2024002',
    2000.00,
    2000.00,
    CURRENT_TIMESTAMP - INTERVAL '120 days',  -- Stale salary (120 days ago)
    1950.00,  -- Bank statement OCR
    2000.00,  -- Payslip OCR
    CURRENT_TIMESTAMP - INTERVAL '150 days',
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    verified_net_salary = EXCLUDED.verified_net_salary,
    salary_verified_at = EXCLUDED.salary_verified_at,
    ocr_bank_salary = EXCLUDED.ocr_bank_salary,
    ocr_payslip_salary = EXCLUDED.ocr_payslip_salary,
    updated_at = CURRENT_TIMESTAMP;

-- Test User 3: Government Employee Below Minimum Salary
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    employer_type,
    employment_status,
    job_title,
    employer_name,
    ec_number,
    monthly_income,
    verified_net_salary,
    salary_verified_at,
    ocr_bank_salary,
    ocr_payslip_salary,
    created_at,
    updated_at
) VALUES (
    'test-33333333-3333-3333-3333-333333333333'::UUID,
    'gov.low@test.com',
    'Mike',
    'Wilson',
    'government',
    'full_time_salaried',
    'Junior Clerk',
    'Ministry of Education',
    'GOV2024003',
    100.00,  -- Below $120 minimum
    100.00,
    CURRENT_TIMESTAMP - INTERVAL '10 days',  -- Fresh but too low
    95.00,   -- Bank statement OCR
    100.00,  -- Payslip OCR
    CURRENT_TIMESTAMP - INTERVAL '20 days',
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    verified_net_salary = EXCLUDED.verified_net_salary,
    salary_verified_at = EXCLUDED.salary_verified_at,
    ocr_bank_salary = EXCLUDED.ocr_bank_salary,
    ocr_payslip_salary = EXCLUDED.ocr_payslip_salary,
    updated_at = CURRENT_TIMESTAMP;

-- Test User 4: Private Sector Employee with Fresh Salary
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    employer_type,
    employment_status,
    job_title,
    employer_name,
    monthly_income,
    verified_net_salary,
    salary_verified_at,
    ocr_bank_salary,
    ocr_payslip_salary,
    created_at,
    updated_at
) VALUES (
    'test-44444444-4444-4444-4444-444444444444'::UUID,
    'private.employee@test.com',
    'Lisa',
    'Brown',
    'private',
    'full_time_salaried',
    'Software Developer',
    'Tech Solutions Inc',
    2500.00,
    2500.00,
    CURRENT_TIMESTAMP - INTERVAL '5 days',   -- Very fresh
    2450.00,  -- Bank statement OCR
    2500.00,  -- Payslip OCR
    CURRENT_TIMESTAMP - INTERVAL '30 days',
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    verified_net_salary = EXCLUDED.verified_net_salary,
    salary_verified_at = EXCLUDED.salary_verified_at,
    ocr_bank_salary = EXCLUDED.ocr_bank_salary,
    ocr_payslip_salary = EXCLUDED.ocr_payslip_salary,
    updated_at = CURRENT_TIMESTAMP;

-- Test User 5: Informal Sector Employee
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    employer_type,
    employment_status,
    job_title,
    employer_name,
    monthly_income,
    verified_net_salary,
    salary_verified_at,
    ocr_bank_salary,
    ocr_payslip_salary,
    created_at,
    updated_at
) VALUES (
    'test-55555555-5555-5555-5555-555555555555'::UUID,
    'informal.worker@test.com',
    'David',
    'Moyo',
    'informal',
    'self_employed',
    'Small Business Owner',
    'Moyo General Store',
    800.00,
    800.00,
    CURRENT_TIMESTAMP - INTERVAL '25 days',  -- Fresh
    750.00,   -- Bank statement OCR (variable income)
    800.00,   -- Payslip OCR (self-reported)
    CURRENT_TIMESTAMP - INTERVAL '60 days',
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    verified_net_salary = EXCLUDED.verified_net_salary,
    salary_verified_at = EXCLUDED.salary_verified_at,
    ocr_bank_salary = EXCLUDED.ocr_bank_salary,
    ocr_payslip_salary = EXCLUDED.ocr_payslip_salary,
    updated_at = CURRENT_TIMESTAMP;

-- Test User 6: No Salary Verification (for testing validation failures)
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    employer_type,
    employment_status,
    job_title,
    employer_name,
    monthly_income,
    verified_net_salary,
    salary_verified_at,
    created_at,
    updated_at
) VALUES (
    'test-66666666-6666-6666-6666-666666666666'::UUID,
    'no.verification@test.com',
    'Anna',
    'Taylor',
    'private',
    'full_time_salaried',
    'Marketing Manager',
    'Creative Agency',
    1800.00,
    NULL,     -- No verified salary
    NULL,     -- No verification timestamp
    CURRENT_TIMESTAMP - INTERVAL '45 days',
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    verified_net_salary = EXCLUDED.verified_net_salary,
    salary_verified_at = EXCLUDED.salary_verified_at,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- CREATE PROFILE FLAGS FOR TESTING
-- =====================================================

-- Flag for stale salary (Test User 2)
INSERT INTO profile_flags (
    user_id,
    flag_type,
    flag_data,
    severity,
    status,
    created_at
) VALUES (
    'test-22222222-2222-2222-2222-222222222222'::UUID,
    'stale_salary',
    jsonb_build_object(
        'salary_verified_at', CURRENT_TIMESTAMP - INTERVAL '120 days',
        'days_old', 120,
        'last_verification', '2024-08-07'
    ),
    'HIGH',
    'ACTIVE',
    CURRENT_TIMESTAMP - INTERVAL '5 days'
) ON CONFLICT DO NOTHING;

-- Flag for salary discrepancy (Test User 1 - small discrepancy)
INSERT INTO profile_flags (
    user_id,
    flag_type,
    flag_data,
    severity,
    status,
    created_at
) VALUES (
    'test-11111111-1111-1111-1111-111111111111'::UUID,
    'salary_discrepancy',
    jsonb_build_object(
        'user_input', 1500.00,
        'bank_ocr', 1480.00,
        'payslip_ocr', 1500.00,
        'percentage_difference', 1.3
    ),
    'LOW',
    'ACTIVE',
    CURRENT_TIMESTAMP - INTERVAL '2 days'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- CREATE SAMPLE LOAN APPLICATIONS
-- =====================================================

-- Create loan_applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS loan_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    loan_amount DECIMAL(10,2) NOT NULL,
    loan_term INTEGER NOT NULL,
    purpose TEXT NOT NULL,
    verified_salary DECIMAL(10,2) NOT NULL,
    dtni_calculation JSONB NOT NULL,
    salary_verified_at TIMESTAMP WITH TIME ZONE NOT NULL,
    validation_warnings JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for loan applications
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;

-- Sample loan application for Test User 1
INSERT INTO loan_applications (
    user_id,
    loan_amount,
    loan_term,
    purpose,
    verified_salary,
    dtni_calculation,
    salary_verified_at,
    status
) VALUES (
    'test-11111111-1111-1111-1111-111111111111'::UUID,
    500.00,
    3,
    'Emergency home repair',
    1500.00,
    jsonb_build_object(
        'max_installment', 1430.00,
        'available_installment', 1430.00,
        'dtni_limit', 4245.50,
        'dtni_method', 'GOVERNMENT_BUFFER'
    ),
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    'approved'
) ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

SELECT '=== TEST USERS CREATED ===' as info;

SELECT 
    id as user_uuid,
    email,
    first_name,
    employer_type,
    verified_net_salary,
    salary_verified_at,
    CASE 
        WHEN salary_verified_at IS NULL THEN '❌ No verification'
        WHEN (CURRENT_DATE - salary_verified_at::date) <= 90 THEN '✅ Fresh'
        ELSE '❌ Stale'
    END as verification_status,
    CASE 
        WHEN employer_type = 'government' AND verified_net_salary < 120 THEN '❌ Below minimum'
        WHEN employer_type = 'government' AND ec_number IS NULL THEN '❌ Missing EC'
        ELSE '✅ Meets requirements'
    END as compliance_status
FROM profiles 
WHERE id LIKE 'test-%'
ORDER BY created_at;

SELECT '=== PROFILE FLAGS CREATED ===' as info;

SELECT 
    user_id,
    flag_type,
    severity,
    status,
    flag_data
FROM profile_flags 
WHERE user_id LIKE 'test-%'
ORDER BY created_at;

SELECT '=== LOAN APPLICATIONS CREATED ===' as info;

SELECT 
    user_id,
    loan_amount,
    purpose,
    status,
    created_at
FROM loan_applications 
WHERE user_id LIKE 'test-%'
ORDER BY created_at;

SELECT '=== SEEDING COMPLETE ===' as info,
       'Ready for production testing with live data' as status;
