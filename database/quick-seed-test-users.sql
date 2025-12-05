/**
 * Quick Seed Test Users - Simplified Version
 * Run this if the main seed script isn't working
 */

-- Just create 2 test users for immediate testing
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    employer_type,
    verified_net_salary,
    salary_verified_at,
    ec_number,
    created_at
) VALUES 
-- Valid government employee
(
    'postreg-valid-gov'::UUID,
    'gov.valid@example.com',
    'Grace',
    'Mudzongo',
    'government',
    2500.00,
    CURRENT_TIMESTAMP - INTERVAL '15 days',
    'GOV2024001',
    CURRENT_TIMESTAMP - INTERVAL '20 days'
),
-- Government employee missing EC number
(
    'postreg-no-ec'::UUID,
    'gov.noec@example.com',
    'Tendai',
    'Mudziri',
    'government',
    1300.00,
    CURRENT_TIMESTAMP - INTERVAL '40 days',
    NULL, -- Missing EC number
    CURRENT_TIMESTAMP - INTERVAL '45 days'
) ON CONFLICT (id) DO NOTHING;

-- Verify users were created
SELECT 
    '=== TEST USERS CREATED ===' as info,
    id as user_uuid,
    email,
    employer_type,
    verified_net_salary,
    ec_number,
    CASE 
        WHEN ec_number IS NULL THEN '❌ Missing EC Number'
        ELSE '✅ EC Number Present'
    END as ec_status
FROM profiles 
WHERE id LIKE 'postreg-%'
ORDER BY employer_type;
