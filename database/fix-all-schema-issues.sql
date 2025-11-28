-- ============================================================================
-- FIX ALL SCHEMA ISSUES
-- ============================================================================
-- This script fixes all missing columns and schema mismatches found in logs
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. FIX PROFILES TABLE - Add missing bio column
-- ============================================================================

DO $$ 
BEGIN
    -- Add bio column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'bio'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN bio TEXT;
        RAISE NOTICE '✅ Added bio column to profiles table';
    ELSE
        RAISE NOTICE 'ℹ️ bio column already exists in profiles table';
    END IF;
END $$;

-- ============================================================================
-- 2. FIX TRANSACTIONS TABLE - Add currency column (USD and ZWG support)
-- ============================================================================

DO $$ 
BEGIN
    -- Add currency column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE transactions 
        ADD COLUMN currency VARCHAR(3) DEFAULT 'USD';
        RAISE NOTICE '✅ Added currency column to transactions table';
    ELSE
        RAISE NOTICE 'ℹ️ currency column already exists in transactions table';
    END IF;
    
    -- Add check constraint for USD and ZWG only
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'transactions_currency_check'
    ) THEN
        ALTER TABLE transactions 
        ADD CONSTRAINT transactions_currency_check 
        CHECK (currency IN ('USD', 'ZWG'));
        RAISE NOTICE '✅ Added currency constraint (USD, ZWG)';
    ELSE
        RAISE NOTICE 'ℹ️ Currency constraint already exists';
    END IF;
END $$;

-- Create index for currency-based queries
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);

-- ============================================================================
-- 3. FIX NOTIFICATION PREFERENCES - Make notification_type nullable
-- ============================================================================

DO $$ 
BEGIN
    -- Check if notification_type column exists and is NOT NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notification_preferences' 
        AND column_name = 'notification_type'
        AND is_nullable = 'NO'
    ) THEN
        -- Make notification_type nullable
        ALTER TABLE user_notification_preferences 
        ALTER COLUMN notification_type DROP NOT NULL;
        RAISE NOTICE '✅ Made notification_type nullable in user_notification_preferences';
    ELSE
        RAISE NOTICE 'ℹ️ notification_type is already nullable or does not exist';
    END IF;
END $$;

-- ============================================================================
-- 4. ADD MISSING NOTIFICATION PREFERENCE COLUMNS
-- ============================================================================

DO $$ 
BEGIN
    -- Add loan_updates if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notification_preferences' 
        AND column_name = 'loan_updates'
    ) THEN
        ALTER TABLE user_notification_preferences 
        ADD COLUMN loan_updates BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added loan_updates column';
    END IF;
    
    -- Add investment_updates if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notification_preferences' 
        AND column_name = 'investment_updates'
    ) THEN
        ALTER TABLE user_notification_preferences 
        ADD COLUMN investment_updates BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added investment_updates column';
    END IF;
    
    -- Add payment_reminders if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notification_preferences' 
        AND column_name = 'payment_reminders'
    ) THEN
        ALTER TABLE user_notification_preferences 
        ADD COLUMN payment_reminders BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added payment_reminders column';
    END IF;
    
    -- Add marketing_emails if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notification_preferences' 
        AND column_name = 'marketing_emails'
    ) THEN
        ALTER TABLE user_notification_preferences 
        ADD COLUMN marketing_emails BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added marketing_emails column';
    END IF;
    
    -- Add security_alerts if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notification_preferences' 
        AND column_name = 'security_alerts'
    ) THEN
        ALTER TABLE user_notification_preferences 
        ADD COLUMN security_alerts BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added security_alerts column';
    END IF;
    
    -- Add newsletter if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_notification_preferences' 
        AND column_name = 'newsletter'
    ) THEN
        ALTER TABLE user_notification_preferences 
        ADD COLUMN newsletter BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added newsletter column';
    END IF;
END $$;

-- ============================================================================
-- 5. VERIFY ALL FIXES
-- ============================================================================

-- Check profiles table
SELECT 
    'profiles' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('bio', 'first_name', 'last_name', 'city')
ORDER BY column_name;

-- Check transactions table
SELECT 
    'transactions' as table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('currency', 'amount', 'type', 'user_id')
ORDER BY column_name;

-- Check notification preferences table
SELECT 
    'user_notification_preferences' as table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_notification_preferences' 
AND column_name IN (
    'notification_type',
    'loan_updates',
    'investment_updates',
    'payment_reminders',
    'marketing_emails',
    'security_alerts',
    'newsletter'
)
ORDER BY column_name;

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT '✅ ALL SCHEMA FIXES APPLIED!' as status;
SELECT 'Run the verification queries above to confirm all columns exist' as next_step;
