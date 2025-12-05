/**
 * REAL EXECUTABLE SQL FUNCTIONS - Government Employee Rules
 * These are the actual functions you can run (not pseudo-code)
 */

-- =====================================================
-- 1. TEST GOVERNMENT EMPLOYEE VALIDATION
-- =====================================================

-- Test government employee missing EC number (should fail)
SELECT * FROM validate_salary_for_loan('88888888-8888-8888-8888-888888888888');

-- Test government employee below minimum salary (should fail)  
SELECT * FROM validate_salary_for_loan('99999999-9999-9999-9999-999999999999');

-- Test valid government employee (should pass)
SELECT * FROM validate_salary_for_loan('66666666-6666-6666-6666-666666666666');

-- =====================================================
-- 2. TEST DTNI CALCULATION - GOVERNMENT vs PRIVATE
-- =====================================================

-- Government employee: Uses $70 buffer rule
SELECT * FROM calculate_dtni_from_verified_salary('66666666-6666-6666-6666-666666666666', 0);

-- Private employee: Uses 33% rule
SELECT * FROM calculate_dtni_from_verified_salary('55555555-5555-5555-5555-555555555555', 0);

-- =====================================================
-- 3. VIEW ACTUAL FUNCTION SOURCE CODE
-- =====================================================

-- See the real implementation (not pseudo-code)
SELECT 
    proname as function_name,
    prosrc::TEXT as actual_sql_code
FROM pg_proc 
WHERE proname IN ('validate_salary_for_loan', 'calculate_dtni_from_verified_salary')
ORDER BY proname;

-- =====================================================
-- 4. COMPREHENSIVE GOVERNMENT EMPLOYEE TESTS
-- =====================================================

-- Compare all test scenarios
SELECT 
    p.email,
    p.employer_type,
    p.verified_net_salary,
    p.ec_number,
    CASE 
        WHEN p.ec_number IS NULL THEN '❌ Missing EC Number'
        ELSE '✅ EC Number Present'
    END as ec_status,
    CASE 
        WHEN p.verified_net_salary < 120 AND p.employer_type = 'government' THEN '❌ Below $120 Minimum'
        ELSE '✅ Meets Minimum'
    END as salary_status,
    d.max_installment,
    d.dtni_method,
    CASE 
        WHEN d.dtni_method = 'GOVERNMENT_BUFFER' THEN 
            'Government: $' || (p.verified_net_salary - 70) || ' (Net - $70 buffer)'
        WHEN d.dtni_method = 'PERCENTAGE_33' THEN 
            'Private: $' || ROUND(p.verified_net_salary * 0.33, 2) || ' (33% of Net)'
        ELSE d.dtni_method
    END as calculation_rule
FROM profiles p
LEFT JOIN LATERAL (
    SELECT * FROM calculate_dtni_from_verified_salary(p.id, 0)
) d ON true
WHERE p.id IN (
    '66666666-6666-6666-6666-666666666666',
    '55555555-5555-5555-5555-555555555555',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999'
) AND p.employer_type IN ('government', 'private')
ORDER BY p.employer_type, p.verified_net_salary DESC;

-- =====================================================
-- 5. VALIDATION ERROR TESTING
-- =====================================================

-- Test all validation scenarios
SELECT 
    'VALIDATION TEST RESULTS' as test_type,
    p.email as user_email,
    p.employer_type,
    v.is_valid,
    v.error_code,
    v.error_message,
    CASE 
        WHEN v.is_valid THEN '✅ Validation Passed'
        WHEN v.error_code = 'MISSING_EC_NUMBER' THEN '❌ EC Number Required'
        WHEN v.error_code = 'GOVERNMENT_SALARY_TOO_LOW' THEN '❌ Salary Below $120'
        WHEN v.error_code = 'VERIFIED_SALARY_NOT_FOUND' THEN '❌ No Salary Verification'
        ELSE '❌ Other Error: ' || v.error_code
    END as validation_result
FROM profiles p
LEFT JOIN LATERAL (
    SELECT * FROM validate_salary_for_loan(p.id)
) v ON true
WHERE p.id IN (
    '66666666-6666-6666-6666-666666666666',
    '55555555-5555-5555-5555-555555555555',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999'
)
ORDER BY v.is_valid DESC, p.employer_type;

-- =====================================================
-- IMPORTANT: RUN SEED DATA FIRST!
-- =====================================================

-- Make sure you have run the update script first:
-- \i database/update-all-test-users.sql

-- Then run these tests to verify government employee rules are working
