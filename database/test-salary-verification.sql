-- Comprehensive Salary Verification System Testing
-- Execute each step to validate all functionality

-- =====================================================
-- STEP 1: Get Real User Data for Testing
-- =====================================================

SELECT 
    '=== AVAILABLE USERS FOR TESTING ===' as info;

SELECT 
    id as user_uuid,
    email,
    first_name,
    employer_type,
    verified_net_salary,
    salary_verified_at,
    CASE 
        WHEN salary_verified_at IS NOT NULL THEN 
            'Age: ' || (CURRENT_DATE - salary_verified_at::date) || ' days'
        ELSE 'No salary verification'
    END as salary_status,
    ec_number
FROM profiles 
WHERE id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- STEP 2: Test Salary Validation Functions
-- =====================================================

SELECT 
    '=== TESTING SALARY VALIDATION ===' as info;

-- Test with a real UUID (copy from results above)
-- Replace 'your-actual-user-uuid-here' with a real UUID from Step 1

-- Example: Test salary validation
-- SELECT * FROM validate_salary_for_loan('copy-uuid-from-above');

-- Example: Test DTNI calculation  
-- SELECT * FROM calculate_dtni_from_verified_salary('copy-uuid-from-above', 0);

-- Example: Test freshness check
-- SELECT * FROM check_salary_freshness('copy-uuid-from-above');

-- =====================================================
-- STEP 3: Test Government Employee Specific Rules
-- =====================================================

SELECT 
    '=== GOVERNMENT EMPLOYEE TESTING ===' as info;

-- Find government employees specifically
SELECT 
    id as user_uuid,
    email,
    verified_net_salary,
    ec_number,
    CASE 
        WHEN verified_net_salary < 120 THEN '❌ Below $120 minimum'
        WHEN ec_number IS NULL THEN '❌ Missing EC number'
        ELSE '✅ Meets government requirements'
    END as government_status
FROM profiles 
WHERE employer_type = 'government'
AND verified_net_salary IS NOT NULL;

-- =====================================================
-- STEP 4: Test Salary Freshness (90-day rule)
-- =====================================================

SELECT 
    '=== SALARY FRESHNESS TESTING ===' as info;

-- Check salary age for all verified users
SELECT 
    id as user_uuid,
    email,
    verified_net_salary,
    salary_verified_at,
    (CURRENT_DATE - salary_verified_at::date) as days_old,
    CASE 
        WHEN (CURRENT_DATE - salary_verified_at::date) <= 90 THEN '✅ Fresh'
        ELSE '❌ Stale - needs re-verification'
    END as freshness_status
FROM profiles 
WHERE salary_verified_at IS NOT NULL
ORDER BY salary_verified_at DESC;

-- =====================================================
-- STEP 5: Test DTNI Calculation Rules
-- =====================================================

SELECT 
    '=== DTNI CALCULATION TESTING ===' as info;

-- Test DTNI for different employer types
SELECT 
    'Government Employees: Net Salary - $70 buffer' as rule_description;

SELECT 
    id as user_uuid,
    verified_net_salary,
    (verified_net_salary - 70) as max_installment_government,
    'Government DTNI Rule Applied' as calculation_method
FROM profiles 
WHERE employer_type = 'government'
AND verified_net_salary IS NOT NULL
LIMIT 3;

SELECT 
    'Other Employees: 33% of Net Salary' as rule_description;

SELECT 
    id as user_uuid,
    verified_net_salary,
    (verified_net_salary * 0.33) as max_installment_other,
    '33% DTNI Rule Applied' as calculation_method
FROM profiles 
WHERE employer_type != 'government'
AND verified_net_salary IS NOT NULL
LIMIT 3;

-- =====================================================
-- STEP 6: Test Profile Flags (Discrepancy Tracking)
-- =====================================================

SELECT 
    '=== PROFILE FLAGS TESTING ===' as info;

-- Check for any existing flags
SELECT 
    user_id,
    flag_type,
    severity,
    status,
    created_at,
    flag_data
FROM profile_flags 
WHERE status = 'ACTIVE'
ORDER BY created_at DESC;

-- =====================================================
-- STEP 7: Complete End-to-End Test
-- =====================================================

SELECT 
    '=== COMPLETE VALIDATION TEST ===' as info;

-- Run complete validation on a sample user
-- Replace with actual UUID from Step 1 results
/*
WITH test_user AS (
    SELECT 'your-actual-uuid-here' as uuid
)
SELECT 
    'Salary Validation' as test_type,
    * FROM validate_salary_for_loan((SELECT uuid FROM test_user))
UNION ALL
SELECT 
    'DTNI Calculation' as test_type,
    * FROM calculate_dtni_from_verified_salary((SELECT uuid FROM test_user), 0)
UNION ALL  
SELECT 
    'Freshness Check' as test_type,
    * FROM check_salary_freshness((SELECT uuid FROM test_user));
*/

SELECT 
    '=== TESTING COMPLETE ===' as info,
    'Replace placeholder UUIDs with real values from Step 1' as instructions;
