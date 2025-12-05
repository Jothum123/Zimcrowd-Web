-- Step 1: Get actual user UUIDs from your database
-- Copy one of these UUIDs to use in the test queries

SELECT 
    id as user_uuid,
    email,
    first_name,
    employer_type,
    verified_net_salary,
    salary_verified_at,
    CASE 
        WHEN salary_verified_at IS NOT NULL THEN 'Has Salary Data'
        ELSE 'No Salary Data'
    END as salary_status
FROM profiles 
ORDER BY created_at DESC
LIMIT 10;

-- After running this, copy one of the UUIDs from the user_uuid column
-- Then use it in the test queries below (replace the placeholder UUID)

-- Example test queries (replace UUID with actual one from above):
-- SELECT * FROM validate_salary_for_loan('copy-uuid-from-above-here');
-- SELECT * FROM calculate_dtni_from_verified_salary('copy-uuid-from-above-here', 0);
-- SELECT * FROM check_salary_freshness('copy-uuid-from-above-here');
