-- =====================================================
-- CHECK REFERRAL TABLES EXISTENCE
-- =====================================================
-- Run this FIRST to check if referral tables already exist
-- This will help you decide if you need to run the setup script
-- =====================================================

-- 1. Check if referral tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES 
        ('referrals'),
        ('referral_codes'),
        ('referral_earnings'),
        ('referral_payouts')
) AS t(table_name);

-- 2. If tables exist, check their structure
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'referrals') THEN
        RAISE NOTICE '📋 REFERRALS TABLE STRUCTURE:';
    END IF;
END $$;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'referrals'
ORDER BY ordinal_position;

-- 3. Check referral_codes table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'referral_codes'
ORDER BY ordinal_position;

-- 4. Check if you already have a referral code
SELECT 
    '🎯 YOUR REFERRAL CODE:' as info,
    rc.referral_code,
    rc.total_referrals,
    rc.total_earnings,
    rc.active_referrals,
    rc.created_at
FROM public.referral_codes rc
JOIN public.profiles p ON rc.user_id = p.id
WHERE p.email = 'jothumchitewe@gmail.com';

-- 5. Check existing referrals (if any)
SELECT 
    '👥 YOUR REFERRALS:' as info,
    COUNT(*) as total_referrals,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COALESCE(SUM(earnings), 0) as total_earnings
FROM public.referrals r
JOIN public.profiles p ON r.referrer_id = p.id
WHERE p.email = 'jothumchitewe@gmail.com';

-- 6. Check RLS policies on referral tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' 
    AND tablename IN ('referrals', 'referral_codes', 'referral_earnings', 'referral_payouts')
ORDER BY tablename, policyname;

-- 7. Check indexes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
    AND tablename IN ('referrals', 'referral_codes', 'referral_earnings', 'referral_payouts')
ORDER BY tablename, indexname;

-- 8. Check functions related to referrals
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
    AND routine_name LIKE '%referral%'
ORDER BY routine_name;

-- 9. Check triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public' 
    AND (event_object_table IN ('referrals', 'referral_codes', 'profiles'))
    AND trigger_name LIKE '%referral%'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- DECISION GUIDE
-- =====================================================
-- 
-- ✅ If all tables show "✅ EXISTS":
--    - You already have the referral system set up
--    - Check if you have a referral code
--    - You can skip running database-referrals-setup.sql
--
-- ❌ If tables show "❌ MISSING":
--    - You need to run database-referrals-setup.sql
--    - This will create all tables, policies, and generate your code
--
-- ⚠️ If some tables exist but not all:
--    - You may have a partial setup
--    - Consider dropping existing tables and running full setup
--    - OR manually create only the missing tables
--
-- =====================================================
