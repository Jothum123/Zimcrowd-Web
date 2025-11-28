-- ============================================================================
-- QUICK STATUS CHECK - Settings Tables
-- ============================================================================
-- Run this to see which tables exist and their current state
-- ============================================================================

-- 1. Check which tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            SELECT tablename FROM pg_tables 
            WHERE schemaname = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES 
        ('user_statistics'),
        ('user_settings'),
        ('notification_preferences'),
        ('investment_preferences'),
        ('user_documents')
) AS t(table_name);

-- 2. Count records in existing tables
DO $$
DECLARE
    table_record RECORD;
    record_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RECORD COUNTS:';
    RAISE NOTICE '========================================';
    
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('user_statistics', 'user_settings', 'notification_preferences', 'investment_preferences', 'user_documents')
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM public.%I', table_record.tablename) INTO record_count;
        RAISE NOTICE '% : % records', table_record.tablename, record_count;
    END LOOP;
END $$;

-- 3. Check triggers
SELECT 
    trigger_name,
    event_object_table as table_name,
    event_manipulation as event,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('user_statistics', 'user_settings', 'notification_preferences', 'investment_preferences', 'user_documents')
ORDER BY event_object_table, trigger_name;

-- 4. Check RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_statistics', 'user_settings', 'notification_preferences', 'investment_preferences', 'user_documents')
ORDER BY tablename;

-- 5. Check policies
SELECT 
    tablename,
    policyname,
    permissive,
    cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_statistics', 'user_settings', 'notification_preferences', 'investment_preferences', 'user_documents')
ORDER BY tablename, policyname;

-- 6. Summary
DO $$
DECLARE
    existing_tables INTEGER;
    total_tables INTEGER := 5;
    missing_tables TEXT[];
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SUMMARY:';
    RAISE NOTICE '========================================';
    
    SELECT COUNT(*) INTO existing_tables
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('user_statistics', 'user_settings', 'notification_preferences', 'investment_preferences', 'user_documents');
    
    RAISE NOTICE 'Tables existing: % / %', existing_tables, total_tables;
    
    IF existing_tables = total_tables THEN
        RAISE NOTICE '✅ All settings tables are created!';
    ELSE
        SELECT ARRAY_AGG(t.table_name)
        INTO missing_tables
        FROM (
            VALUES 
                ('user_statistics'),
                ('user_settings'),
                ('notification_preferences'),
                ('investment_preferences'),
                ('user_documents')
        ) AS t(table_name)
        WHERE t.table_name NOT IN (
            SELECT tablename FROM pg_tables WHERE schemaname = 'public'
        );
        
        RAISE NOTICE '❌ Missing tables: %', missing_tables;
    END IF;
END $$;
