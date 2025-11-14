-- Check if ZimCrowd Platform Tables Have Been Created
-- Run this query in Supabase SQL Editor to verify all tables exist

-- =============================================================================
-- TABLE EXISTENCE CHECK
-- =============================================================================

SELECT 
    'TABLE EXISTENCE CHECK' as check_type,
    COUNT(*) as total_tables_found,
    CASE 
        WHEN COUNT(*) >= 20 THEN '✅ All core tables created'
        WHEN COUNT(*) >= 15 THEN '⚠️ Most tables created, some missing'
        WHEN COUNT(*) >= 10 THEN '⚠️ Basic tables created, advanced features missing'
        ELSE '❌ Many tables missing'
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
-- DETAILED TABLE LIST WITH CREATION STATUS
-- =============================================================================

WITH expected_tables AS (
    SELECT unnest(ARRAY[
        'user_profiles',
        'loans', 
        'investments',
        'transactions',
        'wallets',
        'kairo_conversations',
        'financial_goals',
        'analytics_reports',
        'platform_metrics', 
        'financial_metrics',
        'ai_analytics',
        'notification_templates',
        'user_notifications',
        'notification_delivery_log',
        'admin_roles',
        'admin_users', 
        'system_configuration',
        'system_health_checks'
    ]) as table_name,
    unnest(ARRAY[
        'Core - User profiles and KYC data',
        'Core - Loan applications and management',
        'Core - Investment products and portfolio',
        'Core - Transaction history and payments',
        'Core - User wallet balances',
        'AI - Kairo AI conversation history',
        'AI - User financial goals and planning',
        'Analytics - Business intelligence reports',
        'Analytics - Real-time platform metrics',
        'Analytics - Daily financial performance',
        'Analytics - AI system performance tracking',
        'Notifications - Email/SMS templates',
        'Notifications - In-app user notifications',
        'Notifications - Delivery tracking and logs',
        'Admin - Admin roles and permissions',
        'Admin - Admin user management',
        'Admin - System configuration settings',
        'Admin - System health monitoring'
    ]) as description
),
existing_tables AS (
    SELECT 
        t.table_name,
        COALESCE(s.table_rows, 0) as table_rows,
        ROUND((pg_total_relation_size(quote_ident(t.table_name))::numeric / 1024 / 1024), 2) as size_mb
    FROM information_schema.tables t
    LEFT JOIN (
        SELECT 
            schemaname,
            tablename as table_name,
            n_tup_ins - n_tup_del as table_rows
        FROM pg_stat_user_tables
    ) s ON s.table_name = t.table_name
    WHERE t.table_schema = 'public'
)
SELECT 
    et.table_name,
    et.description,
    CASE 
        WHEN ext.table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status,
    COALESCE(ext.table_rows, 0) as row_count,
    COALESCE(ext.size_mb, 0) as size_mb
FROM expected_tables et
LEFT JOIN existing_tables ext ON et.table_name = ext.table_name
ORDER BY 
    CASE 
        WHEN et.table_name LIKE '%user%' OR et.table_name LIKE '%loan%' OR et.table_name LIKE '%investment%' THEN 1
        WHEN et.table_name LIKE '%kairo%' OR et.table_name LIKE '%financial_goal%' THEN 2
        WHEN et.table_name LIKE '%analytics%' OR et.table_name LIKE '%metric%' THEN 3
        WHEN et.table_name LIKE '%notification%' THEN 4
        WHEN et.table_name LIKE '%admin%' OR et.table_name LIKE '%system%' THEN 5
        ELSE 6
    END,
    et.table_name;

-- =============================================================================
-- INDEX VERIFICATION
-- =============================================================================

SELECT 
    'INDEX VERIFICATION' as check_type,
    COUNT(*) as total_indexes_found,
    CASE 
        WHEN COUNT(*) >= 15 THEN '✅ Good index coverage'
        WHEN COUNT(*) >= 10 THEN '⚠️ Basic indexes created'
        ELSE '❌ Missing important indexes'
    END as status
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- =============================================================================
-- FOREIGN KEY CONSTRAINTS CHECK
-- =============================================================================

SELECT 
    'FOREIGN KEY CONSTRAINTS' as check_type,
    COUNT(*) as total_foreign_keys,
    CASE 
        WHEN COUNT(*) >= 10 THEN '✅ Proper relationships established'
        WHEN COUNT(*) >= 5 THEN '⚠️ Some relationships missing'
        ELSE '❌ Missing critical relationships'
    END as status
