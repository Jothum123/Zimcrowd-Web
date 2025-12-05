-- Verify if our test data was actually created
SELECT 
    '=== CHECKING IF TEST DATA EXISTS ===' as info;

-- Check if profiles exist with salary verification
SELECT 
    id,
    email,
    first_name,
    employer_type,
    verified_net_salary,
    salary_verified_at,
    ec_number,
    CASE 
        WHEN verified_net_salary IS NULL THEN '❌ No verified salary'
        WHEN salary_verified_at IS NULL THEN '❌ No verification date'
        ELSE '✅ Salary verification complete'
    END as salary_status
FROM profiles 
WHERE id IN (
    '66666666-6666-6666-6666-666666666666',  -- Valid government
    '88888888-8888-8888-8888-888888888888',  -- Missing EC
    '99999999-9999-9999-9999-999999999999',  -- Below minimum
    '55555555-5555-5555-5555-555555555555'   -- Private sector
)
ORDER BY employer_type;

-- Check if auth.users exist
SELECT 
    '=== CHECKING AUTH USERS ===' as info;

SELECT 
    id,
    email,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE id IN (
    '66666666-6666-6666-6666-666666666666',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    '55555555-5555-5555-5555-555555555555'
);

-- Test the function directly
SELECT 
    '=== TESTING FUNCTION DIRECTLY ===' as info;

-- Test with the government employee that should work
SELECT * FROM calculate_dtni_from_verified_salary('66666666-6666-6666-6666-666666666666', 0);
