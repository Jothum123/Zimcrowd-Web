-- ============================================
-- Database Diagnostic Script
-- ============================================
-- Run this to check your current database structure
-- before running the setup scripts

-- Check if profiles table exists and its structure
SELECT 
    'profiles' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check existing tables
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check if user_settings already exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings')
        THEN 'user_settings table EXISTS'
        ELSE 'user_settings table DOES NOT EXIST'
    END as user_settings_status;

-- Check if login_activity already exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'login_activity')
        THEN 'login_activity table EXISTS'
        ELSE 'login_activity table DOES NOT EXIST'
    END as login_activity_status;

-- Check RLS status on existing tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'user_settings', 'login_activity', 'loans', 'investments', 'transactions', 'referrals', 'documents', 'wallet', 'notifications')
ORDER BY tablename;

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as command,
    qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
