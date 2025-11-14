-- ============================================
-- CHECK EXISTING TABLES IN SUPABASE
-- ============================================
-- Run this query first to see what already exists
-- ============================================

-- List all existing tables
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- List all existing columns for each table
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- List all existing functions
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- List all existing views
SELECT 
    table_name as view_name
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- List all existing triggers
SELECT 
    trigger_name,
    event_object_table as table_name,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- List all existing indexes
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
