-- Show complete admin_users table structure
-- Run this to see exactly what columns exist

SELECT 
    '=== ALL COLUMNS IN admin_users ===' as info;

SELECT 
    ordinal_position as "#",
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name = 'admin_role_id' THEN '❌ WRONG NAME - should be role_id'
        WHEN column_name = 'role_id' AND is_nullable = 'NO' THEN '❌ SHOULD BE NULLABLE'
        WHEN column_name = 'user_id' AND is_nullable = 'NO' THEN '❌ SHOULD BE NULLABLE'
        WHEN column_name = 'role_id' AND is_nullable = 'YES' THEN '✓ CORRECT'
        WHEN column_name = 'user_id' AND is_nullable = 'YES' THEN '✓ CORRECT'
        ELSE ''
    END as status
FROM information_schema.columns
WHERE table_name = 'admin_users'
ORDER BY ordinal_position;

-- Show constraints
SELECT 
    '=== CONSTRAINTS ===' as info;

SELECT 
    conname as constraint_name,
    CASE contype
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'c' THEN 'CHECK'
        WHEN 'n' THEN 'NOT NULL'
        ELSE contype::text
    END as constraint_type
FROM pg_constraint
WHERE conrelid = 'admin_users'::regclass
ORDER BY contype;

-- Show if both role_id and admin_role_id exist
SELECT 
    '=== ROLE COLUMN CHECK ===' as info;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'admin_role_id')
        THEN '❌ admin_role_id EXISTS (wrong name!)'
        ELSE '✓ admin_role_id does not exist'
    END as admin_role_id_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'role_id')
        THEN '✓ role_id EXISTS (correct name)'
        ELSE '❌ role_id does not exist'
    END as role_id_status;

-- Recommendation
SELECT 
    '=== RECOMMENDATION ===' as info;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'admin_role_id')
        THEN 'Run: DROP_AND_RECREATE_ADMIN_USERS.sql (table has wrong structure)'
        ELSE 'Run: admin-roles-schema-fixed.sql (table structure is OK)'
    END as recommended_action;
