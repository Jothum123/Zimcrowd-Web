-- Simple ZimCrowd Database Table Check
-- Reliable version that works across all PostgreSQL/Supabase versions

-- =============================================================================
-- BASIC TABLE EXISTENCE CHECK
-- =============================================================================

SELECT 
    'ZimCrowd Database Status' as report_title,
    COUNT(*) as tables_found,
    CASE 
        WHEN COUNT(*) >= 18 THEN '🎉 All core tables created - Database ready!'
        WHEN COUNT(*) >= 15 THEN '⚠️ Most tables created, some missing'
        WHEN COUNT(*) >= 10 THEN '⚠️ Basic tables created, advanced features missing'
        WHEN COUNT(*) >= 5 THEN '❌ Only basic tables exist'
        ELSE '❌ Database setup incomplete - run schema files'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_profiles', 'loans', 'investments', 'transactions', 'wallets',
    'kairo_conversations', 'financial_goals', 'analytics_reports', 
    'platform_metrics', 'financial_metrics', 'ai_analytics',
    'notification_templates', 'user_notifications', 'notification_delivery_log',
    'admin_roles', 'admin_users', 'system_configuration', 'system_health_checks'
);

-- =============================================================================
-- DETAILED TABLE LIST
-- =============================================================================

SELECT 
    table_name,
    CASE 
        WHEN table_name LIKE '%user%' THEN 'Core - User Management'
        WHEN table_name IN ('loans', 'investments', 'transactions', 'wallets') THEN 'Core - Financial Services'
        WHEN table_name LIKE '%kairo%' OR table_name LIKE '%goal%' THEN 'AI - Kairo Assistant'
        WHEN table_name LIKE '%analytics%' OR table_name LIKE '%metric%' THEN 'Analytics - Business Intelligence'
        WHEN table_name LIKE '%notification%' THEN 'Notifications - Communication'
        WHEN table_name LIKE '%admin%' OR table_name LIKE '%system%' THEN 'Admin - Platform Management'
        ELSE 'Other'
    END as category,
    '✅ EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_profiles', 'loans', 'investments', 'transactions', 'wallets',
    'kairo_conversations', 'financial_goals', 'analytics_reports', 
    'platform_metrics', 'financial_metrics', 'ai_analytics',
    'notification_templates', 'user_notifications', 'notification_delivery_log',
    'admin_roles', 'admin_users', 'system_configuration', 'system_health_checks'
)
ORDER BY category, table_name;

-- =============================================================================
-- MISSING TABLES CHECK
-- =============================================================================

WITH expected_tables AS (
    SELECT unnest(ARRAY[
        'user_profiles', 'loans', 'investments', 'transactions', 'wallets',
        'kairo_conversations', 'financial_goals', 'analytics_reports', 
        'platform_metrics', 'financial_metrics', 'ai_analytics',
        'notification_templates', 'user_notifications', 'notification_delivery_log',
        'admin_roles', 'admin_users', 'system_configuration', 'system_health_checks'
    ]) as expected_table
)
SELECT 
    et.expected_table as missing_table,
    CASE 
        WHEN et.expected_table LIKE '%user%' THEN 'Core - User Management'
        WHEN et.expected_table IN ('loans', 'investments', 'transactions', 'wallets') THEN 'Core - Financial Services'
        WHEN et.expected_table LIKE '%kairo%' OR et.expected_table LIKE '%goal%' THEN 'AI - Kairo Assistant'
        WHEN et.expected_table LIKE '%analytics%' OR et.expected_table LIKE '%metric%' THEN 'Analytics - Business Intelligence'
        WHEN et.expected_table LIKE '%notification%' THEN 'Notifications - Communication'
        WHEN et.expected_table LIKE '%admin%' OR et.expected_table LIKE '%system%' THEN 'Admin - Platform Management'
        ELSE 'Other'
    END as category,
    '❌ MISSING' as status
FROM expected_tables et
WHERE et.expected_table NOT IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
)
ORDER BY category, missing_table;

-- =============================================================================
-- EXTENSIONS CHECK
-- =============================================================================

SELECT 
    'PostgreSQL Extensions' as check_type,
    extname as extension_name,
    '✅ INSTALLED' as status
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto')
UNION ALL
SELECT 
    'PostgreSQL Extensions' as check_type,
    missing_ext as extension_name,
    '❌ MISSING' as status
FROM (
    SELECT unnest(ARRAY['uuid-ossp', 'pgcrypto']) as missing_ext
) m
WHERE missing_ext NOT IN (
    SELECT extname FROM pg_extension
);

-- =============================================================================
-- QUICK ADMIN DATA CHECK (only if tables exist)
-- =============================================================================

-- Check if admin_roles table exists and has data
SELECT 
    'Admin Roles Table' as data_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_roles') 
        THEN '✅ Table exists'
        ELSE '❌ Table missing'
    END as table_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_roles') 
        THEN 'Run: SELECT COUNT(*) FROM admin_roles; to check data'
        ELSE 'Need to run complete-platform-schema.sql'
    END as next_action;

-- =============================================================================
-- FINAL SUMMARY
-- =============================================================================

WITH table_count AS (
    SELECT COUNT(*) as existing_tables
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'user_profiles', 'loans', 'investments', 'transactions', 'wallets',
        'kairo_conversations', 'financial_goals', 'analytics_reports', 
        'platform_metrics', 'financial_metrics', 'ai_analytics',
        'notification_templates', 'user_notifications', 'notification_delivery_log',
        'admin_roles', 'admin_users', 'system_configuration', 'system_health_checks'
    )
)
SELECT 
    '🎯 ZIMCROWD DATABASE SUMMARY' as title,
    tc.existing_tables || '/18 core tables created' as progress,
    CASE 
        WHEN tc.existing_tables >= 18 THEN 
            '🎉 DATABASE READY! You can now: • Test APIs • Deploy frontend • Start user registration'
        WHEN tc.existing_tables >= 15 THEN 
            '⚠️ Almost ready! Missing ' || (18 - tc.existing_tables) || ' tables. Check missing tables above.'
        WHEN tc.existing_tables >= 10 THEN 
            '⚠️ Core features ready. Missing ' || (18 - tc.existing_tables) || ' advanced tables.'
        WHEN tc.existing_tables >= 1 THEN 
            '❌ Partial setup. Run complete-platform-schema.sql in Supabase SQL Editor.'
        ELSE 
            '❌ No tables found. Run complete-platform-schema.sql in Supabase SQL Editor.'
    END as next_steps,
    NOW() as checked_at
FROM table_count tc;

-- End of check - Review results above
