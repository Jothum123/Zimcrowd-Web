-- Ultra-Simple ZimCrowd Database Check
-- This will work on any PostgreSQL/Supabase setup

-- Check how many core tables exist
SELECT 
    'ZimCrowd Database Status' as check_name,
    COUNT(*) as tables_found,
    '18 tables expected' as target,
    CASE 
        WHEN COUNT(*) = 18 THEN '🎉 ALL TABLES READY - Database complete!'
        WHEN COUNT(*) >= 15 THEN '⚠️ Almost ready - Missing ' || (18 - COUNT(*)) || ' tables'
        WHEN COUNT(*) >= 10 THEN '⚠️ Basic setup - Missing ' || (18 - COUNT(*)) || ' advanced tables'
        WHEN COUNT(*) >= 5 THEN '❌ Partial setup - Missing ' || (18 - COUNT(*)) || ' tables'
        WHEN COUNT(*) >= 1 THEN '❌ Minimal setup - Missing ' || (18 - COUNT(*)) || ' tables'
        ELSE '❌ NO TABLES FOUND - Run complete-platform-schema.sql'
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

-- List existing tables
SELECT 
    'Existing Tables' as section,
    table_name,
    '✅ Found' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_profiles', 'loans', 'investments', 'transactions', 'wallets',
    'kairo_conversations', 'financial_goals', 'analytics_reports', 
    'platform_metrics', 'financial_metrics', 'ai_analytics',
    'notification_templates', 'user_notifications', 'notification_delivery_log',
    'admin_roles', 'admin_users', 'system_configuration', 'system_health_checks'
)
ORDER BY table_name;

-- Show what to do next
SELECT 
    'Next Steps' as section,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user_profiles', 'loans', 'investments')) = 3
        THEN 'Database has core tables! Check if you need analytics/admin tables.'
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') = 1
        THEN 'Some tables exist. Run remaining schema files.'
        ELSE 'No core tables found. Run complete-platform-schema.sql in Supabase SQL Editor.'
    END as recommendation,
    'Copy complete-platform-schema.sql → Paste in Supabase SQL Editor → Click Run' as instructions;
