-- DATABASE DIAGNOSTIC SCRIPT
-- Run this FIRST to see what tables and columns exist in your database

-- =====================================================
-- 1. LIST ALL TABLES
-- =====================================================

SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- =====================================================
-- 2. CHECK USERS TABLE
-- =====================================================

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- =====================================================
-- 3. CHECK TRANSACTIONS TABLE
-- =====================================================

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- =====================================================
-- 4. CHECK LOANS TABLE
-- =====================================================

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'loans'
ORDER BY ordinal_position;

-- =====================================================
-- 5. CHECK INVESTMENTS TABLE
-- =====================================================

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'investments'
ORDER BY ordinal_position;

-- =====================================================
-- 6. CHECK WALLETS TABLE
-- =====================================================

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'wallets'
ORDER BY ordinal_position;

-- =====================================================
-- 7. CHECK ALL INDEXES
-- =====================================================

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- =====================================================
-- 8. CHECK FOREIGN KEY CONSTRAINTS
-- =====================================================

SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- =====================================================
-- 9. SUMMARY: TABLE COUNT
-- =====================================================

SELECT 
    COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public';

-- =====================================================
-- 10. MISSING COLUMNS CHECK
-- =====================================================

-- Check if transactions has reference column
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'reference'
        ) THEN '✓ transactions.reference EXISTS'
        ELSE '✗ transactions.reference MISSING'
    END as status;

-- Check if investments has loan_id column
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'investments' AND column_name = 'loan_id'
        ) THEN '✓ investments.loan_id EXISTS'
        ELSE '✗ investments.loan_id MISSING'
    END as status;

-- Check if loans has user_id column
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'loans' AND column_name = 'user_id'
        ) THEN '✓ loans.user_id EXISTS'
        ELSE '✗ loans.user_id MISSING'
    END as status;

-- =====================================================
-- INSTRUCTIONS
-- =====================================================

-- Run each query section separately in Supabase SQL Editor
-- Copy the results and share them
-- This will help identify what's missing and what exists
