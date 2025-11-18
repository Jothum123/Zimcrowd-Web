-- =====================================================
-- CLEANUP ORPHANED PHONE NUMBERS
-- =====================================================
-- This script removes phone numbers from users table
-- where the corresponding auth.users record was deleted
-- =====================================================

-- Step 1: Check for orphaned records
SELECT 
    u.id,
    u.phone,
    u.email,
    u.full_name,
    u.created_at,
    CASE 
        WHEN au.id IS NULL THEN 'ORPHANED - Auth user deleted'
        ELSE 'OK'
    END as status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL;

-- Step 2: Delete orphaned users (uncomment to execute)
-- DELETE FROM users
-- WHERE id NOT IN (SELECT id FROM auth.users);

-- Step 3: Check specific phone number
-- Replace with the phone number causing issues
SELECT 
    u.id,
    u.phone,
    u.email,
    u.full_name,
    u.created_at,
    CASE 
        WHEN au.id IS NULL THEN 'ORPHANED'
        ELSE 'ACTIVE'
    END as status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.phone = '+263771234567'; -- Replace with actual phone number

-- Step 4: Delete specific orphaned phone record (uncomment to execute)
-- DELETE FROM users
-- WHERE phone = '+263771234567' -- Replace with actual phone number
-- AND id NOT IN (SELECT id FROM auth.users);

-- Step 5: Check profiles table for orphaned records
SELECT 
    p.id,
    p.phone,
    p.email,
    p.first_name,
    p.last_name,
    CASE 
        WHEN au.id IS NULL THEN 'ORPHANED'
        ELSE 'ACTIVE'
    END as status
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.id IS NULL;

-- Step 6: Delete orphaned profiles (uncomment to execute)
-- DELETE FROM profiles
-- WHERE id NOT IN (SELECT id FROM auth.users);

-- Step 7: Verify cleanup
SELECT 
    'users' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN au.id IS NULL THEN 1 END) as orphaned_records
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
UNION ALL
SELECT 
    'profiles' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN au.id IS NULL THEN 1 END) as orphaned_records
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id;

-- =====================================================
-- QUICK FIX: Delete specific phone number
-- =====================================================
-- If you know the phone number causing issues, run this:

-- DELETE FROM users WHERE phone = '+263771234567';
-- DELETE FROM profiles WHERE phone = '+263771234567';

-- =====================================================
-- PREVENTION: Add foreign key constraints
-- =====================================================
-- To prevent this in the future, add cascading deletes:

-- ALTER TABLE users
-- ADD CONSTRAINT fk_users_auth
-- FOREIGN KEY (id) REFERENCES auth.users(id)
-- ON DELETE CASCADE;

-- ALTER TABLE profiles
-- ADD CONSTRAINT fk_profiles_auth
-- FOREIGN KEY (id) REFERENCES auth.users(id)
-- ON DELETE CASCADE;