FROM information_schema.table_constraints tc
WHERE tc.constraint_schema = 'public'
AND tc.constraint_type = 'FOREIGN KEY';

-- =============================================================================
-- DEFAULT DATA VERIFICATION
-- =============================================================================

-- Check if default admin roles exist
SELECT 
    'ADMIN ROLES' as check_type,
    COUNT(*) as roles_count,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ Default admin roles created'
        WHEN COUNT(*) >= 3 THEN '⚠️ Some admin roles created'
        ELSE '❌ Missing admin roles'
    END as status
FROM admin_roles
WHERE role_name IN ('super_admin', 'admin', 'manager', 'analyst', 'support');

-- Check if system configuration exists
SELECT 
    'SYSTEM CONFIG' as check_type,
    COUNT(*) as config_count,
    CASE 
        WHEN COUNT(*) >= 5 THEN '✅ System configuration initialized'
        WHEN COUNT(*) >= 3 THEN '⚠️ Basic configuration exists'
        ELSE '❌ Missing system configuration'
    END as status
FROM system_configuration
WHERE config_key IN ('platform.maintenance_mode', 'ai.primary_provider', 'platform.max_loan_amount');

-- Check if notification templates exist
SELECT 
    'NOTIFICATION TEMPLATES' as check_type,
    COUNT(*) as template_count,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ Notification templates created'
        WHEN COUNT(*) >= 1 THEN '⚠️ Some templates exist'
        ELSE '❌ Missing notification templates'
    END as status
FROM notification_templates
WHERE template_key IN ('welcome', 'loan_approved');

-- =============================================================================
-- EXTENSIONS CHECK
-- =============================================================================

SELECT 
    'POSTGRESQL EXTENSIONS' as check_type,
    string_agg(extname, ', ') as installed_extensions,
    CASE 
        WHEN COUNT(*) >= 2 THEN '✅ Required extensions installed'
        ELSE '❌ Missing required extensions'
    END as status
FROM pg_extension 
WHERE extname IN ('uuid-ossp', 'pgcrypto');

-- =============================================================================
-- SUMMARY REPORT
-- =============================================================================

WITH table_summary AS (
    SELECT COUNT(*) as existing_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'user_profiles', 'loans', 'investments', 'transactions', 'wallets',
        'kairo_conversations', 'financial_goals', 'analytics_reports', 
        'platform_metrics', 'financial_metrics', 'ai_analytics',
        'notification_templates', 'user_notifications', 'notification_delivery_log',
        'admin_roles', 'admin_users', 'system_configuration', 'system_health_checks'
    )
),
index_summary AS (
    SELECT COUNT(*) as index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
),
constraint_summary AS (
    SELECT COUNT(*) as fk_count
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY'
)
SELECT 
    '🎯 ZIMCROWD DATABASE STATUS REPORT' as report_title,
    ts.existing_count || '/18 core tables' as tables_status,
    iss.index_count || ' performance indexes' as indexes_status,
    cs.fk_count || ' foreign key relationships' as relationships_status,
    CASE 
        WHEN ts.existing_count >= 18 AND iss.index_count >= 15 AND cs.fk_count >= 10 THEN 
            '🎉 DATABASE FULLY READY FOR PRODUCTION!'
        WHEN ts.existing_count >= 15 THEN 
            '✅ Database mostly ready, minor setup needed'
        WHEN ts.existing_count >= 10 THEN 
            '⚠️ Core features ready, advanced features need setup'
        ELSE 
            '❌ Database setup incomplete, run schema files'
    END as overall_status,
    NOW() as checked_at
FROM table_summary ts, index_summary iss, constraint_summary cs;

-- =============================================================================
-- NEXT STEPS RECOMMENDATIONS
-- =============================================================================

SELECT 
    '📋 NEXT STEPS' as section,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') = 0 THEN
            '1. Run complete-platform-schema.sql in Supabase SQL Editor'
        WHEN (SELECT COUNT(*) FROM admin_roles WHERE role_name = 'super_admin') = 0 THEN
            '2. Insert default data (admin roles, system config)'
        WHEN (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%') < 10 THEN
            '3. Create performance indexes for better query speed'
        ELSE
            '✅ Database is ready! You can now:'
    END as recommendation,
    CASE 
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') > 0 THEN
            '• Test your backend APIs • Deploy your frontend • Start user registration • Begin loan/investment operations'
        ELSE
            '• Copy complete-platform-schema.sql content • Paste in Supabase SQL Editor • Click Run button'
    END as action_items;

-- Query completed - check results above for database status
