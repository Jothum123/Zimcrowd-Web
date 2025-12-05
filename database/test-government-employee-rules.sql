/**
 * Test Government Employee Rules - REAL EXECUTABLE SQL
 * These are the actual functions that implement government employee compliance
 */

-- =====================================================
-- REAL GOVERNMENT EMPLOYEE SQL FUNCTIONS
-- =====================================================

-- Test the actual DTNI calculation function for government employees
SELECT * FROM calculate_dtni_from_verified_salary('postreg-88888888-8888-8888-8888-888888888888', 0);

-- Test government employee salary validation (should fail - missing EC number)
SELECT * FROM validate_salary_for_loan('postreg-88888888-8888-8888-8888-888888888888');

-- Test government employee below minimum salary (should fail - $800 < $120)
SELECT * FROM validate_salary_for_loan('postreg-99999999-9999-9999-9999-999999999999');

-- Test valid government employee (should pass)
SELECT * FROM validate_salary_for_loan('postreg-66666666-6666-6666-6666-666666666666');

-- Test private sector employee (33% rule)
SELECT * FROM calculate_dtni_from_verified_salary('postreg-55555555-5555-5555-5555-555555555555', 0);

-- =====================================================
-- VIEW THE ACTUAL SQL FUNCTION IMPLEMENTATION
-- =====================================================

-- Show the real DTNI calculation function (not pseudo-code)
SELECT 
    '=== ACTUAL DTNI FUNCTION IMPLEMENTATION ===' as info;

-- View the function source code
SELECT 
    proname,
    prosrc::TEXT as function_source
FROM pg_proc 
WHERE proname = 'calculate_dtni_from_verified_salary'
LIMIT 1;

-- =====================================================
-- TEST GOVERNMENT EMPLOYEE SPECIFIC SCENARIOS
-- =====================================================

-- Test 1: Government employee with proper EC number and salary
SELECT 
    'Test 1: Valid Government Employee' as test_case,
    p.email,
    p.verified_net_salary,
    p.ec_number,
    d.max_installment,
    d.dtni_method,
    CASE 
        WHEN d.dtni_method = 'GOVERNMENT_BUFFER' THEN '✅ $70 buffer applied'
        ELSE '❌ Government rules not applied'
    END as government_rule_applied
FROM profiles p
JOIN (
    SELECT * FROM calculate_dtni_from_verified_salary('postreg-66666666-6666-6666-6666-666666666666', 0)
) d ON true
WHERE p.id = 'postreg-66666666-6666-6666-6666-666666666666';

-- Test 2: Government employee missing EC number (should fail validation)
SELECT 
    'Test 2: Government Employee Missing EC Number' as test_case,
    v.is_valid,
    v.error_code,
    v.error_message,
    CASE 
        WHEN v.error_code = 'MISSING_EC_NUMBER' THEN '✅ EC number validation working'
        ELSE '❌ EC number validation failed'
    END as validation_result
FROM validate_salary_for_loan('postreg-88888888-8888-8888-8888-888888888888') v;

-- Test 3: Government employee below minimum salary (should fail)
SELECT 
    'Test 3: Government Employee Below Minimum Salary' as test_case,
    v.is_valid,
    v.error_code,
    v.error_message,
    CASE 
        WHEN v.error_code = 'GOVERNMENT_SALARY_TOO_LOW' THEN '✅ Minimum salary validation working'
        ELSE '❌ Minimum salary validation failed'
    END as validation_result
FROM validate_salary_for_loan('postreg-99999999-9999-9999-9999-999999999999') v;

-- Test 4: Compare government vs private sector DTNI calculations
SELECT 
    'Test 4: Government vs Private DTNI Comparison' as test_case,
    p.email,
    p.employer_type,
    p.verified_net_salary,
    d.max_installment,
    d.dtni_method,
    CASE 
        WHEN p.employer_type = 'government' THEN 
            'Government: $' || (p.verified_net_salary - 70) || ' (Net - $70 buffer)'
        ELSE 
            'Private: $' || (p.verified_net_salary * 0.33) || ' (33% of Net)'
    END as calculation_explanation
FROM profiles p
JOIN (
    SELECT user_id, max_installment, dtni_method 
    FROM calculate_dtni_from_verified_salary('postreg-55555555-5555-5555-5555-555555555555', 0)
    WHERE user_id = 'postreg-55555555-5555-5555-5555-555555555555'
) d ON p.id = d.user_id
WHERE p.id IN ('postreg-55555555-5555-5555-5555-555555555555', 'postreg-66666666-6666-6666-6666-666666666666')
ORDER BY p.employer_type;

-- =====================================================
-- VIEW THE ACTUAL FUNCTION SOURCE CODE
-- =====================================================

-- Show the real function that implements government rules
SELECT 
    '=== ACTUAL FUNCTION SOURCE CODE ===' as info;

-- Use standard SQL instead of pslash commands
SELECT 
    proname as function_name,
    prosrc::TEXT as function_source
FROM pg_proc 
WHERE proname = 'calculate_dtni_from_verified_salary'
LIMIT 1;
