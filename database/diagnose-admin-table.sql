-- Diagnostic Script: Check admin_users table structure
-- Run this first to see what's wrong

-- Check if table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users')
        THEN '✓ admin_users table EXISTS'
        ELSE '✗ admin_users table DOES NOT EXIST'
    END as table_status;

-- Show all columns in admin_users table
SELECT 
    '=== Current Columns in admin_users ===' as info;

SELECT 
    ordinal_position as "#",
    column_name,
    data_type,
    character_maximum_length as max_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'admin_users'
ORDER BY ordinal_position;

-- Check if admin_email column exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'admin_users' 
            AND column_name = 'admin_email'
        )
        THEN '✓ admin_email column EXISTS'
        ELSE '✗ admin_email column MISSING - THIS IS THE PROBLEM!'
    END as admin_email_status;

-- Show all constraints
SELECT 
    '=== Constraints on admin_users ===' as info;

SELECT 
    conname as constraint_name,
    contype as constraint_type,
    CASE contype
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'c' THEN 'CHECK'
        ELSE contype::text
    END as type_description
FROM pg_constraint
WHERE conrelid = 'admin_users'::regclass
ORDER BY contype;

-- Show all indexes
SELECT 
    '=== Indexes on admin_users ===' as info;

SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'admin_users'
ORDER BY indexname;

-- Count rows
SELECT 
    '=== Row Count ===' as info;

SELECT 
    COUNT(*) as total_rows,
    COUNT(CASE WHEN is_active THEN 1 END) as active_rows
FROM admin_users;

-- Show sample data (if any)
SELECT 
    '=== Sample Data (first 3 rows) ===' as info;

SELECT * FROM admin_users LIMIT 3;

-- Final diagnosis
SELECT 
    '=== DIAGNOSIS ===' as info;

SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users')
        THEN '❌ PROBLEM: Table does not exist. Run admin-roles-schema-fixed.sql'
        
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'admin_users' 
            AND column_name = 'admin_email'
        )
        THEN '❌ PROBLEM: admin_email column missing. Run migrate-admin-email.sql'
        
        ELSE '✅ Everything looks good!'
    END as diagnosis,
    
    CASE 
        WHEN NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users')
        THEN 'Run: database/admin-roles-schema-fixed.sql'
        
        WHEN NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'admin_users' 
            AND column_name = 'admin_email'
        )
        THEN 'Run: database/migrate-admin-email.sql'
        
        ELSE 'No action needed'
    END as recommended_action;
