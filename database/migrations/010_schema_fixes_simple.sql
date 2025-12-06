-- Simplified Schema Fixes Migration
-- Essential fixes for production database errors

BEGIN;

-- Fix 1: Rename loans.user_id to borrower_id if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'loans' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE loans RENAME COLUMN user_id TO borrower_id;
        RAISE NOTICE 'Renamed loans.user_id to borrower_id';
    END IF;
END $$;

-- Fix 2: Add missing user_id column to transactions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added transactions.user_id column';
    END IF;
END $$;

-- Fix 3: Add missing currency column to transactions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE transactions ADD COLUMN currency TEXT DEFAULT 'USD';
        RAISE NOTICE 'Added transactions.currency column';
    END IF;
END $$;

-- Fix 4: Fix user_documents column name
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_documents' 
        AND column_name = 'upload_date'
    ) THEN
        ALTER TABLE user_documents RENAME COLUMN upload_date TO uploaded_at;
        RAISE NOTICE 'Renamed user_documents.upload_date to uploaded_at';
    END IF;
END $$;

-- Update indexes
DROP INDEX IF EXISTS idx_loans_user_id;
CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON loans(borrower_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Schema fixes migration completed successfully';
END $$;
