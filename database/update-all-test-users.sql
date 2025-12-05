-- Update all test users with salary verification data
SELECT 
    '=== UPDATING ALL TEST USERS ===' as info;

-- Update valid government employee (66666666) with proper EC number
UPDATE profiles 
SET 
    verified_net_salary = 2500.00,  -- Above $120 minimum
    salary_verified_at = CURRENT_TIMESTAMP,
    employer_type = 'government',
    ec_number = '0123258J'  -- Valid EC number format (numbers + letter)
WHERE id = '66666666-6666-6666-6666-666666666666';

-- Update private sector employee (55555555)
UPDATE profiles 
SET 
    verified_net_salary = 3500.00,
    salary_verified_at = CURRENT_TIMESTAMP,
    employer_type = 'private',
    ec_number = 'EMP032456'  -- Private sector: numbers only OR mixed letters/numbers
WHERE id = '55555555-5555-5555-5555-555555555555';

-- Update government employee missing EC number (88888888)
UPDATE profiles 
SET 
    verified_net_salary = 1300.00,
    salary_verified_at = CURRENT_TIMESTAMP,
    employer_type = 'government',
    ec_number = NULL  -- Missing EC number - should fail validation
WHERE id = '88888888-8888-8888-8888-888888888888';

-- Update government employee below minimum salary (99999999)
UPDATE profiles 
SET 
    verified_net_salary = 80.00,  -- Below $120 minimum
    salary_verified_at = CURRENT_TIMESTAMP,
    employer_type = 'government',
    ec_number = '0456789K'  -- Has EC number but salary too low
WHERE id = '99999999-9999-9999-9999-999999999999';

-- Verify all test users
SELECT 
    '=== ALL TEST USERS STATUS ===' as info;

SELECT 
    id,
    email,
    employer_type,
    verified_net_salary,
    ec_number,
    CASE 
        WHEN employer_type = 'government' AND ec_number IS NULL THEN '❌ Missing EC Number'
        WHEN employer_type = 'government' AND verified_net_salary < 120 THEN '❌ Below $120 Minimum'
        WHEN verified_net_salary IS NULL THEN '❌ No Salary Verification'
        ELSE '✅ Ready for Testing'
    END as status
FROM profiles 
WHERE id IN (
    '66666666-6666-6666-6666-666666666666',  -- Valid government
    '99999999-9999-9999-9999-999999999999',  -- Government (updated earlier)
    '88888888-8888-8888-8888-888888888888',  -- Government missing EC
    '55555555-5555-5555-5555-555555555555'   -- Private sector
)
ORDER BY employer_type;

-- Test all scenarios
SELECT 
    '=== TEST 1: VALID GOVERNMENT EMPLOYEE ($70 buffer) ===' as info;
SELECT * FROM calculate_dtni_from_verified_salary('66666666-6666-6666-6666-666666666666', 0);

SELECT 
    '=== TEST 2: PRIVATE SECTOR EMPLOYEE (33% rule) ===' as info;
SELECT * FROM calculate_dtni_from_verified_salary('55555555-5555-5555-5555-555555555555', 0);

SELECT 
    '=== TEST 3: GOVERNMENT EMPLOYEE MISSING EC NUMBER ===' as info;
SELECT * FROM validate_salary_for_loan('88888888-8888-8888-8888-888888888888');
