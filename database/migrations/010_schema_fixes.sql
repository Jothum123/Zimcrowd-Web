-- Schema Fixes Migration
-- Fixes column name mismatches between migrations and codebase

BEGIN;

-- Fix 1: Rename loans.user_id to borrower_id (code consistently uses borrower_id)
DO $$
BEGIN
    -- Check if column exists and is named user_id
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'loans' 
        AND column_name = 'user_id'
    ) THEN
        -- Rename user_id to borrower_id
        ALTER TABLE loans RENAME COLUMN user_id TO borrower_id;
        RAISE NOTICE 'Renamed loans.user_id to borrower_id';
    ELSIF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'loans' 
        AND column_name = 'borrower_id'
    ) THEN
        -- If neither exists, add borrower_id column
        ALTER TABLE loans ADD COLUMN borrower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added loans.borrower_id column';
    ELSE
        RAISE NOTICE 'loans.borrower_id already exists';
    END IF;
END $$;

-- Fix 2: Add missing user_id column to transactions table and backfill data
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'user_id'
    ) THEN
        -- Add nullable column first
        ALTER TABLE transactions ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added transactions.user_id column';
        
        -- Backfill existing transactions with user_id from loans table
        UPDATE transactions 
        SET user_id = l.borrower_id 
        FROM loans l 
        WHERE transactions.loan_id = l.id 
        AND transactions.user_id IS NULL;
        
        RAISE NOTICE 'Backfilled transactions.user_id from loans.borrower_id';
        
        -- Make column NOT NULL after backfill
        ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
        RAISE NOTICE 'Made transactions.user_id NOT NULL';
    ELSE
        RAISE NOTICE 'transactions.user_id already exists';
    END IF;
END $$;

-- Fix 3: Add missing currency column to transactions table
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
    ELSE
        RAISE NOTICE 'transactions.currency already exists';
    END IF;
END $$;

-- Fix 4: Fix user_documents table column name mismatch
DO $$
BEGIN
    -- Check if user_documents table exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'user_documents'
    ) THEN
        -- Check if upload_date exists and uploaded_at doesn't
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'user_documents' 
            AND column_name = 'upload_date'
        ) AND NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'user_documents' 
            AND column_name = 'uploaded_at'
        ) THEN
            -- Rename upload_date to uploaded_at
            ALTER TABLE user_documents RENAME COLUMN upload_date TO uploaded_at;
            RAISE NOTICE 'Renamed user_documents.upload_date to uploaded_at';
        ELSIF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'user_documents' 
            AND column_name = 'uploaded_at'
        ) THEN
            -- Add uploaded_at column if neither exists
            ALTER TABLE user_documents ADD COLUMN uploaded_at TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Added user_documents.uploaded_at column';
        ELSE
            RAISE NOTICE 'user_documents.uploaded_at already exists';
        END IF;
    ELSE
        RAISE NOTICE 'user_documents table does not exist';
    END IF;
END $$;

-- Update indexes to reflect the new column names
DROP INDEX IF EXISTS idx_loans_user_id;
CREATE INDEX IF NOT EXISTS idx_loans_borrower_id ON loans(borrower_id);

-- Add new indexes for the added columns
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_currency ON transactions(currency);

-- Update foreign key constraints if needed
DO $$
BEGIN
    -- Drop old foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'loans_user_id_fkey'
        AND table_name = 'loans'
    ) THEN
        ALTER TABLE loans DROP CONSTRAINT loans_user_id_fkey;
        RAISE NOTICE 'Dropped old loans_user_id_fkey constraint';
    END IF;
    
    -- Add new foreign key constraint for borrower_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'loans_borrower_id_fkey'
        AND table_name = 'loans'
    ) THEN
        ALTER TABLE loans ADD CONSTRAINT loans_borrower_id_fkey 
            FOREIGN KEY (borrower_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added loans_borrower_id_fkey constraint';
    END IF;
END $$;

-- Update any views that might reference the old column names
DROP VIEW IF EXISTS loan_summary;
CREATE OR REPLACE VIEW loan_summary AS
SELECT 
    l.id,
    l.borrower_id,
    u.first_name,
    u.last_name,
    u.email,
    l.amount,
    l.interest_rate,
    l.term,
    l.status,
    l.loan_type,
    l.purpose,
    l.description,
    l.currency,
    l.created_at,
    l.updated_at,
    COUNT(rs.id) as total_installments,
    COUNT(CASE WHEN rs.status = 'PAID' THEN 1 END) as paid_installments,
    SUM(CASE WHEN rs.status = 'PAID' THEN rs.paid_amount ELSE 0 END) as total_paid
FROM loans l
LEFT JOIN users u ON l.borrower_id = u.id
LEFT JOIN repayment_schedule rs ON l.id = rs.loan_id
GROUP BY l.id, u.first_name, u.last_name, u.email;

-- Update any RLS policies if they exist
DO $$
BEGIN
    -- Drop old policies if they exist
    DROP POLICY IF EXISTS "Users can view own loans" ON loans;
    DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
    
    -- Create new policies with correct column names
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'loans'
    ) THEN
        CREATE POLICY "Users can view own loans" ON loans
            FOR SELECT USING (auth.uid() = borrower_id);
        RAISE NOTICE 'Updated loans RLS policy for borrower_id';
    END IF;
    
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'transactions'
    ) THEN
        CREATE POLICY "Users can view own transactions" ON transactions
            FOR SELECT USING (auth.uid() = user_id);
        RAISE NOTICE 'Updated transactions RLS policy for user_id';
    END IF;
END $$;

COMMIT;

-- Add comments for documentation
COMMENT ON COLUMN loans.borrower_id IS 'Foreign key to users table - the borrower who requested the loan';
COMMENT ON COLUMN transactions.user_id IS 'Foreign key to users table - the user who initiated the transaction';
COMMENT ON COLUMN transactions.currency IS 'Currency code for the transaction amount (e.g., USD, ZWL)';
COMMENT ON COLUMN user_documents.uploaded_at IS 'Timestamp when the document was uploaded by the user';

-- Log the migration completion
DO $$
BEGIN
    RAISE NOTICE 'Schema fixes migration completed successfully';
    RAISE NOTICE 'Fixed: loans.user_id -> borrower_id';
    RAISE NOTICE 'Added: transactions.user_id, transactions.currency';
    RAISE NOTICE 'Fixed: user_documents.upload_date -> uploaded_at';
    RAISE NOTICE 'Updated: indexes, foreign keys, views, and RLS policies';
END $$;
