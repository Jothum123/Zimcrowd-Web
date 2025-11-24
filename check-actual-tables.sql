-- ============================================
-- CHECK ACTUAL DATABASE STRUCTURE
-- ============================================

-- 1. Check if you have 'users' or 'profiles' table
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('users', 'profiles')
ORDER BY table_name;

-- 2. If 'users' table exists, show its structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. If 'profiles' table exists, show its structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 4. Check what auth-related tables exist
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
    table_name LIKE '%user%' 
    OR table_name LIKE '%auth%'
    OR table_name LIKE '%profile%'
    OR table_name LIKE '%verification%'
)
ORDER BY table_name;
