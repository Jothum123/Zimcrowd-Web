-- Check what data actually exists for our test users
SELECT 
    '=== CHECKING TEST USER DATA ===' as info;

SELECT 
    id,
    email,
    employer_type,
    verified_net_salary,
    salary_verified_at,
    ec_number,
    CASE 
        WHEN verified_net_salary IS NULL THEN '❌ No salary'
        WHEN verified_net_salary < 120 THEN '❌ Below $120: $' || verified_net_salary
        ELSE '✅ Sufficient: $' || verified_net_salary
    END as salary_status
FROM profiles 
WHERE id IN (
    '66666666-6666-6666-6666-666666666666',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    '55555555-5555-5555-5555-555555555555'
)
ORDER BY verified_net_salary DESC NULLS LAST;

-- Force update the government user salary if needed
SELECT 
    '=== FORCE UPDATING GOVERNMENT USER SALARY ===' as info;

UPDATE profiles 
SET 
    verified_net_salary = 2500.00,
    salary_verified_at = CURRENT_TIMESTAMP,
    employer_type = 'government',
    ec_number = '0123258J'
WHERE id = '66666666-6666-6666-6666-666666666666';

-- Verify the update worked
SELECT 
    '=== VERIFICATION AFTER UPDATE ===' as info;

SELECT 
    id,
    email,
    verified_net_salary,
    employer_type,
    ec_number,
    CASE 
        WHEN verified_net_salary >= 120 THEN '✅ Ready for ZimScore testing'
        ELSE '❌ Still insufficient'
    END as test_ready
FROM profiles 
WHERE id = '66666666-6666-6666-6666-666666666666';
