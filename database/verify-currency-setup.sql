-- ============================================================================
-- VERIFY CURRENCY SETUP
-- ============================================================================
-- Check if currency columns and constraints already exist
-- ============================================================================

-- 1. Check transactions table columns
SELECT 
    'transactions' as table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('currency', 'amount', 'type', 'user_id', 'status', 'payment_method')
ORDER BY column_name;

-- 2. Check payment_transactions table columns
SELECT 
    'payment_transactions' as table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'payment_transactions' 
AND column_name IN ('currency', 'amount', 'status', 'paynow_reference')
ORDER BY column_name;

-- 3. Check currency constraint
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'transactions_currency_check';

-- 4. Check indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE indexname = 'idx_transactions_currency';

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' AND column_name = 'currency'
        ) THEN '✅ Currency column exists in transactions'
        ELSE '❌ Currency column missing in transactions'
    END as transactions_currency_status;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'transactions_currency_check'
        ) THEN '✅ Currency constraint exists (USD/ZWG validation)'
        ELSE '❌ Currency constraint missing'
    END as constraint_status;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = 'idx_transactions_currency'
        ) THEN '✅ Currency index exists'
        ELSE '❌ Currency index missing'
    END as index_status;

SELECT '✅ Currency setup verification complete!' as status;
