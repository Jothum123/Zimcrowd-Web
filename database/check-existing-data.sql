-- Check what data actually exists in profiles
SELECT 
    '=== CHECKING EXISTING PROFILES ===' as info;

-- Check all test users we've been trying to create
SELECT 
    id,
    email,
    employer_type,
    verified_net_salary,
    salary_verified_at,
    ec_number,
    CASE 
        WHEN verified_net_salary IS NULL THEN '❌ No salary'
        ELSE '✅ Has salary: $' || verified_net_salary::TEXT
    END as salary_status,
    CASE 
        WHEN salary_verified_at IS NULL THEN '❌ No timestamp'
        ELSE '✅ Verified: ' || salary_verified_at::TEXT
    END as timestamp_status
FROM profiles 
WHERE id IN (
    '66666666-6666-6666-6666-666666666666',
    '99999999-9999-9999-9999-999999999999',
    '88888888-8888-8888-8888-888888888888',
    '55555555-5555-5555-5555-555555555555'
);

-- If salary data is NULL, UPDATE it instead of INSERT
SELECT 
    '=== UPDATING SALARY DATA ===' as info;

-- Update the existing profile with salary verification data
UPDATE profiles 
SET 
    verified_net_salary = 2500.00,
    salary_verified_at = CURRENT_TIMESTAMP,
    employer_type = 'government',
    ec_number = 'GOV123456'
WHERE id = '66666666-6666-6666-6666-666666666666';

-- Also update the other test user
UPDATE profiles 
SET 
    verified_net_salary = 2500.00,
    salary_verified_at = CURRENT_TIMESTAMP,
    employer_type = 'government',
    ec_number = 'GOV999999'
WHERE id = '99999999-9999-9999-9999-999999999999';

-- Verify the update worked
SELECT 
    '=== VERIFYING UPDATE ===' as info;

SELECT 
    id,
    email,
    employer_type,
    verified_net_salary,
    salary_verified_at,
    ec_number,
    CASE 
        WHEN verified_net_salary IS NOT NULL AND salary_verified_at IS NOT NULL 
        THEN '✅ Ready for testing'
        ELSE '❌ Still missing data'
    END as status
FROM profiles 
WHERE id IN (
    '66666666-6666-6666-6666-666666666666',
    '99999999-9999-9999-9999-999999999999'
);

-- Now test the function
SELECT 
    '=== TESTING FUNCTION ===' as info;

SELECT * FROM calculate_dtni_from_verified_salary('66666666-6666-6666-6666-666666666666', 0);
