-- Check RLS policies that might be blocking INSERT operations
SELECT 
    '=== CHECKING RLS POLICIES ===' as info;

-- Check if RLS is enabled on profiles
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class 
WHERE relname = 'profiles';

-- Check all RLS policies on profiles table
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check if auth.users has RLS policies
SELECT 
    '=== CHECKING AUTH USERS RLS ===' as info;

SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users';

-- Try a simple test with explicit transaction
SELECT 
    '=== TESTING INSERT WITH TRANSACTION ===' as info;

BEGIN;

-- Test insert to profiles table directly
INSERT INTO profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    date_of_birth,
    id_number,
    address,
    city,
    country,
    employment_status,
    employer_type,
    job_title,
    employer_name,
    monthly_income,
    verified_net_salary,
    salary_verified_at,
    bank_name,
    account_number,
    ec_number,
    created_at,
    updated_at
) VALUES (
    '99999999-9999-9999-9999-999999999999'::UUID,
    'test@example.com',
    'Test',
    'User',
    '+263712345999',
    '1980-01-01',
    'TEST-999999',
    '999 Test Street',
    'Harare',
    'Zimbabwe',
    'employed',
    'government',
    'Test Officer',
    'Test Ministry',
    2500.00,
    2500.00,
    CURRENT_TIMESTAMP,
    'Test Bank',
    '1234567890',
    'GOV999999',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Check if it was inserted
SELECT 
    id,
    email,
    verified_net_salary,
    salary_verified_at,
    'INSERTED' as status
FROM profiles 
WHERE id = '99999999-9999-9999-9999-999999999999';

ROLLBACK;

-- If RLS is blocking, try disabling it temporarily
SELECT 
    '=== ATTEMPTING TO BYPASS RLS ===' as info;

-- This will show current role
SELECT current_user, session_user;
