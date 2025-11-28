-- ============================================================================
-- CHECK SETTINGS TABLES EXISTENCE
-- ============================================================================
-- Run this query to check which tables exist and their structure
-- ============================================================================

-- Check if tables exist
SELECT 
    'user_statistics' as table_name,
    EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'user_statistics'
    ) as exists
UNION ALL
SELECT 
    'user_settings' as table_name,
    EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'user_settings'
    ) as exists
UNION ALL
SELECT 
    'notification_preferences' as table_name,
    EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'notification_preferences'
    ) as exists
UNION ALL
SELECT 
    'investment_preferences' as table_name,
    EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'investment_preferences'
    ) as exists
UNION ALL
SELECT 
    'user_documents' as table_name,
    EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'user_documents'
    ) as exists;

-- ============================================================================
-- Get detailed table information
-- ============================================================================

-- Get column information for user_statistics
SELECT 
    'user_statistics' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_statistics'
ORDER BY ordinal_position;

-- Get column information for user_settings
SELECT 
    'user_settings' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_settings'
ORDER BY ordinal_position;

-- Get column information for notification_preferences
SELECT 
    'notification_preferences' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'notification_preferences'
ORDER BY ordinal_position;

-- Get column information for investment_preferences
SELECT 
    'investment_preferences' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'investment_preferences'
ORDER BY ordinal_position;

-- Get column information for user_documents
SELECT 
    'user_documents' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_documents'
ORDER BY ordinal_position;

-- ============================================================================
-- Check indexes
-- ============================================================================

SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('user_statistics', 'user_settings', 'notification_preferences', 'investment_preferences', 'user_documents')
ORDER BY tablename, indexname;

-- ============================================================================
-- Check RLS policies
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_statistics', 'user_settings', 'notification_preferences', 'investment_preferences', 'user_documents')
ORDER BY tablename, policyname;

-- ============================================================================
-- Check triggers
-- ============================================================================

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('user_statistics', 'user_settings', 'notification_preferences', 'investment_preferences', 'user_documents')
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- Count existing records
-- ============================================================================

DO $$
DECLARE
    stats_count INTEGER;
    settings_count INTEGER;
    notif_count INTEGER;
    invest_count INTEGER;
    docs_count INTEGER;
BEGIN
    -- Count records in each table (if they exist)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_statistics') THEN
        SELECT COUNT(*) INTO stats_count FROM public.user_statistics;
        RAISE NOTICE 'user_statistics: % records', stats_count;
    ELSE
        RAISE NOTICE 'user_statistics: TABLE DOES NOT EXIST';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_settings') THEN
        SELECT COUNT(*) INTO settings_count FROM public.user_settings;
        RAISE NOTICE 'user_settings: % records', settings_count;
    ELSE
        RAISE NOTICE 'user_settings: TABLE DOES NOT EXIST';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notification_preferences') THEN
        SELECT COUNT(*) INTO notif_count FROM public.notification_preferences;
        RAISE NOTICE 'notification_preferences: % records', notif_count;
    ELSE
        RAISE NOTICE 'notification_preferences: TABLE DOES NOT EXIST';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investment_preferences') THEN
        SELECT COUNT(*) INTO invest_count FROM public.investment_preferences;
        RAISE NOTICE 'investment_preferences: % records', invest_count;
    ELSE
        RAISE NOTICE 'investment_preferences: TABLE DOES NOT EXIST';
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_documents') THEN
        SELECT COUNT(*) INTO docs_count FROM public.user_documents;
        RAISE NOTICE 'user_documents: % records', docs_count;
    ELSE
        RAISE NOTICE 'user_documents: TABLE DOES NOT EXIST';
    END IF;
END $$;
