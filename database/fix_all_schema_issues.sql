-- ==========================================
-- COMPREHENSIVE SCHEMA FIX SCRIPT
-- Fixes: user_sessions, loans, loan_installments
-- ==========================================

-- 1. FIX USER_SESSIONS TABLE
-- Add missing columns that the backend expects
DO $$
BEGIN
    -- Add started_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'started_at') THEN
        ALTER TABLE user_sessions ADD COLUMN started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        -- Backfill from created_at if possible
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'created_at') THEN
            UPDATE user_sessions SET started_at = created_at;
        END IF;
    END IF;

    -- Add logout_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'logout_at') THEN
        ALTER TABLE user_sessions ADD COLUMN logout_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add session_data
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'session_data') THEN
        ALTER TABLE user_sessions ADD COLUMN session_data JSONB;
    END IF;
END $$;

-- 2. FIX LOANS TABLE
-- Ensure user_id column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'user_id') THEN
        -- Check if borrower_id exists instead, and rename it or add user_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loans' AND column_name = 'borrower_id') THEN
            ALTER TABLE loans RENAME COLUMN borrower_id TO user_id;
        ELSE
            -- Add user_id column if neither exists (this implies a broken table, but we try to fix)
            ALTER TABLE loans ADD COLUMN user_id UUID REFERENCES auth.users(id);
        END IF;
    END IF;
END $$;

-- 3. FIX LOAN_INSTALLMENTS TABLE
-- Add foreign key relationship to loans table
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'loan_installments_loan_id_fkey'
        AND table_name = 'loan_installments'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE loan_installments 
        ADD CONSTRAINT loan_installments_loan_id_fkey 
        FOREIGN KEY (loan_id) 
        REFERENCES loans(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- 4. VERIFICATION OUTPUT
SELECT 'Schema fixes applied successfully' as result;
