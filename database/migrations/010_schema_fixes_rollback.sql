-- Rollback script for 010_schema_fixes.sql
-- Use this to revert changes if needed

BEGIN;

-- Rollback Fix 1: Rename borrower_id back to user_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'loans' 
        AND column_name = 'borrower_id'
    ) THEN
        ALTER TABLE loans RENAME COLUMN borrower_id TO user_id;
        RAISE NOTICE 'Rolled back: loans.borrower_id -> user_id';
    END IF;
END $$;

-- Rollback Fix 2: Remove user_id from transactions
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE transactions DROP COLUMN user_id;
        RAISE NOTICE 'Rolled back: Removed transactions.user_id';
    END IF;
END $$;

-- Rollback Fix 3: Remove currency from transactions
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE transactions DROP COLUMN currency;
        RAISE NOTICE 'Rolled back: Removed transactions.currency';
    END IF;
END $$;

-- Rollback Fix 4: Rename uploaded_at back to upload_date
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_documents' 
        AND column_name = 'uploaded_at'
    ) THEN
        ALTER TABLE user_documents RENAME COLUMN uploaded_at TO upload_date;
        RAISE NOTICE 'Rolled back: user_documents.uploaded_at -> upload_date';
    END IF;
END $$;

-- Update indexes back to original
DROP INDEX IF EXISTS idx_loans_borrower_id;
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);

DROP INDEX IF EXISTS idx_transactions_user_id;
DROP INDEX IF EXISTS idx_transactions_currency;

-- Update foreign key constraints back
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'loans_borrower_id_fkey'
        AND table_name = 'loans'
    ) THEN
        ALTER TABLE loans DROP CONSTRAINT loans_borrower_id_fkey;
        ALTER TABLE loans ADD CONSTRAINT loans_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Rolled back: loans foreign key constraint';
    END IF;
END $$;

-- Recreate original view
DROP VIEW IF EXISTS loan_summary;
CREATE OR REPLACE VIEW loan_summary AS
SELECT 
    l.id,
    l.user_id,
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
LEFT JOIN users u ON l.user_id = u.id
LEFT JOIN repayment_schedule rs ON l.id = rs.loan_id
GROUP BY l.id, u.first_name, u.last_name, u.email;

-- Update RLS policies back
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own loans" ON loans;
    DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
    
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'loans'
    ) THEN
        CREATE POLICY "Users can view own loans" ON loans
            FOR SELECT USING (auth.uid() = user_id);
        RAISE NOTICE 'Rolled back: loans RLS policy for user_id';
    END IF;
    
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'transactions'
    ) THEN
        -- Original transactions policy didn't have user_id, so we remove it
        RAISE NOTICE 'Rolled back: removed transactions RLS policy';
    END IF;
END $$;

COMMIT;

RAISE NOTICE 'Schema fixes rollback completed successfully';
